import { fromD1 } from "./circle-db";
import { d1LineStore, type LineStore } from "./line-store";

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
};

type D1Database = { prepare(sql: string): D1Statement };

/** LINE sync stays off unless D1 is enabled. A missing binding does not throw. */
export async function lineStore(): Promise<LineStore | null> {
  if (process.env.YAOSHENG_DB_ENABLED !== "1") return null;
  try {
    const loader = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<{
      getCloudflareContext: (options: { async: true }) => Promise<{ env: { YAOSHENG_DB?: D1Database } }>;
    }>;
    const mod = await loader("@opennextjs/cloudflare");
    const { env } = await mod.getCloudflareContext({ async: true });
    if (!env.YAOSHENG_DB) return null;
    return d1LineStore(fromD1(env.YAOSHENG_DB));
  } catch {
    return null;
  }
}
