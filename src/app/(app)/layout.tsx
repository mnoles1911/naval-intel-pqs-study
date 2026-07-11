import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import NavLink from "@/components/NavLink";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // proxy.ts already guards these routes; this is defense in depth.
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-accent font-display text-lg leading-none"
            >
              &amp;
            </span>
            <span className="font-display text-lg leading-none">
              Placement Planner
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <NavLink href="/">Dashboard</NavLink>
            <NavLink href="/plan">Floor plan</NavLink>
            <NavLink href="/budget">Budget</NavLink>
            <NavLink href="/setup">Setup sheets</NavLink>
            <NavLink href="/locations">Locations</NavLink>
            <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
            <Link href="/items/new" className="btn btn-primary btn-sm">
              Add item
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-10">
        {children}
      </main>
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-muted">
          Made with care for the big day.
        </div>
      </footer>
    </>
  );
}
