"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoutIcon } from "@/components/icons";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
    >
      <LogoutIcon size={16} aria-hidden />
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
