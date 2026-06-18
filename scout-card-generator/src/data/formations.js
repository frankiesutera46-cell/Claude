// All positions relative to a 600x400 SVG viewBox
// Center of OL is at approximately (300, 280)
// Y increases downward (offense at bottom, going up)

export const POSITIONS = {
  C: 'C',
  LG: 'LG',
  RG: 'RG',
  LT: 'LT',
  RT: 'RT',
  QB: 'QB',
  RB: 'RB',
  FB: 'FB',
  X: 'X',
  Y: 'Y',
  Z: 'Z',
  H: 'H',
  F: 'F',
  T: 'T',
};

// Standard OL spacing
const OL_Y = 280;
const OL_SPACING = 30;
const C_X = 300;

const OL_BASE = {
  C: { x: C_X, y: OL_Y, label: 'C' },
  LG: { x: C_X - OL_SPACING, y: OL_Y, label: 'LG' },
  RG: { x: C_X + OL_SPACING, y: OL_Y, label: 'RG' },
  LT: { x: C_X - OL_SPACING * 2, y: OL_Y, label: 'LT' },
  RT: { x: C_X + OL_SPACING * 2, y: OL_Y, label: 'RT' },
};

export const FORMATIONS = {
  '2x2': {
    name: '2x2 (Doubles)',
    personnel: '11',
    players: {
      ...OL_BASE,
      QB: { x: 300, y: 320, label: 'QB' },
      RB: { x: 300, y: 360, label: 'RB' },
      X: { x: 80, y: 278, label: 'X' },
      H: { x: 160, y: 260, label: 'H' },
      Y: { x: 440, y: 260, label: 'Y' },
      Z: { x: 520, y: 278, label: 'Z' },
    },
  },
  '3x1_trips_right': {
    name: '3x1 Trips Right',
    personnel: '11',
    players: {
      ...OL_BASE,
      QB: { x: 300, y: 320, label: 'QB' },
      RB: { x: 300, y: 360, label: 'RB' },
      X: { x: 80, y: 278, label: 'X' },
      H: { x: 410, y: 260, label: 'H' },
      Y: { x: 460, y: 278, label: 'Y' },
      Z: { x: 530, y: 260, label: 'Z' },
    },
  },
  '3x1_trips_left': {
    name: '3x1 Trips Left',
    personnel: '11',
    players: {
      ...OL_BASE,
      QB: { x: 300, y: 320, label: 'QB' },
      RB: { x: 300, y: 360, label: 'RB' },
      Z: { x: 520, y: 278, label: 'Z' },
      H: { x: 190, y: 260, label: 'H' },
      Y: { x: 140, y: 278, label: 'Y' },
      X: { x: 70, y: 260, label: 'X' },
    },
  },
  'empty_3x2': {
    name: 'Empty 3x2',
    personnel: '10',
    players: {
      ...OL_BASE,
      QB: { x: 300, y: 320, label: 'QB' },
      H: { x: 160, y: 256, label: 'H' },
      X: { x: 70, y: 278, label: 'X' },
      F: { x: 410, y: 256, label: 'F' },
      Y: { x: 460, y: 278, label: 'Y' },
      Z: { x: 530, y: 256, label: 'Z' },
    },
  },
  'empty_3x2_left': {
    name: 'Empty 3x2 Left',
    personnel: '10',
    players: {
      ...OL_BASE,
      QB: { x: 300, y: 320, label: 'QB' },
      X: { x: 70, y: 256, label: 'X' },
      H: { x: 140, y: 278, label: 'H' },
      F: { x: 190, y: 256, label: 'F' },
      Y: { x: 440, y: 256, label: 'Y' },
      Z: { x: 530, y: 278, label: 'Z' },
    },
  },
  'i_form': {
    name: 'I-Formation',
    personnel: '21',
    players: {
      ...OL_BASE,
      QB: { x: 300, y: 320, label: 'QB' },
      FB: { x: 300, y: 350, label: 'FB' },
      RB: { x: 300, y: 380, label: 'RB' },
      X: { x: 80, y: 278, label: 'X' },
      Z: { x: 520, y: 278, label: 'Z' },
    },
  },
  'pistol_2x2': {
    name: 'Pistol 2x2',
    personnel: '11',
    players: {
      ...OL_BASE,
      QB: { x: 300, y: 310, label: 'QB' },
      RB: { x: 300, y: 350, label: 'RB' },
      X: { x: 80, y: 278, label: 'X' },
      H: { x: 160, y: 260, label: 'H' },
      Y: { x: 440, y: 260, label: 'Y' },
      Z: { x: 520, y: 278, label: 'Z' },
    },
  },
  'pistol_3x1': {
    name: 'Pistol 3x1',
    personnel: '11',
    players: {
      ...OL_BASE,
      QB: { x: 300, y: 310, label: 'QB' },
      RB: { x: 300, y: 350, label: 'RB' },
      X: { x: 80, y: 278, label: 'X' },
      H: { x: 410, y: 260, label: 'H' },
      Y: { x: 460, y: 278, label: 'Y' },
      Z: { x: 530, y: 260, label: 'Z' },
    },
  },
  'wing_right': {
    name: 'Wing Right (12 Pers)',
    personnel: '12',
    players: {
      ...OL_BASE,
      QB: { x: 300, y: 320, label: 'QB' },
      RB: { x: 300, y: 360, label: 'RB' },
      X: { x: 80, y: 278, label: 'X' },
      Y: { x: C_X + OL_SPACING * 2 + 18, y: 265, label: 'Y' },
      Z: { x: 520, y: 278, label: 'Z' },
      H: { x: C_X + OL_SPACING * 2 + 18, y: 295, label: 'H' },
    },
  },
  'wing_left': {
    name: 'Wing Left (12 Pers)',
    personnel: '12',
    players: {
      ...OL_BASE,
      QB: { x: 300, y: 320, label: 'QB' },
      RB: { x: 300, y: 360, label: 'RB' },
      Z: { x: 520, y: 278, label: 'Z' },
      Y: { x: C_X - OL_SPACING * 2 - 18, y: 265, label: 'Y' },
      X: { x: 80, y: 278, label: 'X' },
      H: { x: C_X - OL_SPACING * 2 - 18, y: 295, label: 'H' },
    },
  },
  'bunch_right': {
    name: 'Bunch Right',
    personnel: '11',
    players: {
      ...OL_BASE,
      QB: { x: 300, y: 320, label: 'QB' },
      RB: { x: 300, y: 360, label: 'RB' },
      X: { x: 80, y: 278, label: 'X' },
      Z: { x: 460, y: 260, label: 'Z' },
      Y: { x: 490, y: 278, label: 'Y' },
      H: { x: 460, y: 296, label: 'H' },
    },
  },
  'bunch_left': {
    name: 'Bunch Left',
    personnel: '11',
    players: {
      ...OL_BASE,
      QB: { x: 300, y: 320, label: 'QB' },
      RB: { x: 300, y: 360, label: 'RB' },
      Z: { x: 520, y: 278, label: 'Z' },
      X: { x: 140, y: 260, label: 'X' },
      Y: { x: 110, y: 278, label: 'Y' },
      H: { x: 140, y: 296, label: 'H' },
    },
  },
  'unbalanced_right': {
    name: 'Unbalanced Right',
    personnel: '12',
    players: {
      C: { x: C_X - OL_SPACING, y: OL_Y, label: 'C' },
      LG: { x: C_X - OL_SPACING * 2, y: OL_Y, label: 'LG' },
      RG: { x: C_X, y: OL_Y, label: 'RG' },
      LT: { x: C_X - OL_SPACING * 3, y: OL_Y, label: 'LT' },
      RT: { x: C_X + OL_SPACING, y: OL_Y, label: 'RT' },
      QB: { x: C_X - OL_SPACING, y: 320, label: 'QB' },
      RB: { x: C_X - OL_SPACING, y: 360, label: 'RB' },
      X: { x: 80, y: 278, label: 'X' },
      Y: { x: C_X + OL_SPACING * 2, y: 278, label: 'Y' },
      Z: { x: 520, y: 278, label: 'Z' },
      H: { x: C_X + OL_SPACING * 2 + 20, y: 260, label: 'H' },
    },
  },
  'shotgun_2x2': {
    name: 'Shotgun 2x2',
    personnel: '11',
    players: {
      ...OL_BASE,
      QB: { x: 300, y: 330, label: 'QB' },
      RB: { x: 345, y: 335, label: 'RB' },
      X: { x: 80, y: 278, label: 'X' },
      H: { x: 160, y: 260, label: 'H' },
      Y: { x: 440, y: 260, label: 'Y' },
      Z: { x: 520, y: 278, label: 'Z' },
    },
  },
  'ace_3x1': {
    name: 'Ace 3x1 (No Back)',
    personnel: '11',
    players: {
      ...OL_BASE,
      QB: { x: 300, y: 320, label: 'QB' },
      RB: { x: 255, y: 325, label: 'RB' },
      X: { x: 80, y: 278, label: 'X' },
      H: { x: 410, y: 260, label: 'H' },
      Y: { x: 460, y: 278, label: 'Y' },
      Z: { x: 530, y: 260, label: 'Z' },
    },
  },
  'jumbo_goal_line': {
    name: 'Jumbo / Goal Line',
    personnel: '22',
    players: {
      ...OL_BASE,
      QB: { x: 300, y: 320, label: 'QB' },
      FB: { x: 300, y: 348, label: 'FB' },
      RB: { x: 300, y: 378, label: 'RB' },
      Y: { x: C_X + OL_SPACING * 2 + 18, y: 278, label: 'Y' },
      H: { x: C_X - OL_SPACING * 2 - 18, y: 278, label: 'H' },
    },
  },
};

// Per-position route colors for visual distinction
export const PLAYER_COLORS = {
  X: '#cc0000',   // red
  Z: '#008800',   // green
  Y: '#0055cc',   // blue
  H: '#cc6600',   // orange
  F: '#8800aa',   // purple
  T: '#cc6600',   // orange
  QB: '#444444',  // dark gray
  RB: '#222222',  // black
  FB: '#222222',  // black
  C: '#ccaa00',   // gold
  LG: '#ccaa00',
  RG: '#ccaa00',
  LT: '#ccaa00',
  RT: '#ccaa00',
};

export const ROUTE_TYPES = {
  // Pass routes
  go: { name: 'Go/Fade', type: 'pass' },
  slant: { name: 'Slant', type: 'pass' },
  out: { name: 'Out', type: 'pass' },
  in: { name: 'In/Dig', type: 'pass' },
  curl: { name: 'Curl', type: 'pass' },
  comeback: { name: 'Comeback', type: 'pass' },
  corner: { name: 'Corner', type: 'pass' },
  post: { name: 'Post', type: 'pass' },
  hitch: { name: 'Hitch', type: 'pass' },
  flat: { name: 'Flat', type: 'pass' },
  wheel: { name: 'Wheel', type: 'pass' },
  seam: { name: 'Seam', type: 'pass' },
  cross: { name: 'Shallow Cross', type: 'pass' },
  angle: { name: 'Angle', type: 'pass' },
  screen: { name: 'Screen', type: 'pass' },
  swing: { name: 'Swing', type: 'pass' },
  drag: { name: 'Drag', type: 'pass' },
  over: { name: 'Over', type: 'pass' },
  // Run assignments
  run_inside: { name: 'Inside Zone', type: 'run' },
  run_outside: { name: 'Outside Zone', type: 'run' },
  run_power: { name: 'Power', type: 'run' },
  run_counter: { name: 'Counter', type: 'run' },
  run_draw: { name: 'Draw', type: 'run' },
  run_sweep: { name: 'Sweep', type: 'run' },
  run_dive: { name: 'Dive', type: 'run' },
  // Blocking
  block_pass: { name: 'Pass Pro', type: 'block' },
  block_run: { name: 'Run Block', type: 'block' },
  block_pull: { name: 'Pull', type: 'block' },
  block_chip: { name: 'Chip & Release', type: 'block' },
  // Motion
  motion_left: { name: 'Motion Left', type: 'motion' },
  motion_right: { name: 'Motion Right', type: 'motion' },
};

// Route path definitions relative to player position
// Each route is an array of {dx, dy} offsets from the player position
// Negative dy = upfield (toward defense)
export function getRoutePath(routeKey, playerX, playerY, facingLeft = false) {
  // FIX: mirror was inverted — left-side players face right (mirror=-1 flips outward correctly)
  const mirror = facingLeft ? 1 : -1;
  const paths = {
    go: [{ dx: 0, dy: -120 }],
    slant: [{ dx: 0, dy: -20 }, { dx: -30 * mirror, dy: -80 }],
    out: [{ dx: 0, dy: -50 }, { dx: 40 * mirror, dy: 0 }],
    in: [{ dx: 0, dy: -50 }, { dx: -40 * mirror, dy: 0 }],
    curl: [{ dx: 0, dy: -55 }, { dx: 5 * mirror, dy: 10 }],
    comeback: [{ dx: 0, dy: -60 }, { dx: 20 * mirror, dy: 15 }],
    corner: [{ dx: 0, dy: -40 }, { dx: 30 * mirror, dy: -50 }],
    post: [{ dx: 0, dy: -40 }, { dx: -30 * mirror, dy: -50 }],
    hitch: [{ dx: 0, dy: -20 }, { dx: 3 * mirror, dy: 8 }],
    flat: [{ dx: 25 * mirror, dy: -15 }],
    wheel: [{ dx: 15 * mirror, dy: -10 }, { dx: 5 * mirror, dy: -80 }],
    seam: [{ dx: 0, dy: -110 }],
    cross: [{ dx: 0, dy: -15 }, { dx: -80 * mirror, dy: -5 }],
    angle: [{ dx: -10 * mirror, dy: 10 }, { dx: -30 * mirror, dy: -50 }],
    screen: [{ dx: 10 * mirror, dy: 15 }, { dx: 25 * mirror, dy: 5 }],
    swing: [{ dx: 30 * mirror, dy: 5 }, { dx: 20 * mirror, dy: -30 }],
    drag: [{ dx: 0, dy: -10 }, { dx: -100 * mirror, dy: -5 }],
    over: [{ dx: 0, dy: -30 }, { dx: -80 * mirror, dy: -10 }],
    // Run paths
    run_inside: [{ dx: -5 * mirror, dy: -50 }],
    run_outside: [{ dx: 20 * mirror, dy: -15 }, { dx: 15 * mirror, dy: -40 }],
    run_power: [{ dx: -10 * mirror, dy: -20 }, { dx: 0, dy: -35 }],
    run_counter: [{ dx: 10 * mirror, dy: -5 }, { dx: -20 * mirror, dy: -50 }],
    run_draw: [{ dx: 0, dy: 8 }, { dx: -5 * mirror, dy: -60 }],
    run_sweep: [{ dx: 35 * mirror, dy: 0 }, { dx: 15 * mirror, dy: -50 }],
    run_dive: [{ dx: 0, dy: -40 }],
    // Block
    block_pass: [{ dx: 0, dy: -8 }],
    block_run: [{ dx: -5 * mirror, dy: -12 }],
    block_pull: [{ dx: 30 * mirror, dy: 5 }, { dx: 10 * mirror, dy: -25 }],
    block_chip: [{ dx: 5 * mirror, dy: -10 }, { dx: 10 * mirror, dy: -20 }],
    // Motion
    motion_left: [{ dx: -60, dy: 0 }],
    motion_right: [{ dx: 60, dy: 0 }],
  };

  const segments = paths[routeKey] || [{ dx: 0, dy: -40 }];
  const points = [{ x: playerX, y: playerY }];
  let cx = playerX, cy = playerY;
  for (const seg of segments) {
    cx += seg.dx;
    cy += seg.dy;
    points.push({ x: cx, y: cy });
  }
  return points;
}

export function mirrorFormation(formation) {
  const centerX = 300;
  const mirrored = { ...formation, name: formation.name + ' (Mirrored)', players: {} };
  for (const [key, player] of Object.entries(formation.players)) {
    mirrored.players[key] = {
      ...player,
      x: centerX + (centerX - player.x),
    };
  }
  return mirrored;
}

// Defensive front presets — positioned on 600x400 SVG with LOS at y=250
let defId = 1;
function def(x, y, label) {
  return { id: `def-${defId++}`, x, y, label };
}

export function getDefensiveFront(frontKey) {
  defId = 1;
  const fronts = {
    '4-3': [
      def(200, 238, 'DE'), def(270, 238, 'DT'), def(330, 238, 'DT'), def(400, 238, 'DE'),
      def(160, 210, 'WLB'), def(300, 210, 'MLB'), def(420, 210, 'SLB'),
      def(70, 225, 'CB'), def(530, 225, 'CB'),
      def(240, 130, 'FS'), def(380, 155, 'SS'),
    ],
    '3-4': [
      def(220, 238, 'DE'), def(300, 238, 'NT'), def(380, 238, 'DE'),
      def(140, 215, 'OLB'), def(260, 210, 'ILB'), def(340, 210, 'ILB'), def(460, 215, 'OLB'),
      def(70, 225, 'CB'), def(530, 225, 'CB'),
      def(240, 130, 'FS'), def(380, 155, 'SS'),
    ],
    'nickel': [
      def(200, 238, 'DE'), def(270, 238, 'DT'), def(330, 238, 'DT'), def(400, 238, 'DE'),
      def(210, 210, 'LB'), def(370, 210, 'LB'),
      def(70, 225, 'CB'), def(530, 225, 'CB'), def(155, 215, 'NB'),
      def(240, 130, 'FS'), def(380, 155, 'SS'),
    ],
    'dime': [
      def(200, 238, 'DE'), def(270, 238, 'DT'), def(330, 238, 'DT'), def(400, 238, 'DE'),
      def(300, 210, 'LB'),
      def(70, 225, 'CB'), def(530, 225, 'CB'), def(155, 215, 'NB'), def(445, 215, 'NB'),
      def(240, 130, 'FS'), def(380, 155, 'SS'),
    ],
    'bear': [
      def(190, 238, 'DE'), def(255, 238, 'DT'), def(300, 238, 'NT'), def(345, 238, 'DT'), def(410, 238, 'DE'),
      def(230, 210, 'LB'), def(370, 210, 'LB'),
      def(70, 225, 'CB'), def(530, 225, 'CB'),
      def(240, 130, 'FS'), def(380, 155, 'SS'),
    ],
    '46': [
      def(200, 238, 'DE'), def(270, 238, 'DT'), def(330, 238, 'DT'), def(400, 238, 'DE'),
      def(160, 215, 'OLB'), def(300, 210, 'MLB'), def(380, 215, 'SS'),
      def(70, 225, 'CB'), def(530, 225, 'CB'),
      def(240, 130, 'FS'), def(440, 210, 'SLB'),
    ],
    'none': [],
  };
  return (fronts[frontKey] || []).map((d, i) => ({ ...d, id: `def-${i + 1}` }));
}
