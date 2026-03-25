# Apex Duo Finder

A local web app that recommends the best 2-legend combination for your Apex Legends playstyle.

## Quick Start

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## Open in VS Code

```bash
code c:\test
```

Then press **F5** or use the integrated terminal to run `npm run dev`.

## How to Use

1. **Legend Pool** — tick/untick which legends to consider (at least 2)
2. **Preferences** — answer questions about your playstyle, goals, and trait priorities
3. **Results** — see your top 3 duos with scores, synergy explanations, and tradeoffs

Your preferences are saved automatically in `localStorage` between sessions.
Use the **Compare** button on any two duo cards to compare them side-by-side.

---

## Where to Edit Things

### Add / Remove / Tweak Legends

Edit **`src/config/gameConfig.ts`** → `LEGENDS` array.

Each legend has 12 attributes rated 0–10:

| Attribute | Meaning |
|---|---|
| `aggression` | How offensive the legend is |
| `defense` | Damage mitigation and cover tools |
| `mobility` | Movement and repositioning |
| `recon` | Information gathering |
| `support` | Healing, reviving, buffing |
| `resetPotential` | Ability to disengage mid-fight |
| `survivability` | Staying alive under pressure |
| `zoneControl` | Claiming/denying space |
| `easeOfUse` | How approachable the kit is (10 = easiest) |
| `carryPotential` | Solo-carry ability |
| `rankedConsistency` | Reliable ranked LP gain |
| `funFactor` | Subjective enjoyment |

### Add / Edit Synergy Rules

Edit **`src/config/gameConfig.ts`** → `SYNERGY_RULES` array.

Each rule has:
- `legendIds`: the two legend IDs the rule applies to
- `score`: 0–10 synergy strength
- `tags`: short labels shown in the UI
- `description`: explanation shown in results
- `weakness`: optional tradeoff note

Explicit rules blend 70/30 with generic synergy scoring.

### Change the Questions

Edit **`src/config/gameConfig.ts`** → `QUESTIONS` array.

Supports three question types:
- `radio` — multiple choice (one selection)
- `slider` — single 0-5 range
- `range-group` — group of sliders (used for trait weights)

### Tune the Scoring Algorithm

Edit **`src/scoring/scorer.ts`**.

Key sections are clearly commented:
1. **Playstyle multipliers** — `getPlaystyleMultipliers()` — how much aggressive/defensive playstyle shifts weights
2. **Goal weight bonuses** — `getGoalWeightBonus()` — extra weight added for fun/ranked/carry/synergy goals
3. **Individual scoring** — `scoreIndividual()` — weighted sum of legend attributes
4. **Generic synergy patterns** — `computeGenericSynergy()` — auto-computed synergy bonuses/penalties
5. **Explanation text** — `buildExplanation()` — the human-readable "why" text

### Change Default Preferences

Edit **`src/config/gameConfig.ts`** → `DEFAULT_PREFERENCES`.

---

## Folder Structure

```
src/
├── config/
│   └── gameConfig.ts    ← EDIT THIS for legends, questions, rules, weights
├── scoring/
│   └── scorer.ts        ← scoring algorithm
├── components/
│   ├── LegendPool.tsx   ← step 1: legend selection
│   ├── Preferences.tsx  ← step 2: preference form
│   ├── Results.tsx      ← step 3: results + compare
│   └── DuoCard.tsx      ← single duo result card
├── types/
│   └── index.ts         ← shared TypeScript interfaces
├── App.tsx              ← app shell, state, localStorage
└── App.css              ← all styles (CSS variables at the top to retheme)
```

## Restyling

All colors are CSS variables at the top of `src/App.css`:

```css
:root {
  --accent: #ff4655;   /* the main red accent */
  --bg: #0a0a0f;       /* page background */
  --surface: #12121c;  /* card backgrounds */
  /* ... */
}
```

## Tech Stack

- [Vite](https://vitejs.dev/) — dev server + build tool
- [React 18](https://react.dev/) — UI
- [TypeScript](https://www.typescriptlang.org/) — type safety
- No database, no backend, no auth — fully local
