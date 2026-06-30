/**
 * routes/staff.js
 * ---------------
 * CRUD endpoints for the staff table.
 *
 * GET    /api/staff          - list all staff
 * POST   /api/staff          - create a staff member
 * GET    /api/staff/:id      - get one staff member
 * PUT    /api/staff/:id      - update a staff member
 * DELETE /api/staff/:id      - delete a staff member
 */

const express = require("express");
const router  = express.Router();

const VALID_ROLES = ["analyst", "manager"];

/**
 * GET /api/staff
 * Returns all staff members ordered by name.
 */
router.get("/", async (req, res) => {
  try {
    const [rows] = await req.db.execute("SELECT * FROM staff ORDER BY name");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/staff/:id
 * Returns a single staff member by ID.
 */
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await req.db.execute("SELECT * FROM staff WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Staff member not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/staff
 * Create a new staff member.
 * Required: name, email
 * Optional: role (default: analyst)
 */
router.post("/", async (req, res) => {
  const { name, email, role = "analyst" } = req.body;

  if (!name)  return res.status(400).json({ error: "'name' is required" });
  if (!email) return res.status(400).json({ error: "'email' is required" });
  if (!VALID_ROLES.includes(role))
    return res.status(400).json({ error: `role must be one of ${VALID_ROLES}` });

  try {
    const [result] = await req.db.execute(
      "INSERT INTO staff (name, role, email) VALUES (?, ?, ?)",
      [name, role, email]
    );
    const [rows] = await req.db.execute("SELECT * FROM staff WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    // ER_DUP_ENTRY = duplicate email
    const status = err.code === "ER_DUP_ENTRY" ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * PUT /api/staff/:id
 * Update an existing staff member. Only provided fields are changed.
 */
router.put("/:id", async (req, res) => {
  try {
    const [rows] = await req.db.execute("SELECT * FROM staff WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Staff member not found" });

    const existing = rows[0];
    const name  = req.body.name  ?? existing.name;
    const role  = req.body.role  ?? existing.role;
    const email = req.body.email ?? existing.email;

    if (!VALID_ROLES.includes(role))
      return res.status(400).json({ error: `role must be one of ${VALID_ROLES}` });

    await req.db.execute(
      "UPDATE staff SET name=?, role=?, email=? WHERE id=?",
      [name, role, email, req.params.id]
    );
    const [updated] = await req.db.execute("SELECT * FROM staff WHERE id = ?", [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/staff/:id
 * Remove a staff member. Assigned incidents become assigned_to = NULL via FK.
 */
router.delete("/:id", async (req, res) => {
  try {
    const [rows] = await req.db.execute("SELECT id FROM staff WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Staff member not found" });

    await req.db.execute("DELETE FROM staff WHERE id = ?", [req.params.id]);
    res.json({ message: `Staff member ${req.params.id} deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
