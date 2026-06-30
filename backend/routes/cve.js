/**
 * routes/cve.js
 * -------------
 * Queries the NIST NVD API v2 for CVE details.
 * No API key required for basic usage.
 *
 * GET /api/cve/:cveId   - look up a CVE and return summary
 */

const express = require("express");
const axios   = require("axios");
const router  = express.Router();

const NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";

// Map NVD severity strings to our system's allowed values
const SEVERITY_MAP = {
  critical: "critical", high: "high",
  medium:   "medium",   low:  "low",
  none:     "low",      unknown: "medium",
};

router.get("/:cveId", async (req, res) => {
  const cveId = req.params.cveId.toUpperCase().trim();

  try {
    const { data } = await axios.get(NVD_API_URL, {
      params:  { cveId },
      timeout: 10000,
      headers: { "User-Agent": "SOC-Incident-Log-JS/1.0" },
    });

    if (!data.totalResults || !data.vulnerabilities?.length) {
      return res.status(404).json({ error: `CVE '${cveId}' not found in NVD database` });
    }

    const vuln = data.vulnerabilities[0].cve;

    // English description
    const description =
      vuln.descriptions?.find(d => d.lang === "en")?.value || "No description available.";

    // CVSS score (prefer v3.1 → v3.0 → v2)
    let cvss_score = null;
    let severity   = "unknown";
    const metrics  = vuln.metrics || {};

    if (metrics.cvssMetricV31?.length) {
      cvss_score = metrics.cvssMetricV31[0].cvssData.baseScore;
      severity   = (metrics.cvssMetricV31[0].cvssData.baseSeverity || "").toLowerCase();
    } else if (metrics.cvssMetricV30?.length) {
      cvss_score = metrics.cvssMetricV30[0].cvssData.baseScore;
      severity   = (metrics.cvssMetricV30[0].cvssData.baseSeverity || "").toLowerCase();
    } else if (metrics.cvssMetricV2?.length) {
      cvss_score = metrics.cvssMetricV2[0].cvssData.baseScore;
      severity   = (metrics.cvssMetricV2[0].baseSeverity || "").toLowerCase();
    }

    res.json({
      cve_id:      vuln.id,
      description,
      cvss_score,
      severity:    SEVERITY_MAP[severity] || "medium",
      published:   vuln.published,
      modified:    vuln.lastModified,
      references:  (vuln.references || []).slice(0, 5).map(r => r.url),
    });

  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: `CVE '${cveId}' not found` });
    }
    res.status(502).json({ error: `NVD API error: ${err.message}` });
  }
});

module.exports = router;
