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
    <section className="relative h-full overflow-hidden rounded-2xl border border-hairline bg-surface/75 p-7 shadow-[var(--shadow-card)] backdrop-blur-md transition-all duration-200 hover:border-hairline-strong">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-ink">{title}</h2>
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
