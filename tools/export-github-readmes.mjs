#!/usr/bin/env node
/**
 * Exports README files for all repos under a GitHub username.
 *
 * Writes:
 * - exports/github-readmes/<repo>/README.md
 * - exports/github-readmes/ALL_READMES.md
 * - exports/github-readmes/index.json
 *
 * Usage:
 *   # Public repos only (no token required, lower rate limit):
 *   node tools/export-github-readmes.mjs
 *
 *   # Include private repos (recommended):
 *   GITHUB_TOKEN=... node tools/export-github-readmes.mjs
 *
 * Options:
 *   --user <name>          GitHub username (default: SidharthMahai)
 *   --out <dir>            Output dir (default: exports/github-readmes)
 *   --include-forks        Include forked repos
 *   --include-archived     Include archived repos
 *   --limit <n>            Max repos to process
 *   --no-combined          Skip ALL_READMES.md generation
 *   --dry-run              Only prints what it would do
 */

import fs from "node:fs";
import path from "node:path";

if (typeof fetch !== "function") {
  console.error("This script requires Node.js 18+ (global fetch).");
  process.exit(1);
}

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : null;
}

const user = getArgValue("--user") || process.env.GITHUB_USER || "SidharthMahai";
const outDir = getArgValue("--out") || "exports/github-readmes";
const includeForks = process.argv.includes("--include-forks");
const includeArchived = process.argv.includes("--include-archived");
const noCombined = process.argv.includes("--no-combined");
const dryRun = process.argv.includes("--dry-run");

const limitRaw = getArgValue("--limit");
const limit = limitRaw ? Number(limitRaw) : Infinity;
if (Number.isNaN(limit) || limit <= 0) {
  console.error("Invalid --limit value.");
  process.exit(1);
}

const apiBase = "https://api.github.com";
const token = process.env.GITHUB_TOKEN || "";

function headers(extra = {}) {
  const base = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
  if (token) base.Authorization = `Bearer ${token}`;
  return base;
}

async function ghJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: headers(options.headers || {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} for ${url}\n${text}`);
  }
  return res.json();
}

async function ghText(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: headers(options.headers || {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} for ${url}\n${text}`);
  }
  return res.text();
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeRepoDirName(name) {
  return String(name).replaceAll("/", "_");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listReposPublic() {
  const repos = [];
  let page = 1;
  while (repos.length < limit) {
    const url = `${apiBase}/users/${encodeURIComponent(
      user
    )}/repos?per_page=100&sort=updated&page=${page}`;
    const data = await ghJson(url);
    if (!Array.isArray(data) || data.length === 0) break;
    repos.push(...data);
    page += 1;
  }
  return repos.slice(0, limit);
}

async function listReposAuthed() {
  const repos = [];
  let page = 1;
  while (repos.length < limit) {
    const url = `${apiBase}/user/repos?per_page=100&sort=updated&page=${page}&affiliation=owner`;
    const data = await ghJson(url);
    if (!Array.isArray(data) || data.length === 0) break;
    repos.push(...data);
    page += 1;
  }
  return repos
    .filter((repo) => repo?.owner?.login === user)
    .slice(0, limit);
}

async function listRepos() {
  return token ? listReposAuthed() : listReposPublic();
}

async function fetchReadmeMarkdown(repo) {
  const owner = repo?.owner?.login || user;
  const endpoint = `${apiBase}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo.name
  )}/readme`;
  return ghText(endpoint, { headers: { Accept: "application/vnd.github.raw" } });
}

function repoIncluded(repo) {
  if (!includeForks && repo.fork) return false;
  if (!includeArchived && repo.archived) return false;
  return true;
}

function buildCombined(readmes) {
  const parts = [];
  parts.push(`# GitHub READMEs: ${user}`);
  parts.push("");
  parts.push(`Generated: ${new Date().toISOString()}`);
  parts.push("");
  for (const item of readmes) {
    parts.push(`---`);
    parts.push("");
    parts.push(`## ${item.fullName}`);
    parts.push("");
    parts.push(item.readme ? item.readme.trimEnd() : "_(no README found)_");
    parts.push("");
  }
  return parts.join("\n");
}

async function run() {
  const repos = (await listRepos()).filter(repoIncluded);
  console.log(`Found ${repos.length} repos for ${user}${token ? " (token)" : " (public only)"}.\n`);

  if (!dryRun) ensureDir(outDir);
  const repoRoot = path.resolve(outDir);
  const index = [];
  const readmesForCombined = [];

  for (const repo of repos) {
    const fullName = `${repo.owner?.login || user}/${repo.name}`;
    const repoDir = path.join(repoRoot, safeRepoDirName(repo.name));
    const readmePath = path.join(repoDir, "README.md");

    if (dryRun) {
      console.log(`[dry-run] ${fullName} -> ${path.relative(process.cwd(), readmePath)}`);
      continue;
    }

    ensureDir(repoDir);

    let readme = "";
    let ok = true;
    try {
      readme = await fetchReadmeMarkdown(repo);
      fs.writeFileSync(readmePath, readme, "utf8");
      console.log(`${fullName}: saved README`);
    } catch (error) {
      ok = false;
      fs.writeFileSync(readmePath, "", "utf8");
      console.log(`${fullName}: no README (or fetch failed)`);
    }

    index.push({
      name: repo.name,
      fullName,
      htmlUrl: repo.html_url,
      private: Boolean(repo.private),
      fork: Boolean(repo.fork),
      archived: Boolean(repo.archived),
      language: repo.language || null,
      pushedAt: repo.pushed_at || null,
      readmePath: path.relative(process.cwd(), readmePath),
      readmeOk: ok,
    });

    readmesForCombined.push({ fullName, readme });
    await sleep(180);
  }

  if (!dryRun) {
    fs.writeFileSync(path.join(repoRoot, "index.json"), JSON.stringify(index, null, 2), "utf8");
    if (!noCombined) {
      fs.writeFileSync(path.join(repoRoot, "ALL_READMES.md"), buildCombined(readmesForCombined), "utf8");
    }
  }
}

run().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});

