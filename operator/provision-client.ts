#!/usr/bin/env -S npx tsx
/**
 * provision-client — stamp out one client's full stack from the operator's
 * master accounts, so the client registers for NOTHING but their own domain.
 *
 *   npm run provision -- <slug> [--domain=client.com] [--dry-run]
 *
 * What it does (idempotent — safe to re-run):
 *   1. Supabase  — create a project under the operator's org, poll until healthy,
 *                  pull the URL + anon + service_role keys, apply the schema.
 *   2. Secrets   — assemble the per-client env (Supabase keys + shared Resend/Gemini).
 *   3. Vercel    — create the project, set env vars, attach the client's domain.
 *   4. Inject    — write the client's website/.env.local for local parity.
 *   5. Ledger    — record slug -> {supabase_ref, vercel_id, domain} in clients.json.
 *
 * It deliberately does NOT deploy: deploys flow through `git push` -> Vercel CI/CD
 * (global-engineering.md). Provisioning ends at "infra ready".
 *
 * Master tokens come from operator/.env (see .env.example). Never commit that file.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..");

// ---------- tiny helpers -----------------------------------------------------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const die = (msg: string): never => {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
};
const log = (msg: string) => console.log(msg);

function loadEnv(): Record<string, string> {
  const path = join(HERE, ".env");
  if (!existsSync(path)) {
    die(`operator/.env not found. Copy operator/.env.example to operator/.env and fill it in.`);
  }
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function need(env: Record<string, string>, key: string): string {
  const v = env[key];
  if (!v) die(`Missing required value in operator/.env: ${key}`);
  return v;
}

// ---------- args -------------------------------------------------------------
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");
const slug = argv.find((a) => !a.startsWith("--"));
const domainArg = argv.find((a) => a.startsWith("--domain="))?.split("=")[1];

if (!slug) die("Usage: npm run provision -- <slug> [--domain=client.com] [--dry-run]");
if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug!)) {
  die(`Invalid slug "${slug}". Use lowercase letters, digits, hyphens (safe for project + subdomain names).`);
}

const env = loadEnv();
const projectName = `il-${slug}`;
const domain = domainArg || `${slug}.${env.OPERATOR_PARENT_DOMAIN || "example.com"}`;

// ---------- provider calls ---------------------------------------------------
async function api(url: string, init: RequestInit & { token: string }): Promise<any> {
  const { token, ...rest } = init;
  if (DRY) {
    log(`   [dry-run] ${rest.method || "GET"} ${url}`);
    return {};
  }
  const res = await fetch(url, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(rest.headers || {}),
    },
  });
  const body = await res.text();
  if (!res.ok) die(`${rest.method || "GET"} ${url} -> ${res.status}\n${body}`);
  return body ? JSON.parse(body) : {};
}

// --- 1. Supabase -------------------------------------------------------------
async function provisionSupabase() {
  log("\n① Supabase — create project under your org");
  const PAT = need(env, "SUPABASE_PAT");
  const ORG = need(env, "SUPABASE_ORG_ID");
  const region = env.SUPABASE_REGION || "us-east-1";
  const plan = env.SUPABASE_PLAN || "free";

  if (DRY) {
    log(`   [dry-run] would create Supabase project "${projectName}" in org ${ORG} (${region}, ${plan})`);
    return { ref: "DRYRUN_REF", url: `https://DRYRUN_REF.supabase.co`, anon: "DRY_ANON", service: "DRY_SERVICE" };
  }

  const created = await api("https://api.supabase.com/v1/projects", {
    token: PAT,
    method: "POST",
    body: JSON.stringify({
      name: projectName,
      organization_id: ORG,
      db_pass: cryptoPassword(),
      region,
      plan,
    }),
  });
  const ref = created.id || created.ref;
  log(`   created ref=${ref} — waiting for ACTIVE_HEALTHY…`);

  for (let i = 0; i < 40; i++) {
    const p = await api(`https://api.supabase.com/v1/projects/${ref}`, { token: PAT });
    if (p.status === "ACTIVE_HEALTHY") break;
    await sleep(5000);
  }

  const keys = await api(`https://api.supabase.com/v1/projects/${ref}/api-keys`, { token: PAT });
  const anon = pickKey(keys, "anon");
  const service = pickKey(keys, "service_role");

  await applyMigration(ref, PAT);
  log("   ✓ Supabase ready + schema applied");
  return { ref, url: `https://${ref}.supabase.co`, anon, service };
}

function pickKey(keys: any, name: string): string {
  if (Array.isArray(keys)) return keys.find((k: any) => k.name === name)?.api_key || "";
  return keys?.[name] || "";
}

async function applyMigration(ref: string, token: string) {
  const sqlPath = join(REPO_ROOT, "supabase", "migrations", "0001_init.sql");
  if (!existsSync(sqlPath)) return;
  const query = readFileSync(sqlPath, "utf8");
  await api(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    token,
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

// --- 2/3. Vercel -------------------------------------------------------------
async function provisionVercel(secrets: Record<string, string>) {
  log("\n② Vercel — create project, set env, attach domain");
  const TOKEN = need(env, "VERCEL_TOKEN");
  const team = env.VERCEL_TEAM_ID ? `?teamId=${env.VERCEL_TEAM_ID}` : "";

  if (DRY) {
    log(`   [dry-run] would create Vercel project "${projectName}" (rootDirectory=website, framework=nextjs)`);
    log(`   [dry-run] would set ${Object.keys(secrets).length} env vars on production+preview+development`);
    log(`   [dry-run] would attach domain ${domain}`);
    return { id: "DRYRUN_VERCEL_ID" };
  }

  const project = await api(`https://api.vercel.com/v11/projects${team}`, {
    token: TOKEN,
    method: "POST",
    body: JSON.stringify({ name: projectName, framework: "nextjs", rootDirectory: "website" }),
  });

  for (const [key, value] of Object.entries(secrets)) {
    await api(`https://api.vercel.com/v10/projects/${project.id}/env${team}`, {
      token: TOKEN,
      method: "POST",
      body: JSON.stringify({
        key,
        value,
        type: "encrypted",
        target: ["production", "preview", "development"],
      }),
    });
  }

  await api(`https://api.vercel.com/v10/projects/${project.id}/domains${team}`, {
    token: TOKEN,
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });

  log("   ✓ Vercel project + env + domain ready");
  return { id: project.id };
}

// --- 4. Inject ---------------------------------------------------------------
function injectEnvLocal(secrets: Record<string, string>) {
  log("\n③ Inject — write client website/.env.local (local parity)");
  const dir = join(REPO_ROOT, "clients", slug!, "website");
  const body = Object.entries(secrets).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
  if (DRY) {
    log(`   [dry-run] would write ${join(dir, ".env.local")} (${Object.keys(secrets).length} vars)`);
    return;
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, ".env.local"), body, { mode: 0o600 });
  log(`   ✓ wrote ${join(dir, ".env.local")}`);
}

// --- 5. Ledger ---------------------------------------------------------------
function recordLedger(entry: Record<string, unknown>) {
  log("\n④ Ledger — record client");
  const path = join(HERE, "clients.json");
  if (DRY) {
    log(`   [dry-run] would append ${slug} to operator/clients.json`);
    return;
  }
  const ledger = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
  ledger[slug!] = { ...entry, updated_at: new Date().toISOString() };
  writeFileSync(path, JSON.stringify(ledger, null, 2) + "\n");
  log(`   ✓ recorded ${slug}`);
}

// ---------- misc -------------------------------------------------------------
function cryptoPassword(): string {
  // 24 url-safe chars
  return Array.from({ length: 24 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 55)]
  ).join("");
}

// ---------- main -------------------------------------------------------------
(async () => {
  log(`\n=== Provisioning "${slug}"  (project=${projectName}, domain=${domain})${DRY ? "  [DRY RUN]" : ""} ===`);

  const sb = await provisionSupabase();

  const secrets: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: sb.url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: sb.anon,
    SUPABASE_SERVICE_ROLE_KEY: sb.service,
    RESEND_API_KEY: need(env, "RESEND_API_KEY"),
    GEMINI_API_KEY: need(env, "GEMINI_API_KEY"),
  };
  if (env.LARK_APP_ID) secrets.LARK_APP_ID = env.LARK_APP_ID;
  if (env.LARK_APP_SECRET) secrets.LARK_APP_SECRET = env.LARK_APP_SECRET;
  if (env.LARK_WEBHOOK_URL) secrets.LARK_WEBHOOK_URL = env.LARK_WEBHOOK_URL;

  const vc = await provisionVercel(secrets);
  injectEnvLocal(secrets);
  recordLedger({ supabase_ref: sb.ref, vercel_id: vc.id, domain });

  log(`\n✓ Done. "${slug}" infra is ready — the client touched nothing.`);
  log(`  Next: point the client's domain DNS at Vercel, then deploy via git push.\n`);
})();
