# Grid

Hard constraints for every specimen. Agents keep a rule consistently once it's written down, and consistency is most of what reads as "designed". `pnpm lab grid <slug>` checks them on the live component. Change the numbers to fit your own system.

## 1. 8px base grid

Every padding, gap, margin, inset, control height and fixed size is a multiple of 8. A 4px half-step is allowed only inside a control (icon to label, chip padding, hairline offsets). Anything else off the grid is a bug.

- Control heights: 24, 32, 40, 48.
- Row heights: 40 or 48.
- Gaps between groups: 16, 24, 32. Gaps inside a group: 8.

## 2. 24 / 24 outer frame

The outermost surface of a component has a 24px radius and a 24px inset. Nested radii derive from it (inner = outer − inset) or are picked from the control scale (8 for fields and buttons, 4 for chips and keycaps) once the gap reaches 24.

## 3. Safe space and content areas

Lay out in this order, and don't skip ahead:

1. **Safe space:** the 24px inset on every side. Nothing but bleed crosses it.
2. **Content areas:** the groups (header, field group, actions). Each group is one block with one internal gap.
3. **Structure:** text hierarchy, placeholders, controls, placed inside their group.
4. **Type:** sizes and weights last.

## 4. Type budget

- Two families at most: Geist (sans) and one other, Geist Mono for code or a serif for display. Asking before adding a serif is required: it's a new font dependency.
- Per component: at most **three sizes** and **three weights**. Pick from 12, 14, 16, 20, 24, 32, 48 (plus 64 or 96 for a display stat) and from 400, 500, 600.
- Full-bleed specimens (explainers, bentos) have no outer frame: the 24/24 rule applies to their surfaces and tiles instead.
- One size and weight per role: title, body, meta. If a fourth role appears, merge it into one of the three.
