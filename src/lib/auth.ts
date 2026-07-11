// Server-side (Node runtime) auth helpers. Imports next/headers, so this must
// not be imported from proxy.ts (use src/lib/session.ts there instead).

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  computeSessionToken,
  isValidSessionToken,
  safeEqual,
  sessionActor,
  type Actor,
} from "./session";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function verifyPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD ?? "";
  if (!expected) return false;
  return safeEqual(input, expected);
}

// Reads the session cookie and returns whether the request is authenticated.
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return isValidSessionToken(token);
}

// Reads the session cookie and returns which account is acting (or null when
// unauthenticated). Every mutating route uses this to attribute audit entries.
export async function getActor(): Promise<Actor | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return sessionActor(token);
}

// Sets the session cookie on the given response after a successful login,
// binding it to the account that logged in.
export async function setSessionCookie(
  res: NextResponse,
  actor: Actor,
): Promise<void> {
  const token = await computeSessionToken(actor);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

// Guard for API route handlers. Returns a 401 response if unauthenticated,
// otherwise null.
export async function requireApiAuth(): Promise<NextResponse | null> {
  if (await isAuthenticated()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
