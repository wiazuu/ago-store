import "@tanstack/react-start/server-only";
import { clientIp, privacyHash } from "@/lib/security.server";

type Bucket = { count: number; resetsAt: number };
declare global { var __agoRateLimits: Map<string, Bucket> | undefined; }
const buckets = (globalThis.__agoRateLimits ||= new Map());

export function allowRequest(request: Request, scope: string, limit: number, windowMs: number) {
  const now = Date.now(); const key = privacyHash(`${scope}:${clientIp(request)}`); const bucket = buckets.get(key);
  if (!bucket || bucket.resetsAt <= now) { buckets.set(key, { count: 1, resetsAt: now + windowMs }); return true; }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  if (buckets.size > 10_000) for (const [entry, value] of buckets) if (value.resetsAt <= now) buckets.delete(entry);
  return true;
}
