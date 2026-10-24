import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <section className="ys-card px-5 py-8 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-pine">
        <Icon className="size-8" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-2xl font-semibold">{title}</h2>
      {body ? <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-muted-foreground">{body}</p> : null}
      {children ? <div className="mt-4 space-y-2">{children}</div> : null}
    </section>
  );
}
