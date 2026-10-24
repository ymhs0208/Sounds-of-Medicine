export function drugPath(id: string): string {
  return `/meds/card?id=${encodeURIComponent(id)}`;
}

export const staticDemo = process.env.NEXT_PUBLIC_STATIC === "1";
