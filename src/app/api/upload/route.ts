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

// POST /api/upload — multipart form with a single "file" field.
// Returns { url }.
//
// In the cloud (Vercel), photos are stored in Vercel Blob when
// BLOB_READ_WRITE_TOKEN is present. For local development (no token) the file
// is written to public/uploads instead.
export async function POST(request: Request) {
  const unauth = await requireApiAuth();
  if (unauth) return unauth;

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

  // Cloud path: store in Vercel Blob.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`items/${filename}`, file, {
      access: "public",
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url });
  }

  // Local-dev fallback: write to public/uploads.
  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), bytes);
  return NextResponse.json({ url: `/uploads/${filename}` });
}
