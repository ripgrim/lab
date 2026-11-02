---
name: lab-update
description: Update a byolab lab to a newer release without touching the owner's work. Use when the owner asks to update, upgrade, pull the latest byolab, or asks what changed in a new version.
---

# Updating

<context>

A lab starts as a copy of byolab and becomes the owner's own, so an update is a patch, not a reinstall. Releases are git tags (`v0.1.0`, `v0.2.0`) on `https://github.com/jal-co/byolab`. `CHANGELOG.md` lists every change and marks it **Automatic**, **Action**, or **Optional**. The owner's current version is `version` in `package.json`.

</context>

<rules>

Never overwrite the owner's files. These are theirs, and an update MUST NOT change them unless a changelog **Action** says exactly how and the owner agrees:

- `TASTE.md`, `GRID.md`, `LEDGER.md`
- `src/specimens/*/`, `src/drafts/*/`, `src/films/*/`
- `src/index.css` (their theme)
- anything they have edited in `src/components/ui/` or `.agents/skills/`

Everything else (`scripts/`, `src/film/`, `src/lab/`, `src/anatomy/`, `vite/`, and the registry files `src/specimens/index.ts`, `src/specimens/kinds.ts`, `src/films/index.ts`) is the engine and comes from upstream.

</rules>

<workflow>

1. **Check the tree is clean** with `git status --porcelain`. If it isn't, ask the owner to commit or stash first, because a patch on top of uncommitted work is hard to undo.
2. **Fetch releases:**
   ```bash
   git remote get-url byolab 2>/dev/null || git remote add byolab https://github.com/jal-co/byolab.git
   git fetch byolab --tags --force
   git tag -l 'v*' --sort=-v:refname | head -5
   ```
   `FROM` is `v` plus `version` in `package.json`. `TO` is the newest tag, or the one the owner named. If they're equal, say they're up to date and stop.
3. **Read what changed:** `git show $TO:CHANGELOG.md`, from the `FROM` entry up to `TO`. Summarize it for the owner in a few lines, listing every **Action** and **Optional** item, and ask before applying. Updating is their call.
4. **Branch:** `git switch -c update/$TO`.
5. **Apply engine changes** as a three-way patch, which works whether the lab was cloned or made from the GitHub template:
   ```bash
   git diff $FROM $TO -- . \
     ':(exclude)TASTE.md' ':(exclude)GRID.md' ':(exclude)LEDGER.md' \
     ':(exclude)CHANGELOG.md' ':(exclude)README.md' ':(exclude)src/index.css' \
     ':(exclude,glob)src/specimens/*/**' ':(exclude,glob)src/drafts/*/**' ':(exclude,glob)src/films/*/**' \
     ':(exclude,glob)docs/**' ':(exclude,glob).agents/skills/**' \
     ':(exclude)package.json' ':(exclude)pnpm-lock.yaml' \
     | git apply --3way
   ```
   Files that conflict are left with `<<<<<<< ours` / `>>>>>>> theirs` markers; `git diff --name-only --diff-filter=U` lists them.
   Then copy `CHANGELOG.md`, `README.md`, and `docs/` from `$TO` with `git checkout $TO -- CHANGELOG.md README.md docs`.
6. **Dependencies:** compare `git show $FROM:package.json` with `git show $TO:package.json`. Apply only the dependency and script changes, keep the owner's own additions, set `version` to the new number, then `pnpm install`.
7. **Skills:** for each `.agents/skills/*` that changed upstream, check whether the owner edited it (`git diff $FROM -- <path>`). If they didn't, take the new one with `git checkout $TO -- <path>`. If they did, show both and ask.
8. **Resolve conflicts** from step 5 by keeping the owner's intent and upstream's fix, and tell them about each one.
9. **Do the Action items** the owner agreed to, one at a time, checking each against their own specimens and films.
10. **Verify:** `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm lab grid` and `pnpm lab check` on one kept specimen and its film, then open the lab and look at it.
11. **Hand over:** commit on the `update/$TO` branch, list what changed and anything that needs their eyes, and let them merge it.

</workflow>
