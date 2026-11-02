---
name: lab-explainer
description: Build a without-versus-with explainer in a byolab design lab, where one input plays with a UI detail off, then on, and the hidden mechanism is drawn in. Use for "explain this detail" or teaching posts about invisible interaction details.
---

# Explainers

<context>

An explainer teaches a detail people feel but never see. One instance plays the same input with the detail off, a labeled switch flips, and the same input plays with it on.

</context>

<workflow>

1. **Check the libraries first.** Search the Radix, Base UI, and shadcn docs for the detail. If a primitive already does it, name the exact prop and default in `idea`, and frame the explainer as a tip for people hand-rolling it.
2. **Pick a detail one sweep can show.** If the difference needs narration, pick another.
3. **Scaffold it:** `pnpm lab new <slug> --kind explainer --idea "<sentence>" --json`. It's full bleed and portrait (1080×1350) by default.
4. **Write the mechanism as a pure function of time** in a `model.ts`: the scripted input and `frameAt(t, on)` returning the state. One function drives both the live lab and the film, so they can't disagree.
5. **One large instance, centered.** No caption text in the frame: the switch label and the behavior carry it. Make the hidden part visible with `--signal` (a wait ring, a hit area), and only as real state, never decoration.
6. **Render both themes:** `pnpm lab export <slug> --theme both`.

</workflow>
