/**
 * routes/assets.js
 * ----------------
 * CRUD endpoints for the assets table.
 *
 * GET    /api/assets         - list all assets
 * POST   /api/assets         - register an asset
 * GET    /api/assets/:id     - get one asset
 * PUT    /api/assets/:id     - update an asset
 * DELETE /api/assets/:id     - delete an asset
 */

const express = require("express");
const router  = express.Router();

const VALID_TYPES = ["web", "server", "network", "application"];

router.get("/", async (req, res) => {
  try {
    const [rows] = await req.db.execute("SELECT * FROM assets ORDER BY name");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await req.db.execute("SELECT * FROM assets WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Asset not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { name, url = null, type = "web", owner = null } = req.body;

  if (!name) return res.status(400).json({ error: "'name' is required" });
  if (!VALID_TYPES.includes(type))
    return res.status(400).json({ error: `type must be one of ${VALID_TYPES}` });

  try {
    const [result] = await req.db.execute(
      "INSERT INTO assets (name, url, type, owner) VALUES (?, ?, ?, ?)",
      [name, url, type, owner]
    );
    const [rows] = await req.db.execute("SELECT * FROM assets WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const [rows] = await req.db.execute("SELECT * FROM assets WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Asset not found" });

    const existing  = rows[0];
    const name      = req.body.name  ?? existing.name;
    const url       = req.body.url   ?? existing.url;
    const type      = req.body.type  ?? existing.type;
    const owner     = req.body.owner ?? existing.owner;

    if (!VALID_TYPES.includes(type))
      return res.status(400).json({ error: `type must be one of ${VALID_TYPES}` });

    await req.db.execute(
      "UPDATE assets SET name=?, url=?, type=?, owner=? WHERE id=?",
      [name, url, type, owner, req.params.id]
    );
    const [updated] = await req.db.execute("SELECT * FROM assets WHERE id = ?", [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [rows] = await req.db.execute("SELECT id FROM assets WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Asset not found" });

    await req.db.execute("DELETE FROM assets WHERE id = ?", [req.params.id]);
    res.json({ message: `Asset ${req.params.id} deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
