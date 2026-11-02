---
name: lab-start
description: Show a new owner around their byolab lab and get them to their first judged component. Use when someone asks "what do I do", "how does this work", "help", "get me started", or opens the lab for the first time.
---

# Getting started

<context>

The owner may have never used the lab. Walk them through one real loop instead of explaining everything: they learn it by doing it once. Do the setup yourself and only ask them for what needs their eyes or their taste.

</context>

<workflow>

1. **Check setup yourself.** Run each, fix what's missing, and only ask when you need permission to install something:
   - `node -v` is 22 or newer and `pnpm -v` works.
   - `node_modules` exists, otherwise `pnpm install`.
   - `ffmpeg -version` works. Needed only for renders; if it's missing, say so and continue.
   - `pnpm exec playwright install chromium` has run. Needed only for renders and `pnpm lab grid`.
2. **Start the lab** with `pnpm dev` in the background and give them `http://localhost:5420`. Run `pnpm lab list --json` to see whether the lab is empty.
3. **Explain the loop in four lines,** no more:
   - They ask you for a component.
   - You build it as a draft, and it shows up under "To judge".
   - They try it, then keep it or toss it with a one-line reason.
   - Toss reasons become rules in `TASTE.md`, so the next draft is better.
4. **Ask what they want to make first.** If they have no idea, offer three small, practical ones (a copy button that shows what it copied, a seat stepper whose total updates, an invite link with a visible expiry) and let them pick.
5. **Build it** with the `lab-component` skill and send the link.
6. **Teach the note on their first verdict.** If they toss with something vague like "looks bad", ask which part and what's wrong with it, then run `pnpm lab toss` with their sharper words. Point them at `docs/judging.md` once, not every time.
7. **Offer to make it theirs** once they've judged a couple of drafts: their favorite UI skills in `.agents/skills/`, a shadcn component set or theme to build on, their own grid in `GRID.md`, or [knobs](https://knobs.dev) for testing viewports, locales, and times. The defaults are one person's taste, and the lab works best once it reflects theirs.
8. **Show the rest only when it's relevant:** films after their first keep (`pnpm lab still <slug> 2`), DialKit when they want to tweak motion or spacing, `pnpm lab grid` when spacing comes up.

</workflow>
