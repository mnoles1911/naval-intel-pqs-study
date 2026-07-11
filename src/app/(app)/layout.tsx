import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import NavLink from "@/components/NavLink";
import ThemeToggle from "@/components/ThemeToggle";
import {
  DashboardIcon,
  ItemsIcon,
  FloorPlanIcon,
  SeatingIcon,
  SetupIcon,
} from "@/components/icons";

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
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4">
            <NavLink href="/" icon={<DashboardIcon size={16} />}>
              Dashboard
            </NavLink>
            <NavLink href="/items" icon={<ItemsIcon size={16} />}>
              Items
            </NavLink>
            <NavLink href="/locations" icon={<FloorPlanIcon size={16} />}>
              Venue
            </NavLink>
            <NavLink href="/seating" icon={<SeatingIcon size={16} />}>
              Seating
            </NavLink>
            <NavLink href="/setup" icon={<SetupIcon size={16} />}>
              Setup sheets
            </NavLink>
            <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
            <ThemeToggle />
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
