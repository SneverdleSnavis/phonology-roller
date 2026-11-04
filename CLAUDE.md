# Phonology Challenge roller: working notes

Read `docs/PLAN.md` first. Its "Where things stand" section says what is built and what to do next (currently Phase 1: card fixes and families).

## The app

- Everything lives in `phonology-challenge.html`: tokens and CSS at the top, markup, then one IIFE script.
- The file is the **artifact source**. It has no `<!doctype>`, `<html>`, `<head>` or `<body>`, because the Artifact tool wraps it at publish time. Keep it that way.
- The live page is https://claude.ai/artifact/GFTXDiFUxwFJ6fTubKG7y1. To update it from a new session, read it first (`Artifact` action `read` with that URL), then publish this file with `url` set to that URL. Publishing without `url` creates a separate artifact. The page declares capabilities `{db: {}, user: {}}`; omit `capabilities` on a republish to keep them.
- The plan's editable copy is the Claude Doc at https://claude.ai/artifact/6R1fk5PSq4ZNwtJ4TxJ9CR. If you change the plan, update both, or ask the user which is current.

## Script layout (in order)

1. `DEFAULT_SOURCE`: the 57 built-in cards, one array of columns per row, joined with tabs. `OLD_DEFAULT` is the first 3-card version, kept so saved copies of it upgrade automatically.
2. `catInfo` / `suitFor`: corner rank (`/C/`, `[C]`, `/V/`, `[V]`, `/X/`, `ˈσ`, `σ`) and suit colour per category.
3. Parser: `compile(tpl)` turns rule text into `parts` (text and slot pieces, each with `sp` for a space before it, and a `cond`) and `slots` (`kind`: number, pick or choice, plus `sides`, `options`, `mult`, `offset`, `cond`). `parseLibrary(src)` splits rows.
4. Rendering: `pieces` → `ruleHTML` (card in play), `ruleText` (plain text), `ruleHTMLDone` (deck), `rollSummary`.
5. `Die` class: 2D throw physics in the tray, flick or tap, `prefers-reduced-motion` support. Picks rolled above the list length are re-rolled in `onSlotResult`.
6. App state, pile, card in play, tray, deck, saving (`connectStore`), editor, wiring, boot.

## Saving

- With `db` available and a user id, the deck is stored in `data/users/<id>/deck/<entryId>` and a custom card list in `data/users/<id>/prefs/library`. Otherwise it falls back to `localStorage` keys `pc.deck`, `pc.source`, `pc.pile`, `pc.inplay` and `pc.sound`.
- The language profile planned in Phase 3 should be **derived from the deck**, never stored separately.

## Checking changes

- Run `node scripts/check-cards.js` after any parser or card-list change. It needs the `'use strict';` and `/* ---------- Dice` markers to stay in the script.
- For UI changes, one headless Playwright run is enough: draw with `d`, roll with `r`, keep with `k`, and watch for page errors.

## Conventions

- User-facing copy is plain and direct. Avoid em-dashes in UI text.
- Card data belongs to the user. Flag suspected mistakes in their cards (like `[10]` or the typo "Nucelus"); don't silently change them.
