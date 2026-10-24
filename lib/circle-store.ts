import { cipherLooksPlain } from "./circle-crypto";
import { decidePush, type Envelope } from "./sync-merge";

export type MemberRole = "owner" | "family" | "caregiver";

export type Member = {
  id: string;
  circleId: string;
  lineSub: string;
  name: string;
  role: MemberRole;
  removedAt: string | null;
};

export type CircleRow = {
  id: string;
  ownerSub: string;
  generation: number;
  createdAt: string;
};

export type CircleDatabase = {
  exec(sql: string, ...params: unknown[]): Promise<void>;
  all<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  first<T>(sql: string, ...params: unknown[]): Promise<T | null>;
};

const ID = /^[A-Za-z0-9_-]{16,80}$/;
const RECORD = /^[A-Za-z0-9_:-]{1,96}$/;

export function validId(value: string): boolean {
  return ID.test(value);
}

export function parseEnvelope(raw: unknown, generation: number): Envelope | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<Envelope>;
  if (typeof value.id !== "string" || !RECORD.test(value.id)) return null;
  if (typeof value.cipher !== "string" || value.cipher.length < 16 || value.cipher.length > 120_000) return null;
  if (cipherLooksPlain(value.cipher)) return null;
  if (typeof value.updatedAt !== "string" || Number.isNaN(Date.parse(value.updatedAt))) return null;
  if (typeof value.deviceId !== "string" || !ID.test(value.deviceId)) return null;
  if (!value.vector || typeof value.vector !== "object" || Array.isArray(value.vector)) return null;
  const vector: Record<string, number> = {};
  for (const [key, count] of Object.entries(value.vector)) {
    if (!ID.test(key) || typeof count !== "number" || count < 0 || count > 1_000_000) return null;
    vector[key] = count;
  }
  return {
    id: value.id,
    vector,
    updatedAt: value.updatedAt,
    deviceId: value.deviceId,
    generation,
    cipher: value.cipher,
    size: value.cipher.length,
  };
}

type CircleSql = { id: string; owner_sub: string; generation: number; created_at: string };
type MemberSql = { id: string; circle_id: string; line_sub: string; display_name: string; role: MemberRole; removed_at: string | null };
type RecordSql = {
  record_id: string;
  generation: number;
  vector: string;
  updated_at: string;
  device_id: string;
  cipher: string;
  size: number;
};

function member(row: MemberSql): Member {
  return { id: row.id, circleId: row.circle_id, lineSub: row.line_sub, name: row.display_name, role: row.role, removedAt: row.removed_at };
}

export function d1Store(db: CircleDatabase) {
  return {
    async upsertUser(sub: string, name: string, now: string) {
      await db.exec(
        `INSERT INTO users (line_sub, display_name, created_at, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(line_sub) DO UPDATE SET display_name = excluded.display_name, updated_at = excluded.updated_at`,
        sub,
        name,
        now,
        now,
      );
    },
    async createCircle(input: { circleId: string; ownerSub: string; ownerName: string; memberId: string; now: string }) {
      const existing = await db.first<CircleSql>("SELECT id, owner_sub, generation, created_at FROM circles WHERE id = ?", input.circleId);
      if (existing) {
        const mine = await db.first<MemberSql>(
          "SELECT id, circle_id, line_sub, display_name, role, removed_at FROM members WHERE circle_id = ? AND line_sub = ?",
          input.circleId,
          input.ownerSub,
        );
        if (!mine || mine.removed_at) return { error: "exists" as const };
        return { circleId: existing.id, memberId: mine.id, generation: existing.generation, role: mine.role };
      }
      await db.exec(
        "INSERT INTO circles (id, owner_sub, generation, created_at, updated_at) VALUES (?, ?, 1, ?, ?)",
        input.circleId,
        input.ownerSub,
        input.now,
        input.now,
      );
      await db.exec(
        "INSERT INTO members (id, circle_id, line_sub, display_name, role, removed_at, created_at) VALUES (?, ?, ?, ?, 'owner', NULL, ?)",
        input.memberId,
        input.circleId,
        input.ownerSub,
        input.ownerName,
        input.now,
      );
      return { circleId: input.circleId, memberId: input.memberId, generation: 1, role: "owner" as const };
    },
    async join(input: { circleId: string; sub: string; name: string; memberId: string; role: "family" | "caregiver"; now: string }) {
      const circle = await db.first<CircleSql>("SELECT id, owner_sub, generation, created_at FROM circles WHERE id = ?", input.circleId);
      if (!circle) return { error: "missing" as const };
      const existing = await db.first<MemberSql>(
        "SELECT id, circle_id, line_sub, display_name, role, removed_at FROM members WHERE circle_id = ? AND line_sub = ?",
        input.circleId,
        input.sub,
      );
      if (existing?.removed_at) return { error: "removed" as const };
      if (existing) return { circleId: circle.id, memberId: existing.id, generation: circle.generation, role: existing.role };
      await db.exec(
        "INSERT INTO members (id, circle_id, line_sub, display_name, role, removed_at, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)",
        input.memberId,
        input.circleId,
        input.sub,
        input.name,
        input.role,
        input.now,
      );
      return { circleId: circle.id, memberId: input.memberId, generation: circle.generation, role: input.role };
    },
    async membership(sub: string) {
      const row = await db.first<MemberSql & CircleSql>(
        `SELECT members.id, members.circle_id, members.line_sub, members.display_name, members.role, members.removed_at,
                circles.owner_sub, circles.generation, circles.created_at
         FROM members JOIN circles ON circles.id = members.circle_id
         WHERE members.line_sub = ? AND members.removed_at IS NULL
         ORDER BY members.created_at DESC LIMIT 1`,
        sub,
      );
      if (!row) return null;
      const people = await db.all<MemberSql>(
        "SELECT id, circle_id, line_sub, display_name, role, removed_at FROM members WHERE circle_id = ? ORDER BY created_at",
        row.circle_id,
      );
      return {
        circleId: row.circle_id,
        generation: row.generation,
        role: row.role,
        memberId: row.id,
        members: people.map(member),
      };
    },
    async removeMember(input: { actorSub: string; memberId: string; now: string }) {
      const target = await db.first<MemberSql>(
        "SELECT id, circle_id, line_sub, display_name, role, removed_at FROM members WHERE id = ?",
        input.memberId,
      );
      if (!target || target.removed_at) return { error: "missing" as const };
      const actor = await db.first<MemberSql>(
        "SELECT id, circle_id, line_sub, display_name, role, removed_at FROM members WHERE circle_id = ? AND line_sub = ? AND removed_at IS NULL",
        target.circle_id,
        input.actorSub,
      );
      if (!actor || actor.role !== "owner" || actor.id === target.id) return { error: "forbidden" as const };
      const circle = await db.first<CircleSql>("SELECT id, owner_sub, generation, created_at FROM circles WHERE id = ?", target.circle_id);
      if (!circle) return { error: "missing" as const };
      const generation = circle.generation + 1;
      await db.exec("UPDATE members SET removed_at = ? WHERE id = ?", input.now, target.id);
      await db.exec("UPDATE circles SET generation = ?, updated_at = ? WHERE id = ?", generation, input.now, circle.id);
      await db.exec("DELETE FROM records WHERE circle_id = ?", circle.id);
      return { generation };
    },
    async push(input: { sub: string; generation: number; records: Envelope[] }) {
      const mine = await this.membership(input.sub);
      if (!mine) return { error: "forbidden" as const };
      if (mine.generation !== input.generation) return { error: "generation" as const, generation: mine.generation };
      const rejected: string[] = [];
      for (const incoming of input.records) {
        const row = await db.first<RecordSql>(
          "SELECT record_id, generation, vector, updated_at, device_id, cipher, size FROM records WHERE circle_id = ? AND record_id = ?",
          mine.circleId,
          incoming.id,
        );
        const existing = row
          ? parseEnvelope(
              {
                id: row.record_id,
                vector: JSON.parse(row.vector) as Record<string, number>,
                updatedAt: row.updated_at,
                deviceId: row.device_id,
                cipher: row.cipher,
              },
              row.generation,
            )
          : null;
        if (decidePush(existing, { ...incoming, generation: mine.generation }) === "keep") {
          rejected.push(incoming.id);
          continue;
        }
        await db.exec(
          `INSERT INTO records (circle_id, record_id, generation, vector, updated_at, device_id, cipher, size)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(circle_id, record_id) DO UPDATE SET
             generation = excluded.generation, vector = excluded.vector, updated_at = excluded.updated_at,
             device_id = excluded.device_id, cipher = excluded.cipher, size = excluded.size`,
          mine.circleId,
          incoming.id,
          mine.generation,
          JSON.stringify(incoming.vector),
          incoming.updatedAt,
          incoming.deviceId,
          incoming.cipher,
          incoming.cipher.length,
        );
      }
      return { ok: true as const, rejected, generation: mine.generation };
    },
    async pull(sub: string, since: string | null) {
      const mine = await this.membership(sub);
      if (!mine) return { error: "forbidden" as const };
      const rows = await db.all<RecordSql>(
        since
          ? "SELECT record_id, generation, vector, updated_at, device_id, cipher, size FROM records WHERE circle_id = ? AND updated_at > ? ORDER BY updated_at"
          : "SELECT record_id, generation, vector, updated_at, device_id, cipher, size FROM records WHERE circle_id = ? ORDER BY updated_at",
        ...(since ? [mine.circleId, since] : [mine.circleId]),
      );
      return {
        generation: mine.generation,
        members: mine.members,
        records: rows.map((row) => ({
          id: row.record_id,
          vector: JSON.parse(row.vector) as Record<string, number>,
          updatedAt: row.updated_at,
          deviceId: row.device_id,
          generation: row.generation,
          cipher: row.cipher,
          size: row.size,
        })),
      };
    },
    async deleteAccount(sub: string) {
      const memberships = await db.all<MemberSql>(
        "SELECT id, circle_id, line_sub, display_name, role, removed_at FROM members WHERE line_sub = ?",
        sub,
      );
      for (const membership of memberships) {
        const active = await db.all<MemberSql>(
          "SELECT id, circle_id, line_sub, display_name, role, removed_at FROM members WHERE circle_id = ? AND removed_at IS NULL",
          membership.circle_id,
        );
        const alive = active.filter((item) => item.line_sub !== sub);
        if (alive.length === 0) {
          await db.exec("DELETE FROM records WHERE circle_id = ?", membership.circle_id);
          await db.exec("DELETE FROM members WHERE circle_id = ?", membership.circle_id);
          await db.exec("DELETE FROM circles WHERE id = ?", membership.circle_id);
          continue;
        }
        await db.exec("DELETE FROM members WHERE id = ?", membership.id);
        if (membership.role === "owner") {
          const next = alive.find((item) => item.role === "family") || alive[0];
          await db.exec("UPDATE members SET role = 'owner' WHERE id = ?", next.id);
          await db.exec("UPDATE circles SET owner_sub = ? WHERE id = ?", next.line_sub, membership.circle_id);
        }
      }
      await db.exec("DELETE FROM users WHERE line_sub = ?", sub);
    },
  };
}

export type CircleStore = ReturnType<typeof d1Store>;

type Memory = {
  users: { sub: string; name: string }[];
  circles: CircleRow[];
  members: Member[];
  records: (Envelope & { circleId: string })[];
};

/** In-memory store used by tests. The SQL shape is covered by d1Store. */
export function memoryStore(): CircleStore {
  const data: Memory = { users: [], circles: [], members: [], records: [] };
  const store = {
    async upsertUser(sub: string, name: string) {
      const found = data.users.find((user) => user.sub === sub);
      if (found) found.name = name;
      else data.users.push({ sub, name });
    },
    async createCircle(input: { circleId: string; ownerSub: string; ownerName: string; memberId: string; now: string }) {
      const existing = data.circles.find((circle) => circle.id === input.circleId);
      if (existing) {
        const mine = data.members.find((member) => member.circleId === input.circleId && member.lineSub === input.ownerSub);
        if (!mine || mine.removedAt) return { error: "exists" as const };
        return { circleId: existing.id, memberId: mine.id, generation: existing.generation, role: mine.role };
      }
      data.circles.push({ id: input.circleId, ownerSub: input.ownerSub, generation: 1, createdAt: input.now });
      data.members.push({
        id: input.memberId,
        circleId: input.circleId,
        lineSub: input.ownerSub,
        name: input.ownerName,
        role: "owner",
        removedAt: null,
      });
      return { circleId: input.circleId, memberId: input.memberId, generation: 1, role: "owner" as const };
    },
    async join(input: { circleId: string; sub: string; name: string; memberId: string; role: "family" | "caregiver"; now: string }) {
      const circle = data.circles.find((item) => item.id === input.circleId);
      if (!circle) return { error: "missing" as const };
      const existing = data.members.find((member) => member.circleId === input.circleId && member.lineSub === input.sub);
      if (existing?.removedAt) return { error: "removed" as const };
      if (existing) return { circleId: circle.id, memberId: existing.id, generation: circle.generation, role: existing.role };
      data.members.push({
        id: input.memberId,
        circleId: input.circleId,
        lineSub: input.sub,
        name: input.name,
        role: input.role,
        removedAt: null,
      });
      return { circleId: circle.id, memberId: input.memberId, generation: circle.generation, role: input.role };
    },
    async membership(sub: string) {
      const mine = [...data.members].reverse().find((member) => member.lineSub === sub && !member.removedAt);
      if (!mine) return null;
      const circle = data.circles.find((item) => item.id === mine.circleId);
      if (!circle) return null;
      return {
        circleId: circle.id,
        generation: circle.generation,
        role: mine.role,
        memberId: mine.id,
        members: data.members.filter((member) => member.circleId === circle.id),
      };
    },
    async removeMember(input: { actorSub: string; memberId: string; now: string }) {
      const target = data.members.find((member) => member.id === input.memberId);
      if (!target || target.removedAt) return { error: "missing" as const };
      const actor = data.members.find((member) => member.circleId === target.circleId && member.lineSub === input.actorSub && !member.removedAt);
      if (!actor || actor.role !== "owner" || actor.id === target.id) return { error: "forbidden" as const };
      const circle = data.circles.find((item) => item.id === target.circleId);
      if (!circle) return { error: "missing" as const };
      target.removedAt = input.now;
      circle.generation += 1;
      data.records = data.records.filter((record) => record.circleId !== circle.id);
      return { generation: circle.generation };
    },
    async push(input: { sub: string; generation: number; records: Envelope[] }) {
      const mine = await store.membership(input.sub);
      if (!mine) return { error: "forbidden" as const };
      if (mine.generation !== input.generation) return { error: "generation" as const, generation: mine.generation };
      const rejected: string[] = [];
      for (const incoming of input.records) {
        const index = data.records.findIndex((record) => record.circleId === mine.circleId && record.id === incoming.id);
        const existing = index >= 0 ? data.records[index] : null;
        if (decidePush(existing, { ...incoming, generation: mine.generation }) === "keep") {
          rejected.push(incoming.id);
          continue;
        }
        const next = { ...incoming, generation: mine.generation, circleId: mine.circleId, size: incoming.cipher.length };
        if (index >= 0) data.records[index] = next;
        else data.records.push(next);
      }
      return { ok: true as const, rejected, generation: mine.generation };
    },
    async pull(sub: string, since: string | null) {
      const mine = await store.membership(sub);
      if (!mine) return { error: "forbidden" as const };
      const records = data.records
        .filter((record) => record.circleId === mine.circleId && (!since || record.updatedAt > since))
        .map((record) => ({
          id: record.id,
          vector: record.vector,
          updatedAt: record.updatedAt,
          deviceId: record.deviceId,
          generation: record.generation,
          cipher: record.cipher,
          size: record.size,
        }));
      return { generation: mine.generation, members: mine.members, records };
    },
    async deleteAccount(sub: string) {
      const memberships = data.members.filter((member) => member.lineSub === sub);
      for (const membership of memberships) {
        const alive = data.members.filter((member) => member.circleId === membership.circleId && !member.removedAt && member.lineSub !== sub);
        if (alive.length === 0) {
          data.records = data.records.filter((record) => record.circleId !== membership.circleId);
          data.members = data.members.filter((member) => member.circleId !== membership.circleId);
          data.circles = data.circles.filter((circle) => circle.id !== membership.circleId);
          continue;
        }
        data.members = data.members.filter((member) => member.id !== membership.id);
        if (membership.role === "owner") {
          const next = alive.find((member) => member.role === "family") || alive[0];
          next.role = "owner";
          const circle = data.circles.find((item) => item.id === membership.circleId);
          if (circle) circle.ownerSub = next.lineSub;
        }
      }
      data.users = data.users.filter((user) => user.sub !== sub);
    },
  };
  return store;
}
