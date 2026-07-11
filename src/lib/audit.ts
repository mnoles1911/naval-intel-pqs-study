// Audit-trail helper. Import from Node-runtime route handlers only (it reaches
// the session cookie via getActor). Every mutating endpoint records one entry
// so the History tab can show who changed what over time.

import { prisma } from "./db";
import { getActor } from "./auth";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "import"
  | "assign"
  | "unassign"
  | "login";

export interface AuditEntry {
  action: AuditAction;
  // The kind of record: "item" | "location" | "person" | "party" | "plan" |
  // "seat" | "session".
  entity: string;
  // The affected record id, when there is a single one.
  entityId?: string | null;
  // Human-readable one-liner, e.g. 'Added item "Welcome sign"'.
  summary: string;
  // Usually resolved from the session; pass explicitly only when the cookie
  // isn't set yet on the response (e.g. the login route).
  actor?: string | null;
}

// Best-effort: an audit failure must never break the underlying action, so any
// error is logged and swallowed rather than thrown into the request path.
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const actor = entry.actor ?? (await getActor()) ?? "unknown";
    await prisma.auditLog.create({
      data: {
        actor,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        summary: entry.summary,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log entry", err);
  }
}
