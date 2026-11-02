---
name: lab-film
description: Make, retime, check, or render a byolab film that drives a real component, such as an interaction loop, an explainer, or an anatomy reveal. Use for any video, clip, storyboard, still, contact sheet, or export in this repository.
---

# Films

<context>

A film is a code-defined video of a real component. `film.ts` sits next to the component (or `src/films/<slug>/storyboard.ts` for a film that isn't one component's). The engine in `src/film` builds one paused GSAP timeline, seeks it frame by frame in Playwright, and pipes the frames into ffmpeg. Because every frame is a pure function of time, a render is exact and repeatable.

The `specimen` scene mounts the real component and drives it. It never redraws it. The component reads `useFilmFrame()` → `{ t, values }` and renders from that; the film tweens `values`.

</context>

<workflow>

## 1. Write beats

`pnpm lab new` writes a starter `film.ts`. Change the beats, not the engine. Each beat is in scene seconds:

| Field | Does |
| --- | --- |
| `click: '<selector>'` | Moves the cursor there (`over`, default 0.7s) and presses at `at`. Adds a click sound. |
| `cursor: '<selector>'` | Moves the cursor without pressing. |
| `values: { k: n }` | Tweens `useFilmFrame().values` starting 0.06s after a click, over `over` with `ease`. |
| `follow: '<selector>'` | The cursor follows that element while `values` tween, for drags. |
| `vars: { '--x': n }` | Tweens CSS custom properties on the component root. |
| `camera: '<selector>' \| 'full'` | Frames a target with `zoom` and an `anchor` in stage fractions. |
| `look: { ui, skeleton, guides }` | Crossfades the anatomy layers (0..1), for breakdowns. |
| `sound: 'tick' \| 'pop' \| 'click' \| 'chime' \| 'clack'` | Adds a synthesized cue at `at`. |

Eases are named in the film's `theme.motion`: `glide`, `settle`, `drawer`, `press`, `linear`.

For a component with its own timed script (like an explainer model), skip beats and read `t` directly: `const film = useFilmFrame(); const state = film ? frameAt(film.t) : live`.

Timing that reads well:

- Cursor travel 0.7s on `glide`. Leave at least 1.2s between clicks on the same control so each state reads.
- The camera MUST NOT move during a click. Give it its own beat and let it settle first.

## 2. Stay deterministic

Animate only through the timeline and `useFilmFrame()`. MUST NOT use `Math.random` (use `rng(seed)` from `src/film/engine/dom.ts`), timers, `requestAnimationFrame` loops, `Date.now()`, or CSS transitions on film-driven state: any of them makes a seeked frame differ from a played one.

## 3. Look, check, render

```bash
pnpm lab still <film> 2.5                 # one frame → out/<film>/still-2.50.png. Read it.
pnpm lab render <film> --sheet 2          # contact sheet, 2 frames per second
pnpm lab check <film>                     # overlaps + scrub exactness. MUST pass.
pnpm lab render <film> --theme dark       # out/<film>-dark/video.mp4
pnpm lab export <film> --theme both       # exports/<film>/<film>-light.mp4 and -dark.mp4
```

Preview live with `pnpm dev` at `/film.html?film=<film>` (T toggles theme, Esc returns to the component). A sheet shows layout but not motion: watch the mp4 at normal speed before calling it done.

## 4. Turn notes into rules

When the owner gives a note ("cursor is too slow"), fix it, then add one line to `TASTE.md` that would have prevented it.

</workflow>
