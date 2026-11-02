---
name: lab-component
description: Build or refine a component in a byolab design lab, from scaffold to a judged draft. Use when asked to make, build, or polish a component, interaction, or layout study in this repository.
---

# Lab components

<context>

A component here is one idea worth showing: an interaction, a material, a state change. It is the whole deliverable. The owner judges it by hand in the lab, then films it. Read `TASTE.md` and `GRID.md` first; they override anything below.

</context>

<workflow>

1. **Name the idea in one sentence.** It becomes `idea` in the registry and the tile caption. If you can't write it, the component isn't ready.
2. **Scaffold it:** `pnpm lab new <slug> --name "<Name>" --idea "<sentence>" --json`. The JSON lists the files and the URL. Pick `--size` to fit the component with a 24px gutter; it stays fixed so the lab and the film scale the same geometry.
3. **Build in the generated `<slug>.tsx`.** Compose the themed components in `src/components/ui` and semantic tokens (`bg-card`, `text-muted-foreground`, `shadow-floating`). A raw color is OKLCH and only appears where the content needs it.
4. **Give it two drivers.** Real pointer and keyboard input drive it in the lab. In a film, `useFilmFrame()` returns `{ t, values }` and the component reads its state from there instead. Keep one markup for both, so the film can't drift from the real thing. Give clickable controls a stable `data-slot`.
5. **Tune with DialKit.** The starter calls `useDialKit` for its radius and spring. Put the values worth tuning there (springs, durations, radii, offsets) and tell the owner they can tune them in the workbench panel. When they paste values back, bake them in as plain constants and remove that `useDialKit` call, because a film can't reproduce a live dial frame for frame.
6. **Finish every state:** empty, hover, focus, active, disabled, error, long text, both themes, keyboard, reduced motion.
7. **Check it:** `pnpm lab grid <slug>`, `pnpm typecheck`, `pnpm lint`. Open `http://localhost:5420/#/s/<slug>` in a browser, use it, and look at it in both themes (T toggles).
8. **Hand over** the URL with one sentence on what to try first. The owner keeps or tosses it. When they toss with a reason, run `pnpm lab toss <slug> --reason "<their words>"`. See `docs/judging.md` for what a useful reason looks like.

</workflow>

<reject>

Reject the component when it reads as any of these, because each one hides the idea:

- A landing page, a feature grid, or three cards.
- Charts added to make a small idea look substantial.
- Placeholder content.
- A transition that exists only to look produced.

</reject>
