# Releasing

For maintainers of byolab itself. Labs made from it are updated with the `lab-update` skill.

1. Add an entry to the top of `CHANGELOG.md`. Mark every change **Automatic**, **Action**, or **Optional**. For each **Action**, write the exact steps an agent should take in someone's lab, and name the files it touches. Anything that changes a film, specimen, or `TASTE.md` format is an **Action**.
2. Bump `version` in `package.json` with semver: patch for fixes, minor for new commands, kinds, or skills, major when an **Action** is required.
3. Check it: `pnpm typecheck && pnpm lint && pnpm build`, then `pnpm lab new` each kind and run `grid`, `check`, and `still` on it.
4. Commit as `chore: release vX.Y.Z`, tag, and push:
   ```bash
   git tag vX.Y.Z && git push origin main vX.Y.Z
   ```
5. Create the GitHub release from that changelog entry:
   ```bash
   gh release create vX.Y.Z --title "vX.Y.Z" --notes "$(awk '/^## X.Y.Z/{f=1;next} /^## /{f=0} f' CHANGELOG.md)"
   ```
