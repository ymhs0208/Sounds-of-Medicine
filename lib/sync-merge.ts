export type VersionVector = Record<string, number>;

export type Envelope = {
  id: string;
  vector: VersionVector;
  updatedAt: string;
  deviceId: string;
  generation: number;
  cipher: string;
  size: number;
};

export type MergeReason = "equal" | "local" | "remote" | "lww-local" | "lww-remote" | "generation";

export type MergeResult = {
  winner: Envelope;
  conflict: boolean;
  reason: MergeReason;
};

export function compareVectors(left: VersionVector, right: VersionVector): "left" | "right" | "equal" | "concurrent" {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  let leftAhead = false;
  let rightAhead = false;
  for (const key of keys) {
    const a = left[key] || 0;
    const b = right[key] || 0;
    if (a > b) leftAhead = true;
    if (b > a) rightAhead = true;
  }
  if (leftAhead && rightAhead) return "concurrent";
  if (leftAhead) return "left";
  if (rightAhead) return "right";
  return "equal";
}

function later(left: Envelope, right: Envelope): boolean {
  if (left.updatedAt !== right.updatedAt) return left.updatedAt > right.updatedAt;
  return left.deviceId >= right.deviceId;
}

/** Per-record merge. A higher key generation always wins. Concurrent edits use the later timestamp. */
export function mergeEnvelope(local: Envelope, remote: Envelope): MergeResult {
  if (remote.generation > local.generation) return { winner: remote, conflict: false, reason: "generation" };
  if (local.generation > remote.generation) return { winner: local, conflict: false, reason: "generation" };
  const order = compareVectors(local.vector, remote.vector);
  if (order === "equal") return { winner: local, conflict: false, reason: "equal" };
  if (order === "left") return { winner: local, conflict: false, reason: "local" };
  if (order === "right") return { winner: remote, conflict: false, reason: "remote" };
  if (later(local, remote)) return { winner: local, conflict: true, reason: "lww-local" };
  return { winner: remote, conflict: true, reason: "lww-remote" };
}

export function mergeRecordSets(local: Envelope[], remote: Envelope[]): { records: Envelope[]; conflicts: string[] } {
  const byId = new Map<string, Envelope>();
  const conflicts: string[] = [];
  for (const item of local) byId.set(item.id, item);
  for (const item of remote) {
    const have = byId.get(item.id);
    if (!have) {
      byId.set(item.id, item);
      continue;
    }
    const merged = mergeEnvelope(have, item);
    if (merged.conflict) conflicts.push(item.id);
    byId.set(item.id, merged.winner);
  }
  return { records: [...byId.values()], conflicts };
}

export function decidePush(existing: Envelope | null, incoming: Envelope): "keep" | "replace" {
  if (!existing) return "replace";
  return mergeEnvelope(existing, incoming).winner === incoming ? "replace" : "keep";
}
