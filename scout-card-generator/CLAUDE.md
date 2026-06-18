# Scout Card Generator — Claude Code Context

## What This Is
A single-file HTML/JS/SVG football scout card generator built for a high school defensive coordinator. It creates offensive scout cards for defensive game prep — the coach watches film, identifies opponent offensive tendencies, then builds visual play cards for the scout team to rep in practice.

## Current State (v32)
The app is a single `index.html` file (~1650 lines) with everything inline. It works but is hitting the limits of what's maintainable in one file. The coach (Frankie, DC at Corner Canyon HS in Utah) has been iterating on this with very specific visual preferences.

## Tech Stack
- Pure vanilla JS (no frameworks, no build tools)
- SVG-based field rendering (all players, routes, field lines are SVG elements)
- All state in JS variables, localStorage for save/load
- No external dependencies

## Architecture Overview

### Field Constants
- `FW=720, FH=520` — SVG viewBox dimensions
- `TOTAL_YARDS=35` — field shows 35 yards total
- `LOS_YARDS_FROM_TOP=25` — 25 yards of route space above LOS, 10 below
- `YPX = FIELD_PX / TOTAL_YARDS` — ~14 pixels per yard
- `OL_SP=36` — spacing between OL
- Hash marks at HS dimensions (33.3% from each sideline)

### Player Types & Colors
- `wr` (red circle, white letter) — X, Z, H receivers
- `rb` (green circle, white letter) — RB, FB
- `te` (yellow/gold circle, white letter) — Y tight end
- `ol` (black outline circle, no letter) — LG, RG, LT, RT
- `c` (black outline square, no letter) — Center
- `qb` (black outline circle, "Q") — Quarterback
- Defense — black text only, no shapes (just letters like E, T, N, W, M, S, C, FS, SS)

### Key Data Structures

**Card Object:**
```js
{
  id: number,
  fk: string,        // formation key ('doubR', '3x1R', etc.)
  dfk: string,       // defensive front key ('43over', 'odd', etc.)
  play: string,      // play name
  hash: string,      // 'M', 'L', 'R', 'LM', 'RM'
  dd: string,        // down & distance
  notes: string,     // card notes
  mir: boolean,      // mirror formation
  asgn: {},          // route assignments {playerKey: routeKey}
  pn: {},            // player notes {playerKey: noteText}
  opos: {},          // custom offensive positions {playerKey: {x,y}}
  dpos: {},          // custom defensive positions {playerKey: {x,y}}
  lines: [],         // freehand drawn lines [{pts:[{x,y}...], color, width, style}]
  lpos: {},          // label positions {play:{x,y}, dd:{x,y}, notes:{x,y}}
  cl: {}             // custom labels {playerKey: customLabel} (jersey numbers)
}
```

**Formation Object:**
```js
{
  name: string,
  p: function() {    // returns player positions
    return {
      C: {x, y, l:'C', side:'c'},
      LG: {x, y, l:'LG', side:'ol'},
      // ... etc
    }
  }
}
```

### Formations Available
- Doubles Rt/Lt (default)
- 3x1 Trips R/L
- Trey Rt/Lt (3x1 with TE)
- Deuce Rt/Lt (2x2 with TE)
- Empty 3x2
- I-Form
- Pistol 2x2 / Pistol 3x1
- Bunch R/L
- Wing R (12 personnel)
- Jumbo / Goal Line

### Defensive Fronts
- 4-3 Over, 4-3 Under
- 3-4 / Odd
- Tite
- Bear
- Nickel
- Dime

### Route System
Routes are defined as arrays of [dx, dy] offsets from the player position. They use:
- `Y = YPX` for vertical (yard-scaled)
- `X = YPX * 0.7` for horizontal
- `m` multiplier for left/right mirroring based on player side of field

Route categories: Outside, Inside, Short/Slot, Run, Block, Motion

### Blocking Symbols (v32 addition)
12 blocking schemes with unique endpoint symbols:
- Drive/Down/Reach — flat perpendicular cap
- Pull/Trap/Kick/Lead/Combo/Fold/Wham — arrow tip
- Pass Pro — dashed line with cup/arc
- Cut — X symbol

### Hash System
5 positions: Middle, Left Hash, Right Hash, Left Middle, Right Middle
Hash offset shifts entire formation laterally, clamped to field boundaries.
Custom-dragged positions override the offset per player.

### Drawing System (Pen Tool)
- Freehand polyline drawing on SVG
- Color picker (7 colors), width (3 sizes), style (solid/dashed/arrow)
- Eraser (click lines to delete)
- Undo / Clear All
- Lines stored per card, simplified via Ramer-Douglas-Peucker algorithm

### Label System
Play name, D&D, notes, and player notes render as draggable SVG text on the field.
Custom positions stored in `card.lpos`.

### Export
- PNG export (current card, 2x resolution via canvas)
- PDF export (opens print-friendly window with all cards, Ctrl+P to print/save)

## PRIORITY FEATURES TO BUILD NEXT

### 1. Editable Route Waypoints (HIGHEST PRIORITY)
**The coach wants to grab any point on a route and drag it to reshape the angle/length.**

Implementation plan:
- When a route is assigned to a player, generate initial waypoints from the route template and store them in `card.routePts[playerKey]` as absolute {x,y} coordinates
- When a player with a route is selected, render small draggable handles (circles) at each waypoint
- Dragging a handle updates the stored coordinates
- Add ability to add new waypoints (click on the line between two points) and remove waypoints (double-click or right-click)
- Route template is just the starting point — once customized, the stored points override

### 2. Text Boxes on the Field
- Add floating text annotations anywhere on the field
- Click to create, drag to move, double-click to edit
- Store in `card.textBoxes: [{x, y, text, color, size}]`
- Render as draggable SVG text elements

### 3. Card Tagging & Filtering
- Add a tag dropdown or multi-select to each card: Run, Pass, Screen, RPO, Play Action, Boot, etc.
- Store in `card.tags: []`
- Add filter buttons above the sidebar card list
- When filtered, only show cards matching the tag

### 4. PlayGrid Export
- Print multiple cards per page in a grid layout
- Options: 1-up (current), 2-up, 4-up, 6-up
- Each cell shows the SVG card at reduced size with play name overlay

### 5. Practice Script Builder
- Drag cards into a practice script order
- Label periods (Indy, Team, 7on7, etc.)
- Print the script as a numbered list with card thumbnails

## VISUAL DESIGN NOTES
- Dark UI theme with champagne gold (#C6A355) accents — "SEC gameday" aesthetic
- DM Sans font
- Field card itself is white with clean black/gray markings
- The coach is very particular about player alignment and route shapes
- All slot/inside receivers sit BEHIND the LOS (OL_Y+18), outside WRs on the LOS
- TE sits tight to OL (OL_SP*3 from center), boundary WR on TE side comes off the ball
- QB/RB at 5 yards deep in shotgun (OL_Y+70)
- Yard numbers only show 10 and 20 on the defensive side, font-size 22

## COACH'S PREFERENCES
- Casual, fast iterations — he sends screenshots and says "make it look like this"
- Wants it to feel like Pro Quick Draw or FirstDown PlayBook
- Defensive coordinator perspective — scouting opposing offenses
- Corner Canyon HS (Chargers), Draper Utah
- Runs match-quarters defense (Cover 7)
- Needs 30-40 scout cards per week during season
