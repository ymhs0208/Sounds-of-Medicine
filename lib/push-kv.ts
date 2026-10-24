type PushKv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
};

/** Push storage stays off unless the owner enables the optional KV binding. */
export async function pushNamespace(): Promise<PushKv | null> {
  if (process.env.YAOSHENG_PUSH_ENABLED !== "1") return null;
  try {
    const loader = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<{
      getCloudflareContext: (options: { async: true }) => Promise<{ env: { YAOSHENG_PUSH?: PushKv } }>;
    }>;
    const mod = await loader("@opennextjs/cloudflare");
    const { env } = await mod.getCloudflareContext({ async: true });
    return env.YAOSHENG_PUSH ?? null;
  } catch {
    return null;
  }
}

export function vapidPublic(): string {
  return process.env.VAPID_PUBLIC_KEY || "";
}

export function vapidReady(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}
