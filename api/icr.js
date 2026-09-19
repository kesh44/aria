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
    from: iso(row.from),
    icr: row.icr,
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
        select id, "from", icr, note
        from icr_history
        order by "from" desc
      `;
      res.status(200).json(rows.map(mapRow));
      return;
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const from = iso(body.from) || new Date().toISOString();
      const icr = Number(body.icr);
      const note = String(body.note || "").trim().toLowerCase();

      if (!(icr > 0)) {
        res.status(400).json({ error: "icr must be greater than 0" });
        return;
      }

      const id = body.id || newId();
      const rows = await db`
        insert into icr_history (id, "from", icr, note)
        values (${id}, ${from}, ${icr}, ${note})
        returning id, "from", icr, note
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
      const from = iso(body.from) || new Date().toISOString();
      const icr = Number(body.icr);
      const note = String(body.note || "").trim().toLowerCase();

      const rows = await db`
        update icr_history
        set "from" = ${from}, icr = ${icr}, note = ${note}
        where id = ${id}
        returning id, "from", icr, note
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
        delete from icr_history where id = ${id} returning id
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
