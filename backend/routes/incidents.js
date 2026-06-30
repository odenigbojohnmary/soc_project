/**
 * routes/incidents.js
 * -------------------
 * CRUD + search + pagination + CSV export for incidents.
 *
 * GET    /api/incidents/export    - download CSV
 * GET    /api/incidents           - list (filter: ?status ?severity ?type ?q ?page ?limit)
 * POST   /api/incidents           - create
 * GET    /api/incidents/:id       - get one (with joins)
 * PUT    /api/incidents/:id       - update (auto-sets resolved_at)
 * DELETE /api/incidents/:id       - delete
 */

const express = require("express");
const router  = express.Router();

const VALID_TYPES      = ["breach", "alert", "outage", "vulnerability"];
const VALID_SEVERITIES = ["critical", "high", "medium", "low"];
const VALID_STATUSES   = ["open", "investigating", "resolved"];

// ------------------------------------------------------------------
// CSV EXPORT  (must be defined before /:id to avoid route conflict)
// ------------------------------------------------------------------
router.get("/export", async (req, res) => {
  try {
    const [rows] = await req.db.execute(`
      SELECT i.id, i.title, i.type, i.severity, i.status,
             i.cve_id, i.cvss_score, i.description,
             a.name  AS asset,
             s.name  AS assigned_to,
             i.created_at, i.resolved_at
      FROM   incidents i
      LEFT JOIN assets a ON i.asset_id    = a.id
      LEFT JOIN staff  s ON i.assigned_to = s.id
      ORDER BY i.created_at DESC
    `);

    if (!rows.length) {
      return res.status(200)
        .header("Content-Type", "text/csv")
        .send("No incidents to export.");
    }

    const headers = Object.keys(rows[0]).join(",");
    const csvRows = rows.map(row =>
      Object.values(row).map(v =>
        v === null ? "" : `"${String(v).replace(/"/g, '""')}"`
      ).join(",")
    );

    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", "attachment; filename=incidents_export.csv");
    res.send([headers, ...csvRows].join("\n"));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// LIST with filter, keyword search, and pagination
// ------------------------------------------------------------------
router.get("/", async (req, res) => {
  const { status, severity, type: incType, q = "" } = req.query;
  const page  = Math.max(1, parseInt(req.query.page  || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20")));
  const offset = (page - 1) * limit;

  const filters = [];
  const params  = [];

  if (status)  { filters.push("i.status = ?");   params.push(status);  }
  if (severity){ filters.push("i.severity = ?");  params.push(severity);}
  if (incType) { filters.push("i.type = ?");      params.push(incType); }
  if (q.trim()){
    filters.push("(i.title LIKE ? OR i.description LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }

  const where = filters.length ? "WHERE " + filters.join(" AND ") : "";
  const base  = `
    FROM incidents i
    LEFT JOIN assets a ON i.asset_id    = a.id
    LEFT JOIN staff  s ON i.assigned_to = s.id
    ${where}
  `;

  try {
    const [[{ total }]] = await req.db.execute(
      `SELECT COUNT(*) AS total ${base}`, params
    );
    const [rows] = await req.db.execute(
      `SELECT i.*, a.name AS asset_name, s.name AS assigned_name ${base}
       ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      incidents: rows,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      limit,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// GET ONE
// ------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await req.db.execute(`
      SELECT i.*,
             a.name  AS asset_name,  a.url   AS asset_url,
             s.name  AS assigned_name, s.email AS assigned_email
      FROM   incidents i
      LEFT JOIN assets a ON i.asset_id    = a.id
      LEFT JOIN staff  s ON i.assigned_to = s.id
      WHERE  i.id = ?
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ error: "Incident not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// CREATE
// ------------------------------------------------------------------
router.post("/", async (req, res) => {
  const { title, type, severity, description = null,
          cve_id = null, cvss_score = null,
          asset_id = null, assigned_to = null } = req.body;

  if (!title)    return res.status(400).json({ error: "'title' is required" });
  if (!type)     return res.status(400).json({ error: "'type' is required" });
  if (!severity) return res.status(400).json({ error: "'severity' is required" });
  if (!VALID_TYPES.includes(type))
    return res.status(400).json({ error: `type must be one of ${VALID_TYPES}` });
  if (!VALID_SEVERITIES.includes(severity))
    return res.status(400).json({ error: `severity must be one of ${VALID_SEVERITIES}` });

  try {
    const [result] = await req.db.execute(`
      INSERT INTO incidents
        (title, type, severity, description, cve_id, cvss_score, asset_id, assigned_to)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [title, type, severity, description, cve_id, cvss_score, asset_id, assigned_to]);

    const [rows] = await req.db.execute("SELECT * FROM incidents WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// UPDATE
// ------------------------------------------------------------------
router.put("/:id", async (req, res) => {
  try {
    const [rows] = await req.db.execute("SELECT * FROM incidents WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Incident not found" });

    const ex = rows[0];  // existing record

    const title       = req.body.title       ?? ex.title;
    const type        = req.body.type        ?? ex.type;
    const severity    = req.body.severity    ?? ex.severity;
    const status      = req.body.status      ?? ex.status;
    const description = req.body.description ?? ex.description;
    const cve_id      = req.body.cve_id      ?? ex.cve_id;
    const cvss_score  = req.body.cvss_score  ?? ex.cvss_score;
    const asset_id    = req.body.asset_id    ?? ex.asset_id;
    const assigned_to = req.body.assigned_to ?? ex.assigned_to;

    if (!VALID_TYPES.includes(type))
      return res.status(400).json({ error: `type must be one of ${VALID_TYPES}` });
    if (!VALID_SEVERITIES.includes(severity))
      return res.status(400).json({ error: `severity must be one of ${VALID_SEVERITIES}` });
    if (!VALID_STATUSES.includes(status))
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES}` });

    // Auto-set resolved_at when status first becomes 'resolved'
    let resolved_at = ex.resolved_at;
    if (status === "resolved" && ex.status !== "resolved") {
      resolved_at = new Date().toISOString().slice(0, 19).replace("T", " ");
    }

    await req.db.execute(`
      UPDATE incidents
      SET title=?, type=?, severity=?, status=?, description=?,
          cve_id=?, cvss_score=?, asset_id=?, assigned_to=?, resolved_at=?
      WHERE id=?
    `, [title, type, severity, status, description,
        cve_id, cvss_score, asset_id, assigned_to, resolved_at, req.params.id]);

    const [updated] = await req.db.execute("SELECT * FROM incidents WHERE id = ?", [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------------
// DELETE
// ------------------------------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const [rows] = await req.db.execute("SELECT id FROM incidents WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Incident not found" });

    await req.db.execute("DELETE FROM incidents WHERE id = ?", [req.params.id]);
    res.json({ message: `Incident ${req.params.id} deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
