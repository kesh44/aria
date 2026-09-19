import {
  sql,
  requireAuth,
  newId,
  readJson,
  handleOptions,
  iso,
} from "../lib/server.js";

function mapRow(row) {
  return {
    id: row.id,
    t: iso(row.t),
    food: row.food || "",
    c100: row.c100,
    g: row.g,
    carbs: row.carbs,
    icr: row.icr,
    u: row.u,
    note: row.note || "",
  };
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (!requireAuth(req, res)) return;

  try {
    const db = sql();

    if (req.method === "GET") {
      const rows = await db`
        select id, t, food, c100, g, carbs, icr, u, note
        from calc_log
        order by t desc
      `;
      res.status(200).json(rows.map(mapRow));
      return;
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const id = body.id || newId();
      const t = iso(body.t) || new Date().toISOString();
      const food = String(body.food || "").trim().toLowerCase();
      const c100 = Number(body.c100);
      const g = Number(body.g);
      const carbs = Number(body.carbs);
      const icr = Number(body.icr);
      const u = Number(body.u);
      const note = String(body.note || "").trim().toLowerCase();

      const rows = await db`
        insert into calc_log (id, t, food, c100, g, carbs, icr, u, note)
        values (${id}, ${t}, ${food}, ${c100}, ${g}, ${carbs}, ${icr}, ${u}, ${note})
        returning id, t, food, c100, g, carbs, icr, u, note
      `;
      res.status(201).json(mapRow(rows[0]));
      return;
    }

    if (req.method === "PUT") {
      const body = await readJson(req);
      const id = body.id || req.query.id;
      if (!id) {
        res.status(400).json({ error: "id is required" });
        return;
      }
      const t = iso(body.t) || new Date().toISOString();
      const food = String(body.food || "").trim().toLowerCase();
      const c100 = Number(body.c100);
      const g = Number(body.g);
      const carbs = Number(body.carbs);
      const icr = Number(body.icr);
      const u = Number(body.u);
      const note = String(body.note || "").trim().toLowerCase();

      const rows = await db`
        update calc_log
        set t = ${t}, food = ${food}, c100 = ${c100}, g = ${g},
            carbs = ${carbs}, icr = ${icr}, u = ${u}, note = ${note}
        where id = ${id}
        returning id, t, food, c100, g, carbs, icr, u, note
      `;
      if (!rows.length) {
        res.status(404).json({ error: "not found" });
        return;
      }
      res.status(200).json(mapRow(rows[0]));
      return;
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      if (!id) {
        res.status(400).json({ error: "id is required" });
        return;
      }
      const rows = await db`
        delete from calc_log where id = ${id} returning id
      `;
      if (!rows.length) {
        res.status(404).json({ error: "not found" });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    res.status(500).json({
      error: String(err && err.message ? err.message : err),
    });
  }
}
