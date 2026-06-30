/**
 * routes/notes.js
 * ---------------
 * CRUD for incident investigation notes (audit trail).
 *
 * GET    /api/incidents/:id/notes           - list notes
 * POST   /api/incidents/:id/notes           - add a note
 * DELETE /api/incidents/:id/notes/:noteId   - delete a note
 */

const express = require("express");
// mergeParams lets us access :id from the parent router
const router  = express.Router({ mergeParams: true });

router.get("/", async (req, res) => {
  try {
    const [rows] = await req.db.execute(`
      SELECT n.id, n.note, n.created_at, s.name AS author_name
      FROM   incident_notes n
      LEFT JOIN staff s ON n.author_id = s.id
      WHERE  n.incident_id = ?
      ORDER BY n.created_at ASC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { note, author_id = null } = req.body;
  if (!note) return res.status(400).json({ error: "'note' text is required" });

  // Verify incident exists
  const [inc] = await req.db.execute("SELECT id FROM incidents WHERE id = ?", [req.params.id]);
  if (!inc.length) return res.status(404).json({ error: "Incident not found" });

  try {
    const [result] = await req.db.execute(
      "INSERT INTO incident_notes (incident_id, author_id, note) VALUES (?, ?, ?)",
      [req.params.id, author_id, note]
    );
    const [rows] = await req.db.execute(`
      SELECT n.id, n.note, n.created_at, s.name AS author_name
      FROM   incident_notes n
      LEFT JOIN staff s ON n.author_id = s.id
      WHERE  n.id = ?
    `, [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:noteId", async (req, res) => {
  try {
    const [rows] = await req.db.execute(
      "SELECT id FROM incident_notes WHERE id = ? AND incident_id = ?",
      [req.params.noteId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Note not found" });

    await req.db.execute("DELETE FROM incident_notes WHERE id = ?", [req.params.noteId]);
    res.json({ message: `Note ${req.params.noteId} deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
