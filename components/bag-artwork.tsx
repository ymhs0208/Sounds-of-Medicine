import { demoChart, isDemoKey } from "@/lib/demo-data";
import type { Bag } from "@/lib/types";

function wrap(text: string, size = 18): string[] {
  const lines: string[] = [];
  const chars = Array.from(text);
  for (let index = 0; index < chars.length; index += size) {
    lines.push(chars.slice(index, index + size).join(""));
  }
  return lines.length ? lines : [""];
}

export function BagArtwork({ bag }: { bag: Bag }) {
  const drugs = bag.drugs.length ? bag.drugs : [];
  const blocks = drugs.flatMap((drug) => {
    const warningLines = drug.warningsZh.flatMap((line) => wrap(line, 18));
    return { drug, warningLines };
  });
  const extra = blocks.reduce((sum, block) => sum + 168 + block.warningLines.length * 22, 0);
  const height = 210 + extra;
  const chart = bag.demoKey && isDemoKey(bag.demoKey) ? demoChart(bag.demoKey) : "";

  let y = 168;
  return (
    <svg viewBox={`0 0 360 ${height}`} className="h-auto w-full bg-[#fbfaf6]" role="img" aria-label={bag.hospitalZh}>
      <rect width="360" height={height} fill="#fbfaf6" />
      <rect width="360" height="78" fill={bag.theme} />
      <text x="18" y="34" fill="#fff" fontSize="20" fontWeight="700">
        {wrap(bag.hospitalZh, 14)[0]}
      </text>
      {wrap(bag.hospitalZh, 14)[1] ? (
        <text x="18" y="58" fill="#fff" fontSize="16">
          {wrap(bag.hospitalZh, 14)[1]}
        </text>
      ) : (
        <text x="18" y="58" fill="#ffffffd0" fontSize="15">
          {bag.pharmacyZh}
        </text>
      )}
      <text x="342" y="34" fill="#fff" fontSize="13" textAnchor="end">
        藥袋
      </text>
      <text x="18" y="108" fill="#1c1915" fontSize="16">
        病人　{bag.patientZh || "—"}
      </text>
      <text x="18" y="132" fill="#3f382f" fontSize="14">
        {chart ? `病歷　${chart}` : bag.pharmacyZh}
      </text>
      <text x="342" y="132" fill="#3f382f" fontSize="14" textAnchor="end">
        {bag.dispensingLabel}
      </text>
      <line x1="18" y1="148" x2="342" y2="148" stroke="#e0d6c4" />
      {blocks.map((block) => {
        const top = y;
        y += 28;
        const nameY = y;
        y += 30;
        const ingY = y;
        y += 28;
        const usageY = y;
        y += 26;
        const doseY = y;
        y += 26;
        const qtyY = y;
        y += 26;
        const indY = y;
        y += 28;
        const warnStart = y;
        y += block.warningLines.length * 22 + 16;
        return (
          <g key={block.drug.id}>
            <text x="18" y={top} fill="#6b6256" fontSize="12">
              藥品
            </text>
            <text x="18" y={nameY} fill="#1c1915" fontSize="22" fontWeight="700">
              {wrap(block.drug.nameZh, 14)[0]}
            </text>
            <text x="18" y={ingY} fill="#3f382f" fontSize="14">
              {block.drug.ingredient ? `成分 ${block.drug.ingredient}` : ""}
            </text>
            <text x="18" y={usageY} fill="#1c1915" fontSize="16">
              用法　{block.drug.usageZh}
            </text>
            <text x="18" y={doseY} fill="#1c1915" fontSize="16">
              用量　{block.drug.doseZh}
            </text>
            <text x="18" y={qtyY} fill="#1c1915" fontSize="16">
              數量　{block.drug.quantityZh}
              　適應症　{block.drug.indicationZh}
            </text>
            <text x="18" y={indY} fill="#9f1239" fontSize="13" fontWeight="700">
              注意事項
            </text>
            {block.warningLines.map((line, index) => (
              <text key={`${block.drug.id}-${index}`} x="18" y={warnStart + index * 22} fill="#9f1239" fontSize="15">
                {line}
              </text>
            ))}
          </g>
        );
      })}
      <rect x="18" y={height - 46} width="150" height="28" fill="#1c1915" opacity="0.85" />
      {[8, 12, 14, 18, 22, 28, 30, 36, 40, 46, 48, 54, 60, 66, 70, 76].map((offset) => (
        <rect key={offset} x={22 + offset} y={height - 42} width={offset % 5 === 0 ? 3 : 1.5} height="20" fill="#fff" />
      ))}
      {bag.source === "demo" ? (
        <g>
          <circle cx="292" cy={height - 78} r="36" fill="none" stroke="#c4553a" strokeWidth="3" />
          <text x="292" y={height - 84} textAnchor="middle" fill="#c4553a" fontSize="13" fontWeight="700">
            示範
          </text>
          <text x="292" y={height - 66} textAnchor="middle" fill="#c4553a" fontSize="11">
            非真實處方
          </text>
        </g>
      ) : null}
    </svg>
  );
}

export function BagFace({ bag }: { bag: Bag }) {
  if (bag.photoDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={bag.photoDataUrl} alt={bag.hospitalZh || "藥袋照片"} className="h-auto w-full object-contain" />
    );
  }
  return <BagArtwork bag={bag} />;
}
