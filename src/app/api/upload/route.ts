import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { requireApiAuth } from "@/lib/auth";

// Node runtime required for filesystem access in the local-dev fallback.
export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Locate a Vercel Blob read-write token. The default connection names it
// BLOB_READ_WRITE_TOKEN, but a store with a custom prefix (e.g. a store named
// "photo_storage") is exposed as <PREFIX>_READ_WRITE_TOKEN. Accept either so
// uploads work regardless of how the store was named/connected.
function blobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith("_READ_WRITE_TOKEN") && value) return value;
  }
  return undefined;
}

// POST /api/upload — multipart form with a single "file" field.
// Returns { url }.
//
// In the cloud (Vercel), photos are stored in Vercel Blob when
// BLOB_READ_WRITE_TOKEN is present. For local development (no token) the file
// is written to public/uploads instead.
export async function POST(request: Request) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported image type" },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image is too large (max 8 MB)" },
        { status: 400 },
      );
    }

    const filename = `${randomUUID()}.${EXT[file.type]}`;

    // Cloud path: store in Vercel Blob. Pass the token explicitly so a custom
    // store prefix still works.
    const token = blobToken();
    if (token) {
      const blob = await put(`items/${filename}`, file, {
        access: "public",
        contentType: file.type,
        token,
      });
      return NextResponse.json({ url: blob.url });
    }

    // On Vercel the filesystem is read-only, so the public/uploads fallback
    // can never work there — fail loudly with actionable guidance instead of
    // attempting a doomed write.
    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            "Image uploads require a Vercel Blob store. In the Vercel dashboard go to Storage → Create Database → Blob to create one (this adds the BLOB_READ_WRITE_TOKEN env var), then redeploy.",
        },
        { status: 503 },
      );
    }

    // Local-dev fallback: write to public/uploads.
    const bytes = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), bytes);
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error("Upload failed:", err);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
