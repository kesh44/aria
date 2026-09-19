import { neon } from "@neondatabase/serverless";

export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return neon(url);
}

export function newId() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function readJson(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") {
      resolve(req.body);
      return;
    }
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

export function iso(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

export function allowCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export function handleOptions(req, res) {
  if (req.method === "OPTIONS") {
    allowCors(res);
    res.status(204).end();
    return true;
  }
  allowCors(res);
  return false;
}

/** Global write throttle: 1 POST/PUT/DELETE across the app every 5 seconds. Not unbypassable. */
export async function limitWrite(res) {
  const db = sql();
  await db`
    create table if not exists rate_limit (
      key text primary key,
      last_at timestamptz not null
    )
  `;
  const rows = await db`
    insert into rate_limit (key, last_at)
    values ('write', now())
    on conflict (key) do update
      set last_at = excluded.last_at
      where rate_limit.last_at <= now() - interval '5 seconds'
    returning key
  `;
  if (!rows.length) {
    res.status(429).json({
      error: "too many writes — wait 5 seconds between saves",
    });
    return false;
  }
  return true;
}
