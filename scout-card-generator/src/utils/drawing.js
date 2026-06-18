// Ramer-Douglas-Peucker line simplification
export function simplifyLine(pts, tol) {
  if (pts.length <= 2) return pts;
  let maxDist = 0, maxIdx = 0;
  const first = pts[0], last = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], first, last);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > tol) {
    const left = simplifyLine(pts.slice(0, maxIdx + 1), tol);
    const right = simplifyLine(pts.slice(maxIdx), tol);
    return left.slice(0, left.length - 1).concat(right);
  }
  return [first, last];
}

function perpDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return Math.sqrt((p.x - a.x) * (p.x - a.x) + (p.y - a.y) * (p.y - a.y));
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

// Catmull-Rom spline to SVG cubic bezier path
export function smoothPath(pts) {
  if (pts.length < 2) return '';
  if (pts.length === 2) {
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  }
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 === pts.length ? i + 1 : i + 2];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// Build SVG path d attribute for a line
export function buildLinePath(pts, style) {
  if (!pts || pts.length < 2) return '';
  const isCurved = style === 'curved' || style === 'curvedarrow' || style === 'curvedblock';
  if (isCurved) return smoothPath(pts);
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
  }
  return d;
}

// Build straight-line path for hit testing (even for curved lines)
export function buildHitPath(pts) {
  if (!pts || pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
  }
  return d;
}

export const DRAW_COLORS = ['#cc0000', '#0055cc', '#000000', '#888888', '#9333ea', '#16a34a', '#1A3C2B'];
export const DRAW_WIDTHS = [1.5, 2.5, 4];
export const DRAW_STYLES = [
  { key: 'solid', label: 'Solid' },
  { key: 'dashed', label: 'Dashed' },
  { key: 'arrow', label: 'Arrow' },
  { key: 'block', label: 'Block' },
  { key: 'curved', label: 'Curved' },
  { key: 'curvedarrow', label: 'Curved Arrow' },
  { key: 'curvedblock', label: 'Curved Block' },
];
