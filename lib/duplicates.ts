import type { Bag, Drug } from "./types";

export type DrugRef = { bag: Bag; drug: Drug };

export type DuplicateGroup = {
  key: string;
  ingredient: string;
  items: DrugRef[];
};

/** First Latin token, so "Amlodipine besylate" matches "Amlodipine". */
export function ingredientKey(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .trim();
  if (!cleaned) return "";
  const first = cleaned.split(" ")[0] ?? cleaned;
  if (/^[a-z]/.test(first) && first.length >= 4) return first;
  return cleaned.replace(/\s+/g, "");
}

export function duplicateGroups(bags: Bag[]): DuplicateGroup[] {
  const groups = new Map<string, DrugRef[]>();
  for (const bag of bags) {
    for (const drug of bag.drugs) {
      const key = ingredientKey(drug.ingredient || drug.nameZh);
      if (!key) continue;
      const list = groups.get(key) ?? [];
      list.push({ bag, drug });
      groups.set(key, list);
    }
  }
  const out: DuplicateGroup[] = [];
  for (const [key, items] of groups) {
    const hospitals = new Set(items.map((item) => item.bag.id));
    if (hospitals.size < 2) continue;
    out.push({
      key,
      ingredient: items.find((item) => item.drug.ingredient)?.drug.ingredient || key,
      items,
    });
  }
  return out;
}

export function duplicateDrugIds(bags: Bag[]): Set<string> {
  const ids = new Set<string>();
  for (const group of duplicateGroups(bags)) {
    for (const item of group.items) ids.add(item.drug.id);
  }
  return ids;
}
