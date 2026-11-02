#!/usr/bin/env node
// Creates, lists and removes this repo's git worktrees under .claude/worktrees, each with its own
// node_modules, the main checkout's env files and a preview server port. See ../SKILL.md.
//
//   node .claude/skills/worktree/scripts/worktree.mjs create <name> [--base <ref>]
//   node .claude/skills/worktree/scripts/worktree.mjs list
//   node .claude/skills/worktree/scripts/worktree.mjs remove <name>

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";

// 3000 is Docker's, and 3001–3300 belong to the main checkout's own servers.
const FIRST_PORT = 3400;
// Secrets stay in the main checkout; a worktree links to them, so a new token reaches every copy.
const ENV_FILES = ["storefront/.env.local", "seed/.env"];

const run = (cmd, args, options = {}) =>
  execFileSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
const tryRun = (cmd, args, options) => {
  try {
    return run(cmd, args, options);
  } catch {
    return null;
  }
};
const fail = (message) => {
  console.error(`worktree: ${message}`);
  process.exit(1);
};

// The main checkout owns .git, so its folder is the parent of the common git dir.
const commonDir = tryRun("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
if (!commonDir) fail("run this inside the repository");
const ROOT = dirname(commonDir);
const WORKTREES = join(ROOT, ".claude", "worktrees");
const LAUNCH = join(ROOT, ".claude", "launch.json");

const inside = (path, folder) => path === folder || path.startsWith(folder + sep);

function worktrees() {
  const list = [];
  for (const block of run("git", ["-C", ROOT, "worktree", "list", "--porcelain"]).split("\n\n")) {
    const path = block.match(/^worktree (.+)$/m)?.[1];
    if (!path) continue;
    list.push({ path, branch: block.match(/^branch refs\/heads\/(.+)$/m)?.[1] ?? null });
  }
  return list;
}

function readLaunch() {
  if (!existsSync(LAUNCH)) return { version: "0.0.1", configurations: [] };
  return JSON.parse(readFileSync(LAUNCH, "utf8"));
}

function writeLaunch(launch) {
  writeFileSync(LAUNCH, JSON.stringify(launch, null, 2) + "\n");
}

const servesFrom = (config, path) => (config.runtimeArgs ?? []).join(" ").includes(path + " ");

/** Ports something is listening on, with the listening process ids. */
function listening() {
  const out = tryRun("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN", "-Fpn"]) ?? "";
  const ports = new Map();
  let pid = 0;
  for (const line of out.split("\n")) {
    if (line.startsWith("p")) pid = Number(line.slice(1));
    const port = line.startsWith("n") ? Number(line.match(/:(\d+)$/)?.[1]) : NaN;
    if (port) ports.set(port, [...(ports.get(port) ?? []), pid]);
  }
  return ports;
}

function prState(branch) {
  if (!branch) return "detached";
  const out = tryRun(
    "gh",
    ["pr", "list", "--head", branch, "--state", "all", "--json", "number,state", "--limit", "1"],
    { cwd: ROOT },
  );
  if (out === null) return "unknown (gh failed)";
  const [pr] = JSON.parse(out);
  return pr ? `#${pr.number} ${pr.state}` : "no PR";
}

/**
 * Whether a checkout's node_modules holds exactly the lock file's packages. npm records what it
 * installed in node_modules/.package-lock.json, which is what counts: the checkout's own lock file
 * may have changed with a branch switch since. Optional packages for other platforms aren't
 * installed on this one, so only the installed ones of those have to match.
 */
function installedMatches(folder, lock) {
  const file = join(folder, "node_modules", ".package-lock.json");
  if (!existsSync(file)) return false;
  const installed = JSON.parse(readFileSync(file, "utf8")).packages;
  const deps = (packages) =>
    Object.entries(packages).filter(([key]) => key.startsWith("node_modules/"));
  return (
    deps(lock.packages).every(([key, p]) => p.optional || installed[key]?.version === p.version) &&
    deps(installed).every(([key, p]) => lock.packages[key]?.version === p.version)
  );
}

function create(name, base) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) fail(`"${name}" isn't a kebab-case name`);
  const path = join(WORKTREES, name);
  if (existsSync(path)) fail(`${path} already exists`);

  run("git", ["-C", ROOT, "fetch", "--quiet", "--prune", "origin"]);
  const hasBranch = (ref) =>
    tryRun("git", ["-C", ROOT, "show-ref", "--verify", "--quiet", ref]) !== null;
  if (hasBranch(`refs/heads/${name}`)) {
    // Picks up work on a branch whose worktree was removed.
    run("git", ["-C", ROOT, "worktree", "add", path, name]);
  } else if (hasBranch(`refs/remotes/origin/${name}`)) {
    run("git", ["-C", ROOT, "worktree", "add", "--track", "-b", name, path, `origin/${name}`]);
  } else {
    run("git", ["-C", ROOT, "worktree", "add", "--no-track", "-b", name, path, base]);
  }
  console.log(`worktree  ${path} (branch ${name})`);

  // A checkout that has exactly the packages this lock file asks for can lend them: an APFS clone
  // of its node_modules takes seconds and almost no disk, where npm ci writes 620 MB.
  const lock = JSON.parse(readFileSync(join(path, "package-lock.json"), "utf8"));
  const donor = worktrees().find((w) => w.path !== path && installedMatches(w.path, lock));
  if (donor) {
    run("cp", ["-cR", join(donor.path, "node_modules"), join(path, "node_modules")]);
    console.log(`packages  cloned from ${donor.path}`);
  } else {
    if (Number(process.versions.node.split(".")[0]) < 22) {
      fail(`npm ci needs Node 22 (engine-strict): run "source ~/.nvm/nvm.sh && nvm use" first`);
    }
    const result = spawnSync("npm", ["ci", "--no-audit", "--no-fund", "--loglevel=error"], {
      cwd: path,
      stdio: "inherit",
    });
    if (result.status !== 0) fail("npm ci failed");
    console.log("packages  installed with npm ci (no checkout had these packages)");
  }

  for (const file of ENV_FILES) {
    // An older base may not have the package the file belongs to yet.
    const target = join(path, file);
    if (existsSync(join(ROOT, file)) && existsSync(dirname(target)) && !existsSync(target)) {
      symlinkSync(join(ROOT, file), target);
      console.log(`env       ${file} -> main checkout`);
    }
  }

  const launch = readLaunch();
  const taken = new Set([...launch.configurations.map((c) => c.port), ...listening().keys()]);
  let port = FIRST_PORT;
  while (taken.has(port)) port++;
  launch.configurations.push({
    name,
    runtimeExecutable: "bash",
    runtimeArgs: [
      "-c",
      `cd ${path} && source ~/.nvm/nvm.sh && nvm use && npm run dev -w storefront -- --port ${port}`,
    ],
    port,
  });
  writeLaunch(launch);
  console.log(`preview   "${name}" on port ${port} in ${LAUNCH}`);
}

function list() {
  const launch = readLaunch();
  const ports = listening();
  const rows = worktrees().filter((w) => inside(w.path, WORKTREES));
  if (rows.length === 0) return console.log("no worktrees under .claude/worktrees");
  for (const { path, branch } of rows) {
    const changes = run("git", ["-C", path, "status", "--porcelain"]).split("\n").filter(Boolean);
    const unpushed = tryRun("git", ["-C", path, "rev-list", "--count", "@{upstream}..HEAD"]);
    const config = launch.configurations.find((c) => servesFrom(c, path));
    const server = config
      ? `port ${config.port}${ports.has(config.port) ? " (running)" : ""}`
      : "no preview";
    console.log(
      [
        path.slice(WORKTREES.length + 1),
        `branch ${branch ?? "(detached)"}`,
        `PR ${prState(branch)}`,
        `${changes.length} uncommitted`,
        unpushed === null ? "no upstream" : `${unpushed} unpushed`,
        server,
      ].join("  |  "),
    );
  }
}

/** Stops dev servers started from the worktree, with the shells and npm that started them. */
function stopServers(path) {
  const cwds = new Map();
  let pid = 0;
  for (const line of (tryRun("lsof", ["-d", "cwd", "-Fpn"]) ?? "").split("\n")) {
    if (line.startsWith("p")) pid = Number(line.slice(1));
    if (line.startsWith("n")) cwds.set(pid, line.slice(1));
  }
  const parents = new Map(
    run("ps", ["-axo", "pid=,ppid="])
      .split("\n")
      .map((l) => l.trim().split(/\s+/).map(Number)),
  );
  const doomed = new Set();
  const ports = [];
  for (const [port, pids] of listening()) {
    for (const server of pids) {
      if (!inside(cwds.get(server) ?? "", path)) continue;
      // Walk up while the parent still runs from the worktree: next dev, npm, the bash -c wrapper.
      for (let p = server; p > 1 && inside(cwds.get(p) ?? "", path); p = parents.get(p) ?? 0) {
        doomed.add(p);
      }
      ports.push(port);
    }
  }
  for (const p of doomed) tryRun("kill", ["-TERM", String(p)]);
  // A server still shutting down writes into .next while git deletes the folder.
  for (let wait = 0; wait < 20 && ports.some((port) => listening().has(port)); wait++) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  for (const port of ports) {
    console.log(
      `stopped   server on port ${port}${listening().has(port) ? " (still closing)" : ""}`,
    );
  }
}

function remove(name) {
  const path = join(WORKTREES, name);
  if (!worktrees().some((w) => w.path === path)) fail(`no worktree at ${path}`);
  if (inside(process.cwd(), path)) fail("run this from outside the worktree you're removing");

  stopServers(path);
  // Without --force git refuses if anything is uncommitted or untracked, so no work is lost.
  const result = spawnSync("git", ["-C", ROOT, "worktree", "remove", path], { encoding: "utf8" });
  if (result.status !== 0) fail(`git kept the worktree: ${result.stderr.trim()}`);
  run("git", ["-C", ROOT, "worktree", "prune"]);
  console.log(`removed   ${path}`);

  const launch = readLaunch();
  const kept = launch.configurations.filter((c) => !servesFrom(c, path));
  if (kept.length !== launch.configurations.length) {
    writeLaunch({ ...launch, configurations: kept });
    console.log(`preview   "${name}" dropped from ${LAUNCH}`);
  }
  console.log(`branch    ${name} is kept; git branch -D ${name} deletes it`);
}

const [command, name, ...rest] = process.argv.slice(2);
const baseIndex = rest.indexOf("--base");
const base = baseIndex === -1 ? "origin/main" : rest[baseIndex + 1];

if (command === "create" && name) create(name, base);
else if (command === "list") list();
else if (command === "remove" && name) remove(name);
else fail("usage: worktree.mjs create <name> [--base <ref>] | list | remove <name>");
