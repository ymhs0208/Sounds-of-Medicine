"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function ClampText({
  text,
  expand,
  collapse,
  className,
}: {
  text: string;
  expand: string;
  collapse: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      const el = ref.current;
      if (!el || cancelled) return;
      setOverflows(open || el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    void document.fonts?.ready.then(measure);
    return () => {
      cancelled = true;
    };
  }, [text, open]);

  if (!text) return null;
  return (
    <div>
      <p ref={ref} className={cn("leading-snug", !open && "line-clamp-2", className)}>
        {text}
      </p>
      {overflows ? (
        <button type="button" className="mt-1 min-h-11 text-sm font-semibold text-pine" onClick={() => setOpen((value) => !value)}>
          {open ? collapse : expand}
        </button>
      ) : null}
    </div>
  );
}
