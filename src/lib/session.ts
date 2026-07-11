// Edge-safe session helpers.
//
// This module must run in both the Node.js runtime (route handlers, server
// components) and the Edge runtime (proxy.ts), so it uses only the Web Crypto
// API (globalThis.crypto.subtle) and no Node-only imports.

export const SESSION_COOKIE = "wp_session";

// Constant message signed with the server secret to produce the session token.
const SESSION_MESSAGE = "wedding-planner-session-v1";

// The two accounts that share the app. The password is the same for both;
// the username only decides whose name is attributed to each change.
export const ACTORS = ["matt", "emma"] as const;
export type Actor = (typeof ACTORS)[number];

export function isActor(value: string | null | undefined): value is Actor {
  return value === "matt" || value === "emma";
}

// Display label for an actor ("matt" -> "Matt").
export function actorLabel(actor: string): string {
  return actor.charAt(0).toUpperCase() + actor.slice(1);
}

function getSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.APP_PASSWORD ||
    "insecure-default-secret"
  );
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// HMAC signature over a message with the server secret.
async function sign(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toHex(sig);
}

// Session token: "<actor>.<signature>" where the signature covers the actor,
// so the cookie both authenticates the request AND names who is acting —
// still stateless (no server-side session store), still Edge-safe.
export async function computeSessionToken(actor: string): Promise<string> {
  const sig = await sign(`${SESSION_MESSAGE}:${actor}`);
  return `${actor}.${sig}`;
}

// Returns the actor a token vouches for, or null if the token is missing,
// malformed, tampered with, or names an unknown account.
export async function sessionActor(
  token: string | undefined | null,
): Promise<Actor | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const actor = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!isActor(actor)) return null;
  const expected = await sign(`${SESSION_MESSAGE}:${actor}`);
  return safeEqual(sig, expected) ? actor : null;
}

// Constant-time-ish comparison to avoid leaking the token via timing.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function isValidSessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  return (await sessionActor(token)) !== null;
}
