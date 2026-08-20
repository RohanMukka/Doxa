import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-lg space-y-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Nothing here</h1>
      <p className="text-sm leading-relaxed text-ink-secondary">
        That page doesn&rsquo;t exist.
      </p>
      <Link
        href="/"
        className="inline-block rounded-lg bg-ink px-4 py-2 text-sm font-medium text-page transition-opacity hover:opacity-90"
      >
        Back to the dashboard
      </Link>
    </div>
  );
}
