type SyncKv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

/** Live sync stays off unless the owner enables the optional KV binding. */
export async function syncNamespace(): Promise<SyncKv | null> {
  if (process.env.YAOSHENG_SYNC_ENABLED !== "1") return null;
  try {
    const loader = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<{
      getCloudflareContext: (options: { async: true }) => Promise<{ env: { YAOSHENG_SYNC?: SyncKv } }>;
    }>;
    const mod = await loader("@opennextjs/cloudflare");
    const { env } = await mod.getCloudflareContext({ async: true });
    return env.YAOSHENG_SYNC ?? null;
  } catch {
    return null;
  }
}
