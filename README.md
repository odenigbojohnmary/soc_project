# SOC Incident Log — JavaScript Version

**A Security Operations Centre (SOC) Incident Management System**  
Built with Node.js, Express.js, MySQL, and Vanilla JavaScript.

---

## Table of Contents

1. [Overview](#overview)
2. [Organisation](#organisation)
3. [System Requirements](#system-requirements)
4. [Tech Stack](#tech-stack)
5. [Architecture](#architecture)
6. [Database Schema](#database-schema)
7. [Project Structure](#project-structure)
8. [Setup & Installation](#setup--installation)
9. [Running the Application](#running-the-application)
10. [API Endpoints](#api-endpoints)
11. [Features](#features)
12. [Running Tests](#running-tests)
13. [External Integrations](#external-integrations)
14. [Key Differences from Python Version](#key-differences-from-python-version)
15. [Attributions](#attributions)

---

## Overview

This is a proof-of-concept Information System for a small Security Operations Centre (SOC) team. It allows analysts and managers to log, track, assign, and resolve security incidents. The system integrates with the NIST National Vulnerability Database (NVD) for CVE lookups and with public status page APIs for live uptime monitoring.

The backend exposes a REST API. The frontend communicates exclusively through `fetch()` API calls — no page refreshes (as required by the assignment brief).

---

## Organisation

**SecureWatch SOC** — a small cybersecurity firm providing SOC-as-a-service to client companies. The team logs security incidents (breaches, alerts, outages, vulnerabilities), assigns them to analysts, and tracks them through to resolution.

---

## System Requirements

### Data Requirements

| Entity           | Description                                                  |
|------------------|--------------------------------------------------------------|
| Incidents        | Core entity — breaches, alerts, outages, vulnerabilities     |
| Staff            | SOC analysts and managers who are assigned to incidents      |
| Assets           | Monitored systems (web servers, databases, network devices)  |
| Incident Notes   | Timestamped investigation notes added by analysts            |
