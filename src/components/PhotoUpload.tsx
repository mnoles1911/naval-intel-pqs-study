"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { uploadPhoto } from "@/lib/client";

// Controlled photo picker. `value` is the current photo URL (or null); calls
// `onChange` with the new URL after a successful upload, or null when removed.
export default function PhotoUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadPhoto(file);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-start gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-2">
          {value ? (
            <Image
              src={value}
              alt="Item photo"
              width={96}
              height={96}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <span className="text-xs text-muted">No photo</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn btn-ghost btn-sm"
          >
            {uploading ? "Uploading…" : value ? "Replace photo" : "Upload photo"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-left text-sm text-muted transition-colors hover:text-danger cursor-pointer"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
