import {
  sql,
  newId,
  readJson,
  handleOptions,
  limitWrite,
} from "../lib/server.js";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  try {
    if (req.method !== "GET") {
      if (!(await limitWrite(res))) return;
    }

    const db = sql();

    if (req.method === "GET") {
      const rows = await db`
        select id, name, c100, portion
        from foods
        order by name asc
      `;
      res.status(200).json(rows);
      return;
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const name = String(body.name || "").trim().toLowerCase();
      const c100 = Number(body.c100);
      const portion =
        body.portion === "" || body.portion == null ? null : Number(body.portion);

      if (!name || Number.isNaN(c100)) {
        res.status(400).json({ error: "name and c100 are required" });
        return;
      }

      const id = body.id || newId();
      const rows = await db`
        insert into foods (id, name, c100, portion)
        values (${id}, ${name}, ${c100}, ${portion})
        returning id, name, c100, portion
      `;
      res.status(201).json(rows[0]);
      return;
    }

    if (req.method === "PUT") {
      const body = await readJson(req);
      const id = body.id || req.query.id;
      if (!id) {
        res.status(400).json({ error: "id is required" });
        return;
      }
      const name = String(body.name || "").trim().toLowerCase();
      const c100 = Number(body.c100);
      const portion =
        body.portion === "" || body.portion == null ? null : Number(body.portion);

      const rows = await db`
        update foods
        set name = ${name}, c100 = ${c100}, portion = ${portion}
        where id = ${id}
        returning id, name, c100, portion
      `;
      if (!rows.length) {
        res.status(404).json({ error: "not found" });
        return;
      }
      res.status(200).json(rows[0]);
      return;
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      if (!id) {
        res.status(400).json({ error: "id is required" });
        return;
      }
      const rows = await db`
        delete from foods where id = ${id} returning id
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
    const message = String(err && err.message ? err.message : err);
    const status = /unique|duplicate/i.test(message) ? 409 : 500;
    res.status(status).json({ error: message });
  }
}
