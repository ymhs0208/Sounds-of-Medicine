import { dueTimes, parsePushRecord, taipeiParts, type PushRecord } from "./push-schedule";
import { sendWebPush } from "./web-push";

type PushKv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
};

export type PushEnv = {
  YAOSHENG_PUSH?: PushKv;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
};

export function pushConfigured(env: PushEnv): boolean {
  return Boolean(env.YAOSHENG_PUSH && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
}

/** Sends generic clock reminders. The stored record has no drug or patient names. */
export async function runPushCron(env: PushEnv, now = new Date()): Promise<{ sent: number; reason?: string }> {
  if (!env.YAOSHENG_PUSH || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    return { sent: 0, reason: "unconfigured" };
  }
  const vapid = { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT };
  let sent = 0;
  let cursor: string | undefined;
  do {
    const page = await env.YAOSHENG_PUSH.list({ prefix: "push:", cursor });
    for (const key of page.keys) {
      const raw = await env.YAOSHENG_PUSH.get(key.name);
      if (!raw) continue;
      let record: PushRecord | null = null;
      try {
        record = parsePushRecord(JSON.parse(raw));
      } catch {
        record = null;
      }
      if (!record) continue;
      const due = dueTimes(record, now);
      if (!due.length) continue;
      const ok = await sendWebPush(record, record.lang, vapid).catch(() => false);
      if (!ok) continue;
      const day = taipeiParts(now).date;
      for (const time of due) record.sent[time] = day;
      await env.YAOSHENG_PUSH.put(key.name, JSON.stringify(record));
      sent += 1;
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return { sent };
}
