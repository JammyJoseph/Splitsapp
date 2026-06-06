#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Tracklock — Supabase provisioner
//
// Creates (or reuses) a Supabase project via the Management API, waits until
// it is healthy, fetches its API keys, and runs every migration + the seed.
//
// Usage:
//   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/setup-supabase.mjs
//
// Optional env:
//   SUPABASE_PROJECT_REF   reuse an existing project instead of creating one
//   SUPABASE_ORG_ID        organisation to create the project in (else: first)
//   SUPABASE_REGION        default: eu-west-2 (London)
//   SUPABASE_PROJECT_NAME  default: tracklock
//   SUPABASE_DB_PASSWORD   default: randomly generated
//
// Writes anon/service keys + URL to .env.local (gitignored). Does NOT print
// the service-role key to stdout.
// ---------------------------------------------------------------------------

import { readFile, writeFile, readdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

const API = "https://api.supabase.com/v1";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) {
  console.error("✖ SUPABASE_ACCESS_TOKEN is required (a personal access token, sbp_...).");
  process.exit(1);
}

const REGION = process.env.SUPABASE_REGION || "eu-west-2";
const PROJECT_NAME = process.env.SUPABASE_PROJECT_NAME || "tracklock";
const DB_PASSWORD =
  process.env.SUPABASE_DB_PASSWORD || randomBytes(18).toString("base64url");

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function api(method, pathname, body) {
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new Error(
      `${method} ${pathname} → ${res.status}: ${typeof json === "string" ? json : JSON.stringify(json)}`,
    );
  }
  return json;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getOrCreateProject() {
  if (process.env.SUPABASE_PROJECT_REF) {
    const ref = process.env.SUPABASE_PROJECT_REF;
    console.log(`• Reusing existing project ref: ${ref}`);
    const projects = await api("GET", "/projects");
    const found = projects.find((p) => p.id === ref);
    if (!found) throw new Error(`Project ref ${ref} not found for this token.`);
    return found;
  }

  let orgId = process.env.SUPABASE_ORG_ID;
  if (!orgId) {
    const orgs = await api("GET", "/organizations");
    if (!orgs.length) throw new Error("No organisations found for this token.");
    orgId = orgs[0].id;
    console.log(`• Using organisation: ${orgs[0].name} (${orgId})`);
  }

  // Reuse a same-named project if it already exists.
  const existing = (await api("GET", "/projects")).find(
    (p) => p.name === PROJECT_NAME && p.organization_id === orgId,
  );
  if (existing) {
    console.log(`• Found existing project "${PROJECT_NAME}" (${existing.id})`);
    return existing;
  }

  console.log(`• Creating project "${PROJECT_NAME}" in ${REGION}…`);
  return api("POST", "/projects", {
    name: PROJECT_NAME,
    organization_id: orgId,
    region: REGION,
    db_pass: DB_PASSWORD,
  });
}

async function waitHealthy(ref) {
  process.stdout.write("• Waiting for the project to come online");
  for (let i = 0; i < 60; i++) {
    try {
      const p = await api("GET", `/projects/${ref}`);
      if (p.status === "ACTIVE_HEALTHY") {
        process.stdout.write(" ready.\n");
        return;
      }
    } catch {
      /* transient while provisioning */
    }
    process.stdout.write(".");
    await sleep(5000);
  }
  process.stdout.write("\n");
  throw new Error("Timed out waiting for the project to become healthy.");
}

async function runSql(ref, query) {
  return api("POST", `/projects/${ref}/database/query`, { query });
}

async function main() {
  const project = await getOrCreateProject();
  const ref = project.id;
  await waitHealthy(ref);

  // API keys
  const keys = await api("GET", `/projects/${ref}/api-keys`);
  const anon = keys.find((k) => k.name === "anon")?.api_key;
  const service = keys.find((k) => k.name === "service_role")?.api_key;
  if (!anon || !service) throw new Error("Could not read project API keys.");
  const url = `https://${ref}.supabase.co`;

  // Apply migrations + seed in order.
  const migDir = path.join(process.cwd(), "supabase", "migrations");
  const files = (await readdir(migDir)).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    console.log(`• Applying migration ${f}…`);
    await runSql(ref, await readFile(path.join(migDir, f), "utf8"));
  }
  console.log("• Applying seed.sql…");
  await runSql(ref, await readFile(path.join(process.cwd(), "supabase", "seed.sql"), "utf8"));

  // Write .env.local (gitignored).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const env = [
    `NEXT_PUBLIC_SUPABASE_URL=${url}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}`,
    `SUPABASE_SERVICE_ROLE_KEY=${service}`,
    `NEXT_PUBLIC_APP_URL=${appUrl}`,
    `RESEND_API_KEY=${process.env.RESEND_API_KEY || ""}`,
    `EMAIL_FROM=${process.env.EMAIL_FROM || "Tracklock <onboarding@resend.dev>"}`,
    `TRACKLOCK_ADMIN_EMAILS=${process.env.TRACKLOCK_ADMIN_EMAILS || ""}`,
    "",
  ].join("\n");
  await writeFile(path.join(process.cwd(), ".env.local"), env);

  console.log("\n✔ Supabase ready.");
  console.log(`  Project ref : ${ref}`);
  console.log(`  Project URL : ${url}`);
  console.log(`  Anon key    : ${anon}`);
  console.log("  Service-role key written to .env.local (not printed).");
  console.log(`  DB password : ${DB_PASSWORD}  (store this somewhere safe)`);
}

main().catch((err) => {
  console.error("\n✖ Setup failed:", err.message);
  process.exit(1);
});
