import { describe, it, expect } from "vitest";
import app from "../api/index";

describe("POST /import", () => {
  it("should reject invalid payload", async () => {
    const req = new Request("http://localhost/import", {
      method: "POST",
      body: JSON.stringify({ foo: "bar" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await app.request(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid payload");
  });

  it("should reject invalid contacts", async () => {
    const req = new Request("http://localhost/import", {
      method: "POST",
      body: JSON.stringify({
        source: "test",
        data: [{ name: "", email: "not-an-email" }],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await app.request(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid contacts data");
    expect(body.details.length).toBeGreaterThan(0);
  });

  it("should accept valid contacts", async () => {
    const req = new Request("http://localhost/import", {
      method: "POST",
      body: JSON.stringify({
        source: "test",
        data: [{ name: "Alice", email: "alice@example.com" }],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await app.request(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.jobId).toBeDefined();
  });
});