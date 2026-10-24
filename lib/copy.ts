import { OBS_TEXT, REPLY_TEXT, slotLabel, ui } from "./i18n";
import { fill, drugText, findDrug } from "./format";
import type { Bag, Lang, Observation, ReplyTemplate, Report } from "./types";

export function observationLabel(lang: Lang, key: Observation): string {
  return ui[lang][OBS_TEXT[key]];
}

export function replyLabel(lang: Lang, key: ReplyTemplate): string {
  return ui[lang][REPLY_TEXT[key]];
}

export function reportSentence(report: Report, lang: Lang, bags: Bag[]): string {
  const found = findDrug(bags, report.drugId);
  const name = found ? drugText(found.drug, lang).name : "";
  const slot = report.slot ? slotLabel[lang][report.slot] : "";
  const pack = ui[lang];
  if (report.kind === "given") return fill(pack.givenSentence, { drug: name, slot });
  if (report.kind === "missed") return fill(pack.missedSentence, { drug: name, slot });
  const obs = report.observation ? observationLabel(lang, report.observation) : "";
  return fill(pack.obsSentence, { drug: name, obs });
}

export function duplicateLine(
  lang: Lang,
  items: { hospital: string; name: string }[],
  ingredient: string,
): string {
  const joiner = lang === "zh" || lang === "th" ? "、" : ", ";
  const names = items.map((item) => `${item.name}（${item.hospital}）`).join(joiner);
  return fill(ui[lang].askList, { names, ing: ingredient });
}
