import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { paths } from "@/lib/config";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS devices (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS rooms (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  pin_hash    TEXT,
  created_by  TEXT NOT NULL REFERENCES devices(id),
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER,
  max_bytes   INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE IF NOT EXISTS room_members (
  room_id      TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  device_id    TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  joined_at    INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  PRIMARY KEY (room_id, device_id)
) STRICT;

CREATE TABLE IF NOT EXISTS items (
  id          TEXT PRIMARY KEY,
  room_id     TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('text', 'url', 'file')),
  content     TEXT,
  title       TEXT,
  file_name   TEXT,
  file_size   INTEGER,
  mime_type   TEXT,
  created_by  TEXT NOT NULL REFERENCES devices(id),
  created_at  INTEGER NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_items_room_created
  ON items (room_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_room_members_device
  ON room_members (device_id);
`;

interface DbGlobal {
  __networdDb?: DatabaseSync;
  __networdStmts?: Map<string, StatementSync>;
}

const globalStore = globalThis as unknown as DbGlobal;

export function getDb(): DatabaseSync {
  if (globalStore.__networdDb) return globalStore.__networdDb;

  fs.mkdirSync(path.dirname(paths.db), { recursive: true });
  const db = new DatabaseSync(paths.db, {
    enableForeignKeyConstraints: true,
    timeout: 5_000,
  });

  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA temp_store = MEMORY;");
  db.exec(SCHEMA);

  globalStore.__networdDb = db;
  return db;
}

/** Cached prepared statement accessor. */
export function stmt(sql: string): StatementSync {
  getDb();
  const cache = (globalStore.__networdStmts ??= new Map());
  let statement = cache.get(sql);
  if (!statement) {
    statement = getDb().prepare(sql);
    cache.set(sql, statement);
  }
  return statement;
}

export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // ignore rollback failure
    }
    throw error;
  }
}

export function closeDb(): void {
  const db = globalStore.__networdDb;
  if (db) {
    db.close();
    globalStore.__networdDb = undefined;
    globalStore.__networdStmts = undefined;
  }
}

export interface DeviceRow {
  id: string;
  name: string;
  created_at: number;
  last_seen_at: number;
}

export interface RoomRow {
  id: string;
  code: string;
  name: string;
  pin_hash: string | null;
  created_by: string;
  created_at: number;
  expires_at: number | null;
  max_bytes: number;
}

export interface MemberRow {
  room_id: string;
  device_id: string;
  joined_at: number;
  last_seen_at: number;
  name: string;
}

export interface ItemRow {
  id: string;
  room_id: string;
  kind: "text" | "url" | "file";
  content: string | null;
  title: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_by: string;
  created_at: number;
  author_name: string;
}
