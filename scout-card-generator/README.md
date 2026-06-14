# Scout Card Generator

A React-based tool for creating weekly offensive scout cards for defensive game prep. Built for coaches who currently hand-draw scout cards and want to cut card creation time from 3+ hours to under 1 hour.

## What It Does

- **16 pre-built offensive formations** (2x2, 3x1 Trips, Empty, Pistol, I-Form, Bunch, Wing, Unbalanced, Jumbo, etc.) with all 11 players drawn
- **Click-to-assign routes/paths** — select a player, pick from 18 pass routes, 7 run paths, 4 blocking assignments, or motion
- **Card metadata** — hash (L/M/R), play name, down & distance, per-player notes, general card notes
- **Mirror/flip** any formation with one click for left/right hash reps
- **Card management** — add, duplicate, delete, reorder cards in sidebar
- **Export to PDF** — one card per landscape page, print-ready
- **Export to PowerPoint** — one card per slide, dark theme, ready for projection or sharing
- **Save/Load** — persist your card deck to localStorage between sessions

## Quick Start

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Workflow

1. Set your game/week title at the top
2. Click **+ New Card** to add a scout card
3. Pick a formation from the dropdown
4. Click any player on the field → assign their route from the right panel
5. Fill in hash, play name, down & distance, notes
6. Use **↔ Flip** to mirror the formation
7. Use **⧉** to duplicate a card (great for same formation, different play)
8. Repeat for all 30-40 cards
9. Hit **Export PDF** or **Export PPTX**

## Route Types

| Category | Routes |
|----------|--------|
| Pass | Go, Slant, Out, In/Dig, Curl, Comeback, Corner, Post, Hitch, Flat, Wheel, Seam, Shallow Cross, Angle, Screen, Swing, Drag, Over |
| Run | Inside Zone, Outside Zone, Power, Counter, Draw, Sweep, Dive |
| Block | Pass Pro, Run Block, Pull, Chip & Release |
| Motion | Motion Left, Motion Right |

## Formations Included

2x2 Doubles, 3x1 Trips Right, 3x1 Trips Left, Empty 3x2, Empty 3x2 Left, I-Formation, Pistol 2x2, Pistol 3x1, Wing Right (12), Wing Left (12), Bunch Right, Bunch Left, Unbalanced Right, Shotgun 2x2, Ace 3x1, Jumbo/Goal Line

## Extending with Claude Code

This project is built to be iterable with Claude Code. Here are natural next tasks:

- **Add custom formations** — modify `src/data/formations.js` to add your opponent's specific looks
- **Drag-and-drop player positions** — let users manually adjust player alignment
- **CSV import** — feed in a spreadsheet of scouted plays and auto-generate cards
- **Tendency summary page** — auto-generate a formation/play tendency breakdown
- **Custom route drawing** — freehand draw routes instead of selecting from templates
- **Add defensive alignment overlay** — show your defense's response on the same card
- **Print multiple cards per page** — 2-up or 4-up layouts for smaller practice cards

## Tech Stack

- React + Vite
- Tailwind CSS
- jsPDF (PDF export)
- PptxGenJS (PowerPoint export)
- SVG-based field rendering (no canvas dependency)

## File Structure

```
src/
  App.jsx              — Main app shell, card management, export buttons
  components/
    CardEditor.jsx     — Single card editor (formation, routes, metadata)
    FieldCanvas.jsx    — SVG field rendering (players, routes, field lines)
    PrintCard.jsx      — Print-optimized card layout
    RouteAssigner.jsx  — Route selection panel
  data/
    formations.js      — Formation templates, route paths, mirror logic
  utils/
    export.js          — PDF and PPTX generation
```
