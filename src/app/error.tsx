"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-lg space-y-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">That didn&rsquo;t work</h1>
      <p className="text-sm leading-relaxed text-ink-secondary">
        {error.message || "Something failed while loading this page."}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-page transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
