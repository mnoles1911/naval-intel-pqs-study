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
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-6">
          <Link href="/" className="font-semibold tracking-tight">
            Placement Planner
          </Link>
          <nav className="flex items-center gap-5">
            <NavLink href="/">Dashboard</NavLink>
            <NavLink href="/locations">Locations</NavLink>
            <NavLink href="/items/new">Add item</NavLink>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {children}
      </main>
    </>
  );
}
