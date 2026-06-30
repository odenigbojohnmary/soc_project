/**
 * routes/dashboard.js
 * --------------------
 * Live summary stats for the dashboard tab.
 *
 * GET /api/dashboard
 * Returns: totals by status, breakdown by severity/type,
 *          average resolution time, and 5 most recent incidents.
 */

const express = require("express");
const router  = express.Router();

router.get("/", async (req, res) => {
  try {
    // Totals by status
    const [[totals]] = await req.db.execute(`
      SELECT
        COUNT(*)                         AS total,
        SUM(status = 'open')             AS open,
        SUM(status = 'investigating')    AS investigating,
        SUM(status = 'resolved')         AS resolved
      FROM incidents
    `);

    // Breakdown by severity
    const [bySeverity] = await req.db.execute(`
      SELECT severity, COUNT(*) AS count FROM incidents GROUP BY severity
    `);

    // Breakdown by type
    const [byType] = await req.db.execute(`
      SELECT type, COUNT(*) AS count FROM incidents GROUP BY type
    `);

    // Average resolution time in hours
    const [[avgRow]] = await req.db.execute(`
      SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) AS avg_hours
      FROM   incidents
      WHERE  status = 'resolved' AND resolved_at IS NOT NULL
    `);

    // 5 most recent incidents
    const [recent] = await req.db.execute(`
      SELECT i.id, i.title, i.type, i.severity, i.status, i.created_at,
             s.name AS assigned_name
      FROM   incidents i
      LEFT JOIN staff s ON i.assigned_to = s.id
      ORDER BY i.created_at DESC
      LIMIT 5
    `);

    res.json({
      totals: {
        total:         Number(totals.total),
        open:          Number(totals.open),
        investigating: Number(totals.investigating),
        resolved:      Number(totals.resolved),
      },
      by_severity:  Object.fromEntries(bySeverity.map(r => [r.severity, r.count])),
      by_type:      Object.fromEntries(byType.map(r => [r.type, r.count])),
      avg_resolution_hours: avgRow.avg_hours ? Number(avgRow.avg_hours).toFixed(1) : null,
      recent,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
