# Taste

Your rules. Agents read this before building anything, and it overrides their defaults. Every crit note and toss reason becomes one line here, with its reason. The rules below are a starting point: edit, delete, and add your own.

## The bar

- One component, one idea. Don't grow it into a dashboard or a fake product to make it look substantial.
- Practical first. It should be something a real product could ship, and delight is a detail on top, never the reason it exists.
- Product size and density: 12 to 14px text, 32px controls, 40 to 48px rows, 8px gaps. Generous padding reads as a mockup.
- Finish every state before showing it: empty, hover, active, disabled, error, long text.
- Specific content. Real-sounding names and numbers, never "Item 1" or lorem ipsum.

## Surfaces

- Depth comes from the elevation tokens (`shadow-raised`, `shadow-floating`, `shadow-window`, `shadow-inset`), not borders.
- Nested radii are derived: inner = outer − inset. A copied radius pinches the corner.
- Tint with `color-mix(in oklab, ...)`, not `in oklch`. OKLCH interpolates hue, so blue mixed with gray turns purple.
- Changing numbers use tabular figures in the sans. Mono is for code.

## Motion

- Product motion stays under 300ms. The signature moment may run longer when the idea needs it.
- Animate a child, never the hover target, or the edge flickers.
- Respect reduced motion.

## Film

- Every specimen is interactive in the lab before it's a film. If it only plays back, it can't be judged by hand.
- Never redraw a component for a film. Drive the real one, so the film stays proof.
- The camera and the cursor never move at the same time.
- A click reads only when the cursor arrives, pauses, then presses.
- Guides and measurements only when the point is a relationship between parts. On a single control they're decoration.
