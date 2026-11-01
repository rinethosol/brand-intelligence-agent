/**
 * Request-size guards for the public server functions. Measurement is bounded:
 * it stops as soon as a limit is exceeded, so oversized payloads are rejected
 * before Zod walks them.
 */

/** Text-only requests (brand analysis, creative generation). */
export const TEXT_REQUEST_LIMIT_BYTES = 256 * 1024;
/**
 * Image-bearing requests (verification, correction). Allows a ~12 MiB PNG
 * after base64 expansion (4/3) plus profile/brief/analysis metadata.
 */
export const IMAGE_REQUEST_LIMIT_BYTES = 16 * 1024 * 1024 + TEXT_REQUEST_LIMIT_BYTES;
/** Whole HTTP body cap for server-function POSTs (image limit + serialization envelope). */
export const HTTP_BODY_LIMIT_BYTES = IMAGE_REQUEST_LIMIT_BYTES + 1024 * 1024;

const MAX_DEPTH = 32;
const MAX_NODES = 20_000;

export class RequestTooLargeError extends Error {
  readonly code = "request_too_large";
  constructor(readonly limitBytes: number) {
    super(`Request is too large (limit ${Math.round(limitBytes / 1024)} KiB). Nothing was processed.`);
    this.name = "RequestTooLargeError";
  }
}

/** Returns true when the value's approximate serialized size stays within limitBytes. */
export function withinSizeLimit(value: unknown, limitBytes: number): boolean {
  let total = 0;
  let nodes = 0;
  const stack: Array<[unknown, number]> = [[value, 0]];
  while (stack.length) {
    const [v, depth] = stack.pop()!;
    if (++nodes > MAX_NODES || depth > MAX_DEPTH) return false;
    if (typeof v === "string") total += v.length + 2;
    else if (v === null || typeof v !== "object") total += 8;
    else if (Array.isArray(v)) {
      total += 2;
      if (v.length > MAX_NODES) return false;
      for (const item of v) stack.push([item, depth + 1]);
    } else {
      total += 2;
      const keys = Object.keys(v);
      if (keys.length > MAX_NODES) return false;
      for (const k of keys) { total += k.length + 3; stack.push([(v as Record<string, unknown>)[k], depth + 1]); }
    }
    if (total > limitBytes) return false;
  }
  return true;
}

export function assertWithinSizeLimit(value: unknown, limitBytes: number): void {
  if (!withinSizeLimit(value, limitBytes)) throw new RequestTooLargeError(limitBytes);
}

/** Pre-deserialization check on the declared HTTP body length. */
export function oversizedContentLength(header: string | null, limitBytes = HTTP_BODY_LIMIT_BYTES): boolean {
  if (header == null) return false;
  const n = Number(header);
  return !Number.isFinite(n) || n < 0 || n > limitBytes;
}
