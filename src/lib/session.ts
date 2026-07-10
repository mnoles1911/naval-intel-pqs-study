// Edge-safe session helpers.
//
// This module must run in both the Node.js runtime (route handlers, server
// components) and the Edge runtime (proxy.ts), so it uses only the Web Crypto
// API (globalThis.crypto.subtle) and no Node-only imports.

export const SESSION_COOKIE = "wp_session";

// Constant message signed with the server secret to produce the session token.
const SESSION_MESSAGE = "wedding-planner-session-v1";

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

// Deterministic token derived from the server secret. The same secret always
// produces the same token, so a valid cookie can be verified without any
// server-side session store.
export async function computeSessionToken(): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(SESSION_MESSAGE));
  return toHex(sig);
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
  if (!token) return false;
  const expected = await computeSessionToken();
  return safeEqual(token, expected);
}
