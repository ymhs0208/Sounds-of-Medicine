import type { ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  lead,
  extra,
}: {
  kicker?: string;
  title: string;
  lead?: string;
  extra?: ReactNode;
}) {
  return (
    <header className="space-y-1">
      {kicker ? <p className="text-sm font-semibold tracking-wide text-pine">{kicker}</p> : null}
      <h1 className="text-[length:var(--type-display)] leading-tight font-semibold tracking-tight text-balance">{title}</h1>
      {lead ? <p className="text-base leading-relaxed text-pretty text-muted-foreground">{lead}</p> : null}
      {extra}
    </header>
  );
}
