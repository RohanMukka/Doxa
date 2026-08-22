import { describe, expect, it } from "vitest";
import { check } from "./check";
import {
  ResolverSpecSchema,
  describeResolver,
  isSafeUrl,
  pluck,
  type Fetcher,
} from "./spec";

const respond = (body: unknown, status = 200): Fetcher =>
  async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

const fails = (message: string): Fetcher => async () => {
  throw new Error(message);
};

const notJson: Fetcher = async () => new Response("<html>nope</html>", { status: 200 });

describe("isSafeUrl", () => {
  it("allows an ordinary public URL", () => {
    expect(isSafeUrl("https://api.coinbase.com/v2/prices/BTC-USD/spot")).toBe(true);
  });

  it("refuses anything pointing back at this machine or its network", () => {
    for (const url of [
      "http://localhost:3000/admin",
      "http://127.0.0.1/",
      "http://10.0.0.5/",
      "http://192.168.1.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://172.16.0.1/",
    ]) {
      expect(isSafeUrl(url), url).toBe(false);
    }
  });

  it("allows a public address that merely looks private", () => {
    expect(isSafeUrl("http://172.32.0.1/")).toBe(true);
  });

  it("refuses non-http schemes and nonsense", () => {
    expect(isSafeUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeUrl("ftp://example.com/x")).toBe(false);
    expect(isSafeUrl("not a url")).toBe(false);
  });
});

describe("pluck", () => {
  it("walks a dotted path", () => {
    expect(pluck({ data: { amount: "42.5" } }, "data.amount")).toBe("42.5");
  });

  it("indexes into arrays", () => {
    expect(pluck({ rows: [{ v: 1 }, { v: 2 }] }, "rows.1.v")).toBe(2);
  });

  it("returns undefined rather than throwing on a missing path", () => {
    expect(pluck({ a: 1 }, "a.b.c")).toBeUndefined();
    expect(pluck(null, "a")).toBeUndefined();
  });
});

describe("github-pr-merged", () => {
  const spec = { kind: "github-pr-merged", owner: "acme", repo: "widget", number: 7 } as const;

  it("grades a merged pull request correct", async () => {
    const o = await check(spec, respond({ merged_at: "2026-03-01T10:00:00Z", state: "closed" }));
    expect(o.status).toBe("correct");
    if (o.status !== "pending") expect(o.evidence).toContain("2026-03-01");
  });

  it("grades a closed, unmerged one incorrect", async () => {
    const o = await check(spec, respond({ merged_at: null, state: "closed" }));
    expect(o.status).toBe("incorrect");
  });

  it("leaves an open one alone — the question isn't settled", async () => {
    const o = await check(spec, respond({ merged_at: null, state: "open" }));
    expect(o.status).toBe("pending");
  });
});

describe("github-issue-closed", () => {
  const spec = { kind: "github-issue-closed", owner: "acme", repo: "widget", number: 3 } as const;

  it("grades a closed issue correct and an open one incorrect", async () => {
    expect((await check(spec, respond({ state: "closed", closed_at: "2026-02-02T00:00:00Z" }))).status).toBe("correct");
    expect((await check(spec, respond({ state: "open" }))).status).toBe("incorrect");
  });
});

describe("http-json", () => {
  const spec = {
    kind: "http-json",
    url: "https://api.example.com/price",
    path: "data.amount",
    op: "gte",
    value: 50000,
  } as const;

  it("compares numbers that arrive as strings", async () => {
    const o = await check(spec, respond({ data: { amount: "61250.11" } }));
    expect(o.status).toBe("correct");
    if (o.status !== "pending") expect(o.evidence).toContain("61250.11");
  });

  it("grades below the line incorrect", async () => {
    expect((await check(spec, respond({ data: { amount: "40000" } }))).status).toBe("incorrect");
  });

  it("supports contains for text", async () => {
    const o = await check(
      { kind: "http-json", url: "https://api.example.com/s", path: "status", op: "contains", value: "ship" },
      respond({ status: "Shipped on Tuesday" })
    );
    expect(o.status).toBe("correct");
  });

  it("refuses to fetch a blocked URL", async () => {
    const o = await check(
      { ...spec, url: "http://169.254.169.254/latest/meta-data/" },
      respond({ data: { amount: "99999" } })
    );
    expect(o.status).toBe("pending");
  });

  it("stays pending when the path isn't there", async () => {
    expect((await check(spec, respond({ data: {} }))).status).toBe("pending");
  });

  it("stays pending when the values can't be compared", async () => {
    const o = await check(spec, respond({ data: { amount: "sometime tuesday" } }));
    expect(o.status).toBe("pending");
  });
});

describe("when the world doesn't answer", () => {
  const spec = { kind: "github-pr-merged", owner: "acme", repo: "widget", number: 7 } as const;

  it("never invents an outcome from a failure", async () => {
    // A resolver that graded a decision wrong because GitHub returned 500 would
    // put a fabricated outcome into a journal whose whole value is that its
    // outcomes are real.
    for (const fetcher of [fails("ECONNRESET"), respond({}, 500), respond({}, 404), notJson]) {
      const o = await check(spec, fetcher);
      expect(o.status).toBe("pending");
    }
  });

  it("says why, so a stuck entry can be understood", async () => {
    const o = await check(spec, respond({}, 404));
    if (o.status === "pending") expect(o.reason).toMatch(/not found/i);
  });
});

describe("ResolverSpecSchema", () => {
  it("accepts the documented shapes", () => {
    expect(ResolverSpecSchema.safeParse({ kind: "github-pr-merged", owner: "a", repo: "b", number: 1 }).success).toBe(true);
    expect(
      ResolverSpecSchema.safeParse({
        kind: "http-json",
        url: "https://x.com/y",
        path: "a.b",
        op: "lte",
        value: 3,
      }).success
    ).toBe(true);
  });

  it("rejects an unknown kind or a malformed URL", () => {
    expect(ResolverSpecSchema.safeParse({ kind: "tarot", owner: "a" }).success).toBe(false);
    expect(
      ResolverSpecSchema.safeParse({ kind: "http-json", url: "nope", path: "a", op: "eq", value: 1 }).success
    ).toBe(false);
  });

  it("rejects a negative or fractional issue number", () => {
    expect(ResolverSpecSchema.safeParse({ kind: "github-issue-closed", owner: "a", repo: "b", number: -1 }).success).toBe(false);
    expect(ResolverSpecSchema.safeParse({ kind: "github-issue-closed", owner: "a", repo: "b", number: 1.5 }).success).toBe(false);
  });
});

describe("describeResolver", () => {
  it("renders each kind as something a person can check by hand", () => {
    expect(describeResolver({ kind: "github-pr-merged", owner: "a", repo: "b", number: 9 })).toBe("a/b#9 is merged");
    expect(
      describeResolver({ kind: "http-json", url: "https://api.example.com/p", path: "data.amount", op: "gte", value: 100 })
    ).toBe("data.amount at api.example.com is at least 100");
    expect(
      describeResolver({ kind: "http-json", url: "https://api.example.com/p", path: "tag", op: "contains", value: "6." })
    ).toBe(`tag at api.example.com contains "6."`);
  });
});
