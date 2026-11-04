# Phonology Challenge roller

A card-and-dice tool for building constrained phonologies. You draw a constraint card, roll the dice it calls for to fill its blanks, and keep the finished card in your deck. The actual phonology design happens outside the tool: copy the deck as text and take it wherever you work.

- **Live page:** https://claude.ai/artifact/GFTXDiFUxwFJ6fTubKG7y1 (private claude.ai artifact)
- **Expansion plan:** [docs/PLAN.md](docs/PLAN.md). The editable copy is the Claude Doc at https://claude.ai/artifact/6R1fk5PSq4ZNwtJ4TxJ9CR

## How a round works

1. **Draw.** Tap the pile. The top card flips face up, and its blanks show the dice they need (`d12`, `20+d80`, `coin`).
2. **Roll.** A matching die drops onto the felt tray. Tap it, or drag and flick it. For a pick-from-a-list blank, the numbered options appear under the tray and the rolled one flies onto the card.
3. **Choices and conditions.** `[do/don't]` is a coin flip. `(If do: …)` is struck through and skipped when the coin says "don't".
4. **Keep or discard.** Keep files the card into your deck. Discard sends it to the bottom of the pile.
5. **The language profile.** Beside the deck, a panel shows what the kept cards commit the language to: inventory sizes, places, manners, vowels, prosody, mandated phonemes and the phoneme budget. Before each roll, options that would clash with it are struck through and the die shrinks to what's left. A blank with one value left is filled without a roll, with the reason under the card. Cards with no roll that fits, a taken family, or a missing prerequisite are set aside, with reasons listed in the panel, and go back into the pile when that changes.

Keyboard: `D` draw, `R` roll, `K` keep.

## Files

| Path | What it is |
| --- | --- |
| `phonology-challenge.html` | The whole app: markup, CSS and JS in one file, with the 93 built-in cards in `DEFAULT_SOURCE` and the trimmed PHOIBLE phoneme table. It is the source that gets published to the artifact. |
| `docs/PLAN.md` | The card expansion plan: language profile, clash checks, phoneme cards, new card types, fixes, build phases. |
| `scripts/check-cards.js` | Runs the card parser in Node over every built-in card with random rolls and prints the sentences and warnings, then plays random games through the clash checks and reports any clash that reaches a deck. |
| `scripts/build-phonemes.js` | Rebuilds the phoneme table in the page from the PHOIBLE 2.0 CSV. |
| `CLAUDE.md` | Working notes for Claude Code sessions on this repo. |

## Card format

Cards are rows pasted from a spreadsheet, separated by tabs (or `|`): category, card name, then the rule text across any number of columns.

| Syntax | Meaning |
| --- | --- |
| `[d8]` | Roll a d8; the number goes on the card. |
| `20+[d80]`, `-1+[d9]` | Roll, then add the number written before the die. |
| `[d15*2]` | Roll, then multiply. |
| `[d12] [a/b/…]` | Roll a d12 and take that option from the list. Rolls above the list length are rolled again. |
| `@place  a/b/…` | A named list, on its own row anywhere in the text (brackets optional). Cards use it as `[@place]`, as in `[d12] [@place]`. The name records which part of the language the roll is about. The built-in lists are `@place`, `@manner`, `@vheight`, `@vback`, `@special`, `@vfeature`, `@airstream` and `@obstruent`. |
| `ejectives {airstream}` | Marks an option's feature type, for lists that mix kinds (only `@special` so far). The card shows just "ejectives". Types: place, manner, airstream, laryngeal, secondary, prenasalization, height, backness, rounding, nasality, phonation, length, tone. |
| `[do/don't]`, `[L/R]` | A list with no die. Two options flip a coin; more roll a die of that size. |
| `(If do: …)` | Only applies when an earlier roll came up "do". |
| `[10]` | A fixed number, nothing to roll (the editor warns about it). |
| `family=consonant-count` | An optional last column of tags (`key=value`, separated by `;`). Only one card per family can be in the deck: keeping one sets the rest aside until it leaves. |
| `effect=include`, `counts=consonants`, `feature=pitch accent`, `needs=tone` | How a card writes to the language profile. `effect` (`include`, `exclude`, `neutralize`, `at-most`, `symmetric`, `count`, `gap`) applies to the card's named list, or to its `feature`. `counts` names the total a number sets; a card with two numbers can name two, as in `counts=onset-consonants, coda-consonants`. `needs` keeps a card set aside until the deck has that thing. The editor flags unknown tags and values. |
| `effect=gap` | Leaves one cell of the inventory empty, as in “Leave out the voiceless bilabial plosive”. The place and manner (or vowel height and backness) must be in the language, no mandated phoneme may fill the cell, and a cell no language in PHOIBLE has is crossed out. |
| `[ipa:rare]`, `[ipa:front+rounded]` | Deal up to 20 phonemes that have every listed feature, then roll for one. Terms: `common`, `uncommon`, `rare`, `consonant`, `vowel`, any place, manner or vowel height, `front`/`central`/`back`, `rounded`/`unrounded`, `ejective`, `implosive`, `click`, `coarticulated`, `prenasalized`, `aspirated`, `nasalized`, `long` and more. Phonemes already in your deck aren't dealt again. |

Edit the card list in the app with **Edit cards**. It shows a live preview of every list and card, with each card's tags, and flags problems. Run the parser check from the repo root:

```bash
node scripts/check-cards.js
```

## Phoneme data

Phoneme cards use [PHOIBLE 2.0](https://phoible.org) (Moran, Steven and McCloy, Daniel (eds.) 2019. PHOIBLE 2.0. Jena: Max Planck Institute for the Science of Human History. DOI: 10.5281/zenodo.2626687), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The page bundles a trimmed copy: single segments found in 3 or more languages, with the number of languages for each.

## Saving

On claude.ai the page uses the artifact `db` capability. Each viewer's deck is stored privately under `data/users/<id>/deck/<entryId>`, and their custom card list under `data/users/<id>/prefs/library`. Anywhere else, or when the viewer is signed out, it falls back to `localStorage`. Opening the HTML file directly in a browser works, with browser-only saving.
