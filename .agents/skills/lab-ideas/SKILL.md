---
name: lab-ideas
description: Propose new component ideas for a byolab design lab, weighted by the owner's past keeps and tosses, then build the one they pick. Use for "give me ideas", "what should I make", or a daily generation run.
---

# Ideas

<context>

Ideas are cheap and builds are expensive, so propose widely and build one deeply. `LEDGER.md` holds every keep and toss with its reason; `TASTE.md` holds the rules those reasons became.

</context>

<workflow>

1. **Learn.** Read `TASTE.md` and `LEDGER.md`. Turn every line under "Toss notes, not yet rules" in `TASTE.md` into a rule with its reason, then delete the note.
2. **Propose four to six.** A strong idea borrows a mechanism from a physical or historical interface and puts it inside everyday product UI: billing, search, uploads, permissions, notifications, deploy status. Write each as:

   ```
   ### <name>
   - **Mechanism:** <what it borrows and how that works>
   - **Subject:** <the product UI it lives in>
   - **Idea:** <one sentence a viewer would say>
   - **The moment:** <the frame people would screenshot>
   ```

   Kill any idea a component library already ships, any familiar pattern in a new color, and anything the ledger's toss reasons rule out.
3. **Stop and ask which one to build.** MUST NOT build unpicked ideas: the pick is the taste signal.
4. **Build the pick** with the `lab-component` skill, as a draft. Several passes: make it work with real input, make the moment land, then polish every state.

</workflow>
