export function Card({
  title,
  caption,
  action,
  children,
}: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="h-full rounded-2xl border border-hairline bg-surface p-7 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight">{title}</h2>
          {caption && (
            <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-ink-secondary">
              {caption}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
