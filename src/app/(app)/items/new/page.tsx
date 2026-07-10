"use client";

import ItemForm from "@/components/ItemForm";

export default function NewItemPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Add item</h1>
      <ItemForm mode="create" />
    </div>
  );
}
