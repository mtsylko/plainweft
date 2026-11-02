---
name: worktree
description: Sets up and cleans up git worktrees for Plainweft work. Creates a worktree of fresh origin/main (or of an existing branch) under .claude/worktrees with node_modules, the main checkout's env files and a preview server on its own port; lists worktrees with their PR state; removes merged ones along with their dev servers. Use it before editing code while the session runs in the shared main checkout, when the user asks to work in a separate folder, branch or worktree, when a preview server needs a free port, and whenever the user asks to clean up worktrees, free disk space or stop leftover dev servers, even if they don't say "worktree".
---

# Worktrees

Several Claude sessions work in this repo at once, and they share the main checkout (the folder
that holds `.git`): another chat may have its branch checked out there and its `next dev` running
from it. Switching branches or editing files there changes them under that chat. A worktree is a
second checkout of the same repository in a folder of its own, with its own branch and files and
the same history, commits and remotes.

What git doesn't give a worktree, `scripts/worktree.mjs` in this skill's folder does: packages, env
files, a preview port, and the cleanup afterwards. Without the cleanup they pile up: on 2026-11-02
seven old worktrees took 5 GB, and their servers held ports nobody used.

## When

- **Create one** before the first edit when the session's folder is the main checkout. Reading
  code and answering questions don't need one.
- **Don't create one** when the session already runs in a worktree, such as one the app made with
  its worktree option: `git rev-parse --git-dir` then ends in `/worktrees/<name>`.
- **Remove one** once its PR is merged or closed, or when the user asks to clean up.

## Create

```bash
source ~/.nvm/nvm.sh && nvm use && node <this skill's folder>/scripts/worktree.mjs create <name>
```

`<name>` is kebab-case and names the branch and the folder, after the work, like the repo's other
branches (`storefront-swatches`, `seed-sock-silhouette`). The script:

1. Fetches `origin` and adds `.claude/worktrees/<name>` on a new branch from `origin/main`
   (`--base <ref>` starts it elsewhere). If `<name>` is already a local or remote branch, it checks
   that out instead, to pick the work up again.
2. Clones `node_modules` with `cp -c` from a checkout that has exactly the packages the new
   `package-lock.json` asks for (by npm's own record, `node_modules/.package-lock.json`). An APFS
   clone takes seconds and about 12 MB, where `npm ci` writes 620 MB. With no match it runs
   `npm ci`, which needs Node 22: that's what `nvm use` is for.
3. Links `storefront/.env.local` and `seed/.env` to the main checkout's, so the secrets live in one
   place. Edit them there.
4. Adds a preview server named `<name>`, on the first free port from 3400, to the main checkout's
   `.claude/launch.json` (git-excluded, local to this machine). `preview_start` reads only that
   file: start the server with `preview_start({ name: "<name>" })`.

Then work in the worktree with absolute paths, and commit, push and open the PR from there. `.next`
isn't cloned; the first `next dev` builds it.

## List and remove

```bash
node <this skill's folder>/scripts/worktree.mjs list
```

prints each worktree with its branch, PR state (through `gh`), uncommitted files, unpushed commits
and preview port. The repo squash-merges PRs, so a merged branch still looks unmerged to git: go by
the PR state, not `git branch --merged`.

Show the user which ones you'd remove and ask first: removing one stops a dev server another
session may be looking at. Then, from outside that worktree:

```bash
node <this skill's folder>/scripts/worktree.mjs remove <name>
```

It stops the server started from the worktree, with the npm and shell that started it, and runs
`git worktree remove` without `--force`, so git refuses while anything is uncommitted or untracked.
The env links go, not the main checkout's files. It also drops the preview from `launch.json`. If
git refuses, tell the user what's left in the worktree rather than forcing it. The branch stays:
delete it with `git branch -D <name>` only if the user asks.
