export function Bilingual({
  label,
  primary,
  original,
  showOriginal,
  originalLabel,
}: {
  label: string;
  primary: string;
  original?: string;
  showOriginal: boolean;
  originalLabel: string;
}) {
  return (
    <section className="border-b border-border py-3 last:border-b-0">
      <h3 className="text-sm font-semibold text-pine">{label}</h3>
      <p className="mt-1 text-lg font-semibold leading-snug">{primary || "—"}</p>
      {showOriginal && original && original !== primary ? (
        <p className="mt-1 text-base leading-snug text-[#3f382f]">
          <span className="mr-2 text-xs font-semibold text-[#6b6256]">{originalLabel}</span>
          {original}
        </p>
      ) : null}
    </section>
  );
}
