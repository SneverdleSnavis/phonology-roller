# Phonology Challenge roller

A card-and-dice tool for building constrained phonologies. You draw a constraint card, roll the dice it calls for to fill its blanks, and keep the finished card in your deck. The actual phonology design happens outside the tool: copy the deck as text and take it wherever you work.

- **Live page:** https://claude.ai/artifact/GFTXDiFUxwFJ6fTubKG7y1 (private claude.ai artifact)
- **Expansion plan:** [docs/PLAN.md](docs/PLAN.md). The editable copy is the Claude Doc at https://claude.ai/artifact/6R1fk5PSq4ZNwtJ4TxJ9CR

## How a round works

1. **Draw.** Tap the pile. The top card flips face up, and its blanks show the dice they need (`d12`, `20+d80`, `coin`).
2. **Roll.** A matching die drops onto the felt tray. Tap it, or drag and flick it. For a pick-from-a-list blank, the numbered options appear under the tray and the rolled one flies onto the card.
3. **Choices and conditions.** `[do/don't]` is a coin flip. `(If do: …)` is struck through and skipped when the coin says "don't".
4. **Keep or discard.** Keep files the card into your deck. Discard sends it to the bottom of the pile.

Keyboard: `D` draw, `R` roll, `K` keep.

## Files

| Path | What it is |
| --- | --- |
| `phonology-challenge.html` | The whole app: markup, CSS and JS in one file, with the 72 built-in cards in `DEFAULT_SOURCE` and the trimmed PHOIBLE phoneme table. It is the source that gets published to the artifact. |
| `docs/PLAN.md` | The card expansion plan: language profile, clash checks, phoneme cards, new card types, fixes, build phases. |
| `scripts/check-cards.js` | Runs the card parser in Node over every built-in card with random rolls and prints the sentences and warnings. |
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
| `[do/don't]`, `[L/R]` | A list with no die. Two options flip a coin; more roll a die of that size. |
| `(If do: …)` | Only applies when an earlier roll came up "do". |
| `[10]` | A fixed number, nothing to roll (the editor warns about it). |
| `family=consonant-count` | An optional last column of tags (`key=value`, separated by `;`). Only one card per family can be in the deck: keeping one sets the rest aside until it leaves. |
| `[ipa:rare]`, `[ipa:front+rounded]` | Deal up to 20 phonemes that have every listed feature, then roll for one. Terms: `common`, `uncommon`, `rare`, `consonant`, `vowel`, any place, manner or vowel height, `front`/`central`/`back`, `rounded`/`unrounded`, `ejective`, `implosive`, `click`, `coarticulated`, `prenasalized`, `aspirated`, `nasalized`, `long` and more. Phonemes already in your deck aren't dealt again. |

Edit the card list in the app with **Edit cards**. It shows a live preview and flags problems. Run the parser check from the repo root:

```bash
node scripts/check-cards.js
```

## Phoneme data

Phoneme cards use [PHOIBLE 2.0](https://phoible.org) (Moran, Steven and McCloy, Daniel (eds.) 2019. PHOIBLE 2.0. Jena: Max Planck Institute for the Science of Human History. DOI: 10.5281/zenodo.2626687), licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The page bundles a trimmed copy: single segments found in 3 or more languages, with the number of languages for each.

## Saving

On claude.ai the page uses the artifact `db` capability. Each viewer's deck is stored privately under `data/users/<id>/deck/<entryId>`, and their custom card list under `data/users/<id>/prefs/library`. Anywhere else, or when the viewer is signed out, it falls back to `localStorage`. Opening the HTML file directly in a browser works, with browser-only saving.
