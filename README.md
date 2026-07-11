# Wedding Decor & Stationery Placement Planner

A private, password-protected web app for one couple to plan **where** their
physical decor and stationery items — vases, cups, candlesticks, day-of
stationery, and the like — go at their wedding. It is built around two object
types, **Locations** and **Items**, with a many-to-one relationship: a Location
has many Items, and an Item belongs to at most one Location (or is left
**Unassigned**). The whole app sits behind a single shared password so only the
couple can view or edit their plan.

## Features

- **Dashboard** — every item grouped by location (with an Unassigned bucket),
  a summary strip (total / ready / purchased / needed / unassigned / estimated
  cost), an overall readiness meter, name search, and status + category filters.
  Reassign, cycle status, edit, and delete inline on each card.
- **Floor plan** (`/plan`) — a visual placement board: drag item chips between
  location zones to assign them (with an accessible "Move to…" dropdown
  fallback), plus a **Map** view for arranging your venue's zones spatially.
- **Budget** (`/budget`) — estimated-vs-actual spend with a variance summary,
  an estimated-vs-actual bar chart by category, a category breakdown table, and
  per-location spend — all rendered without a charting library.
- **Setup sheets** (`/setup`) — a printable, per-location day-of checklist
  (with a "Print / Save as PDF" action) and a one-click **CSV export** of every
  item.
- **Items & locations** — items carry a name, description, quantity, category,
  priority, a three-stage status, estimated/actual cost, vendor, notes, and an
  optional photo. Locations carry a name, description, accent color, and a
  saved position on the floor-plan map.

## Tech stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript**
- **Tailwind CSS v4** for styling
- **Prisma 6** ORM with **PostgreSQL**
- **Vercel Blob** for photo storage in the cloud (local filesystem fallback in dev)
- Simple **shared-password auth** via a signed session cookie

## Getting started (local)

Local development needs a PostgreSQL database. Point `DATABASE_URL` at any
Postgres instance (a local one, or reuse your hosted one).

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# then edit .env and set DATABASE_URL, APP_PASSWORD, and SESSION_SECRET

# 3. Create the database schema
npm run db:push

# 4. Load sample locations and items
npm run db:seed

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the value
you set for `APP_PASSWORD`. With no `BLOB_READ_WRITE_TOKEN` set, uploaded photos
are written to `public/uploads` locally.

## Environment variables

Copy `.env.example` to `.env` and fill in the following:

| Variable                | Description                                                                       |
| ----------------------- | --------------------------------------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string. On Vercel, set automatically by the Postgres integration. |
| `APP_PASSWORD`          | The shared password the couple uses to log in.                                    |
| `SESSION_SECRET`        | Secret used to sign the session cookie. Use a long random string.                 |
| `BLOB_READ_WRITE_TOKEN` | (Cloud only) Set automatically by Vercel when Blob storage is added. Photos go to Vercel Blob when present; otherwise to `public/uploads`. |

## Data model

Two models defined in `prisma/schema.prisma`:

- **Location** — `id`, `name`, optional `description`, an optional accent
  `color`, an optional saved map position (`planX`/`planY`), a `sortOrder`,
  timestamps, and a list of its `items`.
- **Item** — `id`, `name`, optional `description`, a `status`
  (`NEEDED` → `PURCHASED` → `READY`), a `quantity`, an optional `category` and
  `priority`, optional `estimatedCost`/`actualCost`, optional `vendorName`/
  `vendorUrl`, optional `notes`, an optional `photoUrl`, timestamps, and an
  optional `locationId`.

Enumerated values (statuses, categories, priorities) live in
`src/lib/constants.ts`; they are stored as plain strings in Postgres.

The relationship is many-to-one: a Location has many Items, and an Item belongs
to at most one Location. Deleting a Location does **not** delete its items —
their `locationId` is set back to null (Unassigned), so nothing is lost.

## Project structure

- `prisma/schema.prisma` — the Location and Item models
- `prisma/seed.ts` — sample data loader (`npm run db:seed`)
- `src/lib/` — database client, auth/session helpers, API client, constants, and shared types
- `src/proxy.ts` — auth guard that protects routes (Next 16's renamed middleware)
- `src/app/api/` — REST endpoints for locations, items, photo upload, CSV export, and login/logout
- `src/app/login` — the login screen
- `src/app/(app)/` — authenticated pages: dashboard, floor plan, budget, setup sheets, locations, and items
- `src/components/` — shared UI components, plus `budget/`, `plan/`, and `setup/` feature components
- `src/app/globals.css` — the design system (palette, typography, and shared component classes)

## Deploying to Vercel

The app is ready to deploy to Vercel. The build command
(`prisma generate && prisma db push && next build`) creates the database schema
automatically on each deploy, and the photo upload route uses Vercel Blob when
`BLOB_READ_WRITE_TOKEN` is present.

1. Push this repository to GitHub and import it into **Vercel**
   ([vercel.com/new](https://vercel.com/new)).
2. In the project's **Storage** tab, add a **Postgres** database and a **Blob**
   store. Vercel injects `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` for you.
3. In **Settings → Environment Variables**, add `APP_PASSWORD` (your login
   password) and `SESSION_SECRET` (a long random string).
4. Deploy. Once live, open the URL and log in with `APP_PASSWORD`.
5. (Optional) Load sample data by running `npm run db:seed` locally against the
   production `DATABASE_URL`.
