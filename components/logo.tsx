export function Logo({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#1b5e45" />
      <path d="M15 14h18l3 5v16a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3V19l3-5z" fill="#f4efe4" />
      <path d="M15 14h18l-2.2 4.2H17.2L15 14z" fill="#c4553a" />
      <path d="M18 27h5M26.5 27c1.6-2.2 3.2-2.2 4.8 0 1.6 2.2 3.2 2.2 4.2 0" stroke="#1b5e45" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M18 32h12" stroke="#1b5e45" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
