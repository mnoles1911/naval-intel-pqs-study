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
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Edit item</h1>
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : notFound || !item ? (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
          <p className="text-muted">This item could not be found.</p>
          <Link
            href="/"
            className="text-sm text-muted hover:text-foreground"
          >
            Back to items
          </Link>
        </div>
      ) : (
        <ItemForm mode="edit" itemId={id} initial={item} />
      )}
    </div>
  );
}
