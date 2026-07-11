"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { uploadPhoto } from "@/lib/client";

// Controlled photo gallery. `value` is the ordered list of photo URLs (the
// first is the cover); calls `onChange` with the next list on any add, remove,
// or reorder. Uploads happen one file at a time and append to the list.
export default function PhotoUpload({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    setUploading(true);
    setError(null);
    // Accumulate locally so we don't clobber state across sequential awaits.
    let next = [...value];
    try {
      for (const file of Array.from(files)) {
        const url = await uploadPhoto(file);
        next = [...next, url];
        onChange(next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start gap-3">
        {value.map((url, index) => (
          <div key={`${url}-${index}`} className="flex flex-col items-center gap-1">
            <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-surface-2">
              <Image
                src={url}
                alt={index === 0 ? "Cover photo" : `Photo ${index + 1}`}
                width={80}
                height={80}
                className="h-full w-full object-cover"
                unoptimized
              />
              {index === 0 && (
                <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-center text-[10px] font-medium uppercase tracking-wide text-white">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-sm leading-none text-white transition-colors hover:bg-danger cursor-pointer"
              >
                ×
              </button>
            </div>
            {value.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move photo ${index + 1} left`}
                  className="btn btn-ghost btn-sm px-1.5 py-0.5 disabled:opacity-40"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === value.length - 1}
                  aria-label={`Move photo ${index + 1} right`}
                  className="btn btn-ghost btn-sm px-1.5 py-0.5 disabled:opacity-40"
                >
                  →
                </button>
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-strong bg-surface-2 text-xs text-muted transition-colors hover:text-foreground disabled:opacity-60 cursor-pointer"
        >
          {uploading ? (
            "Uploading…"
          ) : (
            <>
              <span aria-hidden className="text-lg leading-none">
                +
              </span>
              Add photo
            </>
          )}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length) handleFiles(files);
          e.target.value = "";
        }}
      />

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
