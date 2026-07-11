"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ItemDTO } from "@/lib/types";
import { fetchItem } from "@/lib/client";
import ItemForm from "@/components/ItemForm";

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();

  const [item, setItem] = useState<ItemDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    fetchItem(id)
      .then((data) => {
        if (active) setItem(data);
      })
      .catch(() => {
        if (active) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6 space-y-1">
        <p className="eyebrow">Edit</p>
        <h1 className="font-display text-3xl sm:text-4xl">Edit item</h1>
      </header>
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : notFound || !item ? (
        <div className="card space-y-3 p-5">
          <p className="text-muted">This item could not be found.</p>
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            Back to items
          </Link>
        </div>
      ) : (
        <ItemForm mode="edit" itemId={id} initial={item} />
      )}
    </div>
  );
}
