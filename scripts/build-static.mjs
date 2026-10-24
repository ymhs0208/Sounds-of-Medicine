import { spawn } from "node:child_process";
import { access, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const apiDir = path.join(root, "app/api");
const stashDir = path.join(root, ".static-stash");
const stashedApi = path.join(stashDir, "api");

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function runNextBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["next", "build"], {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        STATIC_EXPORT: "1",
        NEXT_PUBLIC_STATIC: "1",
      },
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`next build exited with ${code}`));
    });
  });
}

let moved = false;
try {
  if (await exists(apiDir)) {
    await rm(stashDir, { recursive: true, force: true });
    await mkdir(stashDir, { recursive: true });
    await rename(apiDir, stashedApi);
    moved = true;
  }
  await runNextBuild();
  console.log("Static demo is in out/. Serve that folder from its root.");
} finally {
  if (moved) {
    await rm(apiDir, { recursive: true, force: true });
    await rename(stashedApi, apiDir);
    await rm(stashDir, { recursive: true, force: true });
  }
}
