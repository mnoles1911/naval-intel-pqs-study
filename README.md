# Wedding Decor & Stationery Placement Planner

A private, password-protected web app for one couple to plan **where** their
physical decor and stationery items — vases, cups, candlesticks, day-of
stationery, and the like — go at their wedding. It is built around two object
types, **Locations** and **Items**, with a many-to-one relationship: a Location
has many Items, and an Item belongs to at most one Location (or is left
**Unassigned**). The whole app sits behind a single shared password so only the
couple can view or edit their plan.

## Tech stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript**
- **Tailwind CSS v4** for styling
- **Prisma 6** ORM with **SQLite** locally and **Postgres** in production
- Simple **shared-password auth** via a signed session cookie

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# then edit .env and set APP_PASSWORD and SESSION_SECRET

# 3. Create the local database
npx prisma migrate dev

# 4. Load sample locations and items
npm run db:seed

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the value
you set for `APP_PASSWORD`.

## Environment variables

Copy `.env.example` to `.env` and fill in the following:

| Variable         | Description                                                         |
| ---------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`   | Prisma datasource connection string (SQLite file locally, Postgres in production). |
| `APP_PASSWORD`   | The shared password the couple uses to log in.                      |
| `SESSION_SECRET` | Secret used to sign the session cookie. Use a long random string.   |

## Data model

Two models defined in `prisma/schema.prisma`:

- **Location** — `id`, `name`, optional `description`, timestamps, and a list of
  its `items`.
- **Item** — `id`, `name`, optional `description`, a `status` of either
  `NEEDED` or `PURCHASED`, an optional `photoUrl`, timestamps, and an optional
  `locationId`.

The relationship is many-to-one: a Location has many Items, and an Item belongs
to at most one Location. Deleting a Location does **not** delete its items —
their `locationId` is set back to null (Unassigned), so nothing is lost.

## Project structure

- `prisma/schema.prisma` — the Location and Item models
- `prisma/seed.ts` — sample data loader (`npm run db:seed`)
- `src/lib/` — database client, auth/session helpers, API client, constants, and shared types
- `src/proxy.ts` — auth guard that protects routes (Next 16's renamed middleware)
- `src/app/api/` — REST endpoints for locations, items, photo upload, and login/logout
- `src/app/login` — the login screen
- `src/app/(app)/` — authenticated pages: dashboard, locations, and items
- `src/components/` — shared UI components

## Deployment notes

To take the planner online:

1. Switch the Prisma datasource `provider` to `postgresql` and point
   `DATABASE_URL` at a hosted Postgres database (e.g. Neon or Supabase).
2. Replace the local filesystem photo upload in
   `src/app/api/upload/route.ts` with a blob store (e.g. Vercel Blob) —
   serverless filesystems are read-only, so writing uploaded photos to disk
   will not work.
3. Set `APP_PASSWORD` and `SESSION_SECRET` as environment variables in your
   hosting provider.
4. Deploy to **Vercel**.
