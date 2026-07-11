import { NextResponse } from "next/server";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { isActor } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  let username = "";
  let password = "";
  try {
    const body = await request.json();
    username = typeof body?.username === "string" ? body.username : "";
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const actor = username.trim().toLowerCase();
  if (!isActor(actor)) {
    return NextResponse.json(
      { error: "Choose a username: matt or emma" },
      { status: 401 },
    );
  }
  if (!verifyPassword(password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, actor });
  await setSessionCookie(res, actor);
  await logAudit({
    actor,
    action: "login",
    entity: "session",
    summary: "Signed in",
  });
  return res;
}
