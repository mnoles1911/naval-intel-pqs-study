"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace("/");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Login failed");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Wedding Placement Planner
          </h1>
          <p className="text-muted text-sm mt-2">
            Enter the password to continue.
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-xl p-6 shadow-sm"
        >
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
            placeholder="••••••••"
          />
          {error && (
            <p className="text-sm text-red-500 mt-3" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || password.length === 0}
            className="mt-5 w-full rounded-lg bg-accent text-white font-medium py-2 disabled:opacity-50 transition"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
