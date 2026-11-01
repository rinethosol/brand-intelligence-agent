import { describe, expect, it } from "vitest";
import { assertWithinSizeLimit, IMAGE_REQUEST_LIMIT_BYTES, oversizedContentLength, RequestTooLargeError, TEXT_REQUEST_LIMIT_BYTES, withinSizeLimit, HTTP_BODY_LIMIT_BYTES } from "@/lib/agent/request-limits";

const png = (bytes: number) => "data:image/png;base64," + "A".repeat(Math.ceil(bytes / 3) * 4);

describe("request size limits", () => {
  it("accepts a normal text request", () => {
    expect(withinSizeLimit({ profile: { name: "Halden", guidelines: Array(50).fill("x".repeat(2000)) } }, TEXT_REQUEST_LIMIT_BYTES)).toBe(true);
  });
  it("rejects a text request over 256 KiB", () => {
    expect(() => assertWithinSizeLimit({ description: "x".repeat(300 * 1024) }, TEXT_REQUEST_LIMIT_BYTES)).toThrow(RequestTooLargeError);
  });
  it("accepts an image request with a 10 MiB PNG", () => {
    expect(withinSizeLimit({ original: { imageUrl: png(10 * 1024 * 1024) } }, IMAGE_REQUEST_LIMIT_BYTES)).toBe(true);
  });
  it("rejects an image request with a 14 MiB PNG", () => {
    expect(withinSizeLimit({ original: { imageUrl: png(14 * 1024 * 1024) } }, IMAGE_REQUEST_LIMIT_BYTES)).toBe(false);
  });
  it("rejects huge arrays without walking them", () => {
    expect(withinSizeLimit({ colors: new Array(5_000_000).fill(0) }, IMAGE_REQUEST_LIMIT_BYTES)).toBe(false);
  });
  it("rejects excessive nesting", () => {
    let v: unknown = "x"; for (let i = 0; i < 100; i++) v = [v];
    expect(withinSizeLimit(v, TEXT_REQUEST_LIMIT_BYTES)).toBe(false);
  });
  it("checks declared HTTP body length", () => {
    expect(oversizedContentLength("1000")).toBe(false);
    expect(oversizedContentLength(String(HTTP_BODY_LIMIT_BYTES + 1))).toBe(true);
    expect(oversizedContentLength("abc")).toBe(true);
    expect(oversizedContentLength(null)).toBe(false);
  });
});
