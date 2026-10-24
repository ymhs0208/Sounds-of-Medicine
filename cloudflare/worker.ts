// Wrangler bundles this entry. The OpenNext build must run first so `.open-next/worker.js` exists.
import { runPushCron, type PushEnv } from "../lib/push-cron";

type WorkerHandler = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const loaded = (await import("../.open-next/worker.js")) as { default: WorkerHandler };
    return loaded.default.fetch(request, env, ctx);
  },
  async scheduled(_event: unknown, env: PushEnv, ctx: { waitUntil: (promise: Promise<unknown>) => void }) {
    ctx.waitUntil(runPushCron(env).catch(() => ({ sent: 0, reason: "error" })));
  },
};
