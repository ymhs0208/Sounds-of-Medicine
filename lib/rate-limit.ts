export type LimitResult = { ok: true } | { ok: false; retryAfter: number };

type Bucket = { count: number; reset: number };

const memory = new Map<string, Bucket>();
const MEMORY_CAP = 4_000;

export const LIMITS = {
  extract: { limit: 8, windowMs: 10 * 60 * 1000 },
  translate: { limit: 30, windowMs: 10 * 60 * 1000 },
} as const;

export type LimitKind = keyof typeof LIMITS;

/** In-isolate window. Tests use this directly. A public deploy should also turn on KV or the rate-limit binding. */
export function takeMemory(key: string, limit: number, windowMs: number, now = Date.now()): LimitResult {
  if (memory.size > MEMORY_CAP) {
    const oldest = memory.keys().next().value;
    if (oldest) memory.delete(oldest);
  }
  const row = memory.get(key);
  if (!row || now >= row.reset) {
    memory.set(key, { count: 1, reset: now + windowMs });
    return { ok: true };
  }
  if (row.count >= limit) return { ok: false, retryAfter: Math.max(1, Math.ceil((row.reset - now) / 1000)) };
  row.count += 1;
  return { ok: true };
}

export function resetMemoryLimits(): void {
  memory.clear();
}

type CounterKv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

async function counterKv(): Promise<CounterKv | null> {
  if (process.env.YAOSHENG_LIMITS_ENABLED !== "1") return null;
  try {
    const loader = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<{
      getCloudflareContext: (options: { async: true }) => Promise<{ env: { YAOSHENG_LIMITS?: CounterKv } }>;
    }>;
    const mod = await loader("@opennextjs/cloudflare");
    const { env } = await mod.getCloudflareContext({ async: true });
    return env.YAOSHENG_LIMITS ?? null;
  } catch {
    return null;
  }
}

type RateBinding = { limit(options: { key: string }): Promise<{ success: boolean }> };

async function rateBinding(): Promise<RateBinding | null> {
  try {
    const loader = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<{
      getCloudflareContext: (options: { async: true }) => Promise<{ env: { YAOSHENG_RATE_LIMIT?: RateBinding } }>;
    }>;
    const mod = await loader("@opennextjs/cloudflare");
    const { env } = await mod.getCloudflareContext({ async: true });
    return env.YAOSHENG_RATE_LIMIT ?? null;
  } catch {
    return null;
  }
}

async function takeKv(kv: CounterKv, key: string, limit: number, windowMs: number): Promise<LimitResult> {
  const raw = await kv.get(key);
  const count = raw ? Number(raw) : 0;
  if (Number.isFinite(count) && count >= limit) return { ok: false, retryAfter: Math.ceil(windowMs / 1000) };
  await kv.put(key, String((Number.isFinite(count) ? count : 0) + 1), { expirationTtl: Math.ceil(windowMs / 1000) });
  return { ok: true };
}

function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function deviceId(request: Request): string | null {
  const value = request.headers.get("x-yaosheng-device") || "";
  return /^[A-Za-z0-9_-]{16,80}$/.test(value) ? value : null;
}

export async function enforceLimit(request: Request, kind: LimitKind): Promise<LimitResult> {
  const rule = LIMITS[kind];
  const ip = clientIp(request);
  const device = deviceId(request);
  const keys = [`${kind}:ip:${ip}`];
  if (device) keys.push(`${kind}:device:${device}`);

  const binding = await rateBinding();
  if (binding) {
    for (const key of keys) {
      try {
        const result = await binding.limit({ key });
        if (!result.success) return { ok: false, retryAfter: 60 };
      } catch {
        /* A missing or broken binding must not take the route down. */
      }
    }
  }

  const kv = await counterKv();
  if (kv) {
    for (const key of keys) {
      try {
        const result = await takeKv(kv, key, rule.limit, rule.windowMs);
        if (!result.ok) return result;
      } catch {
        /* Fall through to the in-memory window. */
      }
    }
  }

  for (const key of keys) {
    const result = takeMemory(key, rule.limit, rule.windowMs);
    if (!result.ok) return result;
  }
  return { ok: true };
}
