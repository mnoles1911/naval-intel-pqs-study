"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

// A sun/moon control that flips the explicit theme (data-theme on <html>) and
// remembers the choice. The design system's dark tokens — and the inverse
// toile — follow automatically. A boot script in the root layout sets the
// initial theme before paint, so this only has to read and toggle it.
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    const initial: Theme =
      attr === "light" || attr === "dark"
        ? attr
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    // Reading the boot-script's theme after mount is intentional: it keeps the
    // first client render matching the server (no icon) to avoid a hydration
    // mismatch, then reveals the correct icon.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode / storage disabled — the in-memory toggle still works */
    }
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`inline-grid h-8 w-8 place-items-center rounded-full border border-border-strong text-foreground transition-colors hover:bg-surface-2 ${className}`}
    >
      {/* Render nothing until the theme is known to avoid a hydration mismatch;
          the button keeps its size so layout doesn't shift. */}
      {theme === null ? null : isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
