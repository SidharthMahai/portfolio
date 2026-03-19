#!/usr/bin/env node
/**
 * Batch inserts/updates a small README block used by the portfolio site.
 *
 * Usage:
 *   GITHUB_TOKEN=... node tools/update-github-readmes.mjs
 *   GITHUB_TOKEN=... node tools/update-github-readmes.mjs --dry-run
 *   GITHUB_TOKEN=... GITHUB_USER=SidharthMahai node tools/update-github-readmes.mjs --limit 20
 *
 * Notes:
 * - Requires a GitHub Personal Access Token with `repo` scope (or `public_repo` for public-only).
 * - Updates only non-fork, non-archived repos owned by the user.
 */

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const limitIndex = process.argv.indexOf("--limit");
const limit = limitIndex !== -1 ? Number(process.argv[limitIndex + 1]) : Infinity;

const token = process.env.GITHUB_TOKEN;
const user = process.env.GITHUB_USER || "SidharthMahai";

if (!token) {
  console.error("Missing GITHUB_TOKEN env var.");
  process.exit(1);
}

if (typeof fetch !== "function") {
  console.error("This script requires Node.js 18+ (global fetch).");
  process.exit(1);
}

const apiBase = "https://api.github.com";
const startToken = "<!-- PORTFOLIO:START -->";
const endToken = "<!-- PORTFOLIO:END -->";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requiredHeader() {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function ghJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...requiredHeader(), ...(options.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} for ${url}\n${text}`);
  }
  return res.json();
}

function toBase64Utf8(value) {
  return Buffer.from(String(value), "utf8").toString("base64");
}

function fromBase64Utf8(value) {
  return Buffer.from(String(value || ""), "base64").toString("utf8");
}

function upsertPortfolioBlock(readme, block) {
  const raw = String(readme || "").replaceAll("\r\n", "\n");
  const start = raw.indexOf(startToken);
  const end = raw.indexOf(endToken);

  if (start !== -1 && end !== -1 && end > start) {
    return `${raw.slice(0, start)}${block}${raw.slice(end + endToken.length)}`.trimStart();
  }

  const lines = raw.split("\n");
  const firstLine = lines[0] || "";
  const hasTitle = firstLine.trim().startsWith("#");

  if (hasTitle) {
    return [lines[0], "", block, "", ...lines.slice(1)].join("\n").trimStart();
  }

  return [block, "", raw].join("\n").trimStart();
}

function buildPortfolioBlock(repo) {
  const description =
    (repo.description || "").trim() ||
    "Software project exploring product, backend, and platform concepts.";
  const language = (repo.language || "Unknown").trim();
  const sentence = `${description}${description.endsWith(".") ? "" : "."} Built with ${language}.`;

  return [
    startToken,
    sentence,
    endToken,
  ].join("\n");
}

async function listRepos() {
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

  return repos
    .filter((repo) => repo && !repo.fork && !repo.archived && repo.owner?.login === user)
    .slice(0, limit);
}

async function getReadmeInfo(repoName) {
  const url = `${apiBase}/repos/${encodeURIComponent(user)}/${encodeURIComponent(repoName)}/readme`;
  try {
    return await ghJson(url);
  } catch (error) {
    if (String(error.message || "").includes("404")) return null;
    throw error;
  }
}

async function updateReadme(repo, markdown) {
  const info = await getReadmeInfo(repo.name);
  const path = info?.path || "README.md";
  const sha = info?.sha;

  const url = `${apiBase}/repos/${encodeURIComponent(user)}/${encodeURIComponent(
    repo.name
  )}/contents/${encodeURIComponent(path)}`;

  const body = {
    message: "chore: update portfolio snippet",
    content: toBase64Utf8(markdown),
    ...(sha ? { sha } : {}),
  };

  if (dryRun) {
    console.log(`[dry-run] ${repo.name}: would update ${path}`);
    return;
  }

  await ghJson(url, { method: "PUT", body: JSON.stringify(body) });
  console.log(`${repo.name}: updated ${path}`);
}

async function run() {
  const repos = await listRepos();
  console.log(`Found ${repos.length} repos for ${user}.`);

  for (const repo of repos) {
    const info = await getReadmeInfo(repo.name);
    const existing = info?.content ? fromBase64Utf8(info.content) : "";
    const portfolioBlock = buildPortfolioBlock(repo);
    const next = existing.trim()
      ? upsertPortfolioBlock(existing, portfolioBlock)
      : `# ${repo.name}\n\n${portfolioBlock}\n`;

    if (existing.replaceAll("\r\n", "\n").trim() === next.trim()) {
      console.log(`${repo.name}: no change`);
      continue;
    }

    await updateReadme(repo, next);
    await sleep(220);
  }
}

run().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
