"use client";

import { useState } from "react";

/**
 * Hand the criterion to something that can go and check it.
 *
 * Optional, and deliberately unobtrusive: most decisions worth journalling are
 * judgements about a life and nothing can settle them for you. This is for the
 * minority that aren't — and those are what give your self-graded accuracy
 * something to be compared against.
 */

const FIELD =
  "rounded-xl border border-hairline bg-surface px-3 py-2 text-[13px] transition-colors duration-200 placeholder:text-ink-muted focus:border-hairline-strong";

type Kind = "" | "github-pr-merged" | "github-issue-closed" | "http-json";

export function ResolverField() {
  const [kind, setKind] = useState<Kind>("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [number, setNumber] = useState("");
  const [url, setUrl] = useState("");
  const [path, setPath] = useState("");
  const [op, setOp] = useState("gte");
  const [value, setValue] = useState("");

  const spec = (() => {
    if (kind === "github-pr-merged" || kind === "github-issue-closed") {
      if (!owner || !repo || !number) return null;
      return { kind, owner, repo, number: Number(number) };
    }
    if (kind === "http-json") {
      if (!url || !path || !value) return null;
      const numeric = Number(value);
      return { kind, url, path, op, value: Number.isFinite(numeric) ? numeric : value };
    }
    return null;
  })();

  return (
    <div className="rounded-xl border border-hairline bg-surface p-4">
      <input type="hidden" name="resolver" value={spec ? JSON.stringify(spec) : ""} />

      <label htmlFor="resolver-kind" className="text-[14px] font-medium">
        Can something else settle this?{" "}
        <span className="font-normal text-ink-muted">(optional)</span>
      </label>
      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
        Most decisions worth writing down are judgements, and only you can grade them —
        which is exactly where motivated reasoning lives. When the outcome is a plain fact,
        hand it over. Those are the entries your self-graded ones get measured against.
      </p>

      <select
        id="resolver-kind"
        value={kind}
        onChange={(e) => setKind(e.target.value as Kind)}
        className={`${FIELD} mt-3 w-full`}
      >
        <option value="">No — I&rsquo;ll decide this one myself</option>
        <option value="github-pr-merged">A pull request gets merged</option>
        <option value="github-issue-closed">An issue gets closed</option>
        <option value="http-json">A number on a public API crosses a line</option>
      </select>

      {(kind === "github-pr-merged" || kind === "github-issue-closed") && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <input aria-label="Owner" placeholder="owner" value={owner} onChange={(e) => setOwner(e.target.value)} className={FIELD} />
          <input aria-label="Repository" placeholder="repo" value={repo} onChange={(e) => setRepo(e.target.value)} className={FIELD} />
          <input aria-label="Number" placeholder="123" inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))} className={FIELD} />
        </div>
      )}

      {kind === "http-json" && (
        <div className="mt-3 space-y-2">
          <input aria-label="URL" placeholder="https://api.coinbase.com/v2/prices/BTC-USD/spot" value={url} onChange={(e) => setUrl(e.target.value)} className={`${FIELD} w-full`} />
          <div className="grid grid-cols-3 gap-2">
            <input aria-label="Path into the response" placeholder="data.amount" value={path} onChange={(e) => setPath(e.target.value)} className={FIELD} />
            <select aria-label="Comparison" value={op} onChange={(e) => setOp(e.target.value)} className={FIELD}>
              <option value="gte">at least</option>
              <option value="lte">at most</option>
              <option value="eq">exactly</option>
              <option value="contains">contains</option>
            </select>
            <input aria-label="Value" placeholder="100000" value={value} onChange={(e) => setValue(e.target.value)} className={FIELD} />
          </div>
        </div>
      )}

      {kind !== "" && !spec && (
        <p className="mt-2 text-[12px] text-ink-muted">
          Fill the rest in, or this saves as one you&rsquo;ll grade yourself.
        </p>
      )}
    </div>
  );
}
