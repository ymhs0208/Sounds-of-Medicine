/** Drop query strings, contact details, and anything that looks like a saved cabinet. */
export function scrubErrorText(text: string): string {
  return text
    .replace(/https?:\/\/[^\s)]+/gi, (url) => url.split("?")[0].slice(0, 120))
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b[\d+\-()]{8,}\b/g, "[number]")
    .replace(/yaosheng\.v1[\s\S]*/i, "[local]")
    .replace(/enc:v1:[\w-]*/gi, "[local]")
    .slice(0, 240);
}
