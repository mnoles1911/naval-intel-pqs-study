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
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="eyebrow">Just the two of us</p>
          <h1 className="font-display mt-1 text-3xl">
            Wedding Placement Planner
          </h1>
          <p className="mt-2 text-sm text-muted">
            Enter the password to continue.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="card p-6">
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="input"
            placeholder="••••••••"
          />
          {error && (
            <p className="mt-3 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || password.length === 0}
            className="btn btn-primary mt-5 w-full"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
