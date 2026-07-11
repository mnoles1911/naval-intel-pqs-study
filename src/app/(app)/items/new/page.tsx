"use client";

import ItemForm from "@/components/ItemForm";

export default function NewItemPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6 space-y-1">
        <p className="eyebrow">New</p>
        <h1 className="font-display text-3xl sm:text-4xl">Add item</h1>
      </header>
      <ItemForm mode="create" />
    </div>
  );
}
