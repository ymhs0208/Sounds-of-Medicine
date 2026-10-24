import { d1Store, type CircleDatabase, type CircleStore } from "./circle-store";

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
};

type D1Database = {
  prepare(sql: string): D1Statement;
};

export function fromD1(db: D1Database): CircleDatabase {
  const statement = (sql: string, params: unknown[]) => {
    const prepared = db.prepare(sql);
    return params.length ? prepared.bind(...params) : prepared;
  };
  return {
    async exec(sql, ...params) {
      await statement(sql, params).run();
    },
    async all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
      const result = await statement(sql, params).all<T>();
      return result.results || [];
    },
    async first<T>(sql: string, ...params: unknown[]): Promise<T | null> {
      return statement(sql, params).first<T>();
    },
  };
}

/** Cloud sync stays off unless the owner enables the optional D1 binding. */
export async function circleStore(): Promise<CircleStore | null> {
  if (process.env.YAOSHENG_DB_ENABLED !== "1") return null;
  try {
    const loader = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<{
      getCloudflareContext: (options: { async: true }) => Promise<{ env: { YAOSHENG_DB?: D1Database } }>;
    }>;
    const mod = await loader("@opennextjs/cloudflare");
    const { env } = await mod.getCloudflareContext({ async: true });
    if (!env.YAOSHENG_DB) return null;
    return d1Store(fromD1(env.YAOSHENG_DB));
  } catch {
    return null;
  }
}
