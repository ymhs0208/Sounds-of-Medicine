import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function Logo({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#1b5e45" />
      <rect x="13" y="18" width="14" height="12" rx="6" fill="#f6f1e8" />
      <path d="M31 17.5c3.2 2.4 3.2 10.6 0 13" stroke="#f6f1e8" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M35.5 14c4.6 3.6 4.6 16.4 0 20" stroke="#e7c27a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("font-semibold tracking-tight", className)}>{APP_NAME}</span>;
}
