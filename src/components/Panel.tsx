import type { ReactNode } from "react";

export function Panel({
  title,
  subtitle,
  status,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  status?: { label: string; tone: "live" | "planned" };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col rounded-lg border border-line bg-panel ${className}`}
    >
      <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
          ) : null}
        </div>
        {status ? (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
              status.tone === "live"
                ? "border-accent/40 text-accent"
                : "border-line text-muted"
            }`}
          >
            {status.label}
          </span>
        ) : null}
      </header>
      <div className="flex-1 px-5 py-4">{children}</div>
    </section>
  );
}

/** Labels the inputs consistently so the two panels read as one product. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-line bg-raised px-3 py-2 font-mono text-xs text-foreground outline-none placeholder:text-muted/60 focus:border-accent/60";
