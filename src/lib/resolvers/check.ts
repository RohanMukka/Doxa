import {
  isSafeUrl,
  pluck,
  type Fetcher,
  type Observation,
  type ResolverSpec,
} from "./spec";

/**
 * Running a criterion against the world.
 *
 * The fetcher is injected rather than reached for, so every path here is
 * testable without a network — including the ones that matter most, which are
 * the failures. A resolver that silently grades a decision wrong because GitHub
 * returned a 500 would be worse than no resolver at all: it would put a
 * fabricated outcome into a journal whose entire value is that its outcomes are
 * real. So anything short of a clear answer returns `pending` and the decision
 * stays open.
 */

const GITHUB_API = "https://api.github.com";

async function readJson(
  fetcher: Fetcher,
  url: string,
  init?: RequestInit
): Promise<{ ok: true; body: unknown } | { ok: false; reason: string }> {
  let response: Response;
  try {
    response = await fetcher(url, init);
  } catch (e) {
    return { ok: false, reason: `Couldn't reach it: ${e instanceof Error ? e.message : "network error"}.` };
  }

  if (response.status === 404) {
    return { ok: false, reason: "Not found — it may be private, renamed, or deleted." };
  }
  if (!response.ok) {
    return { ok: false, reason: `Answered ${response.status}.` };
  }

  try {
    return { ok: true, body: await response.json() };
  } catch {
    return { ok: false, reason: "The response wasn't JSON." };
  }
}

function githubHeaders(): HeadersInit {
  const headers: HeadersInit = { accept: "application/vnd.github+json" };
  // Optional: unauthenticated requests work but are rate-limited hard.
  if (process.env.GITHUB_TOKEN) {
    (headers as Record<string, string>).authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

export async function check(
  spec: ResolverSpec,
  fetcher: Fetcher = fetch
): Promise<Observation> {
  const observedAt = new Date();

  switch (spec.kind) {
    case "github-pr-merged": {
      const url = `${GITHUB_API}/repos/${spec.owner}/${spec.repo}/pulls/${spec.number}`;
      const result = await readJson(fetcher, url, { headers: githubHeaders() });
      if (!result.ok) return { status: "pending", reason: result.reason };

      const pr = result.body as { merged_at?: string | null; state?: string };
      if (pr.merged_at) {
        return {
          status: "correct",
          evidence: `Merged at ${pr.merged_at}.`,
          source: url,
          observedAt,
        };
      }
      // Still open means the question isn't settled yet — only a closed,
      // unmerged pull request is a decided "no".
      if (pr.state === "closed") {
        return {
          status: "incorrect",
          evidence: "Closed without being merged.",
          source: url,
          observedAt,
        };
      }
      return { status: "pending", reason: "Still open." };
    }

    case "github-issue-closed": {
      const url = `${GITHUB_API}/repos/${spec.owner}/${spec.repo}/issues/${spec.number}`;
      const result = await readJson(fetcher, url, { headers: githubHeaders() });
      if (!result.ok) return { status: "pending", reason: result.reason };

      const issue = result.body as { state?: string; closed_at?: string | null };
      if (issue.state === "closed") {
        return {
          status: "correct",
          evidence: `Closed at ${issue.closed_at ?? "an unrecorded time"}.`,
          source: url,
          observedAt,
        };
      }
      if (issue.state === "open") {
        return { status: "incorrect", evidence: "Still open.", source: url, observedAt };
      }
      return { status: "pending", reason: "Couldn't read its state." };
    }

    case "http-json": {
      if (!isSafeUrl(spec.url)) {
        return { status: "pending", reason: "That URL isn't one this will fetch." };
      }

      const result = await readJson(fetcher, spec.url);
      if (!result.ok) return { status: "pending", reason: result.reason };

      const found = pluck(result.body, spec.path);
      if (found === undefined || found === null) {
        return { status: "pending", reason: `Nothing at "${spec.path}" in the response.` };
      }

      const met = compare(found, spec.op, spec.value);
      if (met === null) {
        return {
          status: "pending",
          reason: `Couldn't compare ${JSON.stringify(found)} against ${JSON.stringify(spec.value)}.`,
        };
      }

      return {
        status: met ? "correct" : "incorrect",
        evidence: `${spec.path} was ${JSON.stringify(found)}.`,
        source: spec.url,
        observedAt,
      };
    }
  }
}

/** Null when the two values can't meaningfully be compared at all. */
function compare(found: unknown, op: string, want: string | number): boolean | null {
  if (op === "contains") {
    return String(found).toLowerCase().includes(String(want).toLowerCase());
  }
  if (op === "eq") {
    return String(found) === String(want);
  }

  const a = Number(found);
  const b = Number(want);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return op === "gte" ? a >= b : a <= b;
}
