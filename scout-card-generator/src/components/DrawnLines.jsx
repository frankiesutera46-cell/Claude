import { buildLinePath, buildHitPath } from '../utils/drawing';

export default function DrawnLines({ lines, eraserMode, onRemoveLine }) {
  if (!lines || lines.length === 0) return null;

  return (
    <g>
      {lines.map((ln, idx) => {
        if (!ln.pts || ln.pts.length < 2) return null;
        const pathD = buildLinePath(ln.pts, ln.style);
        const hitPathD = buildHitPath(ln.pts);
        const isDashed = ln.style === 'dashed';
        const hasArrow = ln.style === 'arrow' || ln.style === 'curvedarrow';
        const hasBlock = ln.style === 'block' || ln.style === 'curvedblock';
        const width = ln.pressureWidth || ln.width || 2;

        // Arrow endpoint
        let arrowPoly = null;
        if (hasArrow && ln.pts.length >= 2) {
          const ep = ln.pts[ln.pts.length - 1];
          const lp = ln.pts[Math.max(0, ln.pts.length - 3)];
          const ang = Math.atan2(ep.y - lp.y, ep.x - lp.x);
          const sz = Math.max(6, width * 3);
          const ax1 = ep.x - sz * Math.cos(ang - 0.4);
          const ay1 = ep.y - sz * Math.sin(ang - 0.4);
          const ax2 = ep.x - sz * Math.cos(ang + 0.4);
          const ay2 = ep.y - sz * Math.sin(ang + 0.4);
          arrowPoly = (
            <polygon
              points={`${ep.x.toFixed(1)},${ep.y.toFixed(1)} ${ax1.toFixed(1)},${ay1.toFixed(1)} ${ax2.toFixed(1)},${ay2.toFixed(1)}`}
              fill={ln.color}
            />
          );
        }

        // Block endpoint (perpendicular cap)
        let blockLine = null;
        if (hasBlock && ln.pts.length >= 2) {
          const ep = ln.pts[ln.pts.length - 1];
          const lp = ln.pts[Math.max(0, ln.pts.length - 3)];
          const ang = Math.atan2(ep.y - lp.y, ep.x - lp.x);
          const sz = Math.max(7, width * 3);
          const bx1 = ep.x + sz * Math.cos(ang + 1.57);
          const by1 = ep.y + sz * Math.sin(ang + 1.57);
          const bx2 = ep.x + sz * Math.cos(ang - 1.57);
          const by2 = ep.y + sz * Math.sin(ang - 1.57);
          blockLine = (
            <line
              x1={bx1.toFixed(1)} y1={by1.toFixed(1)}
              x2={bx2.toFixed(1)} y2={by2.toFixed(1)}
              stroke={ln.color} strokeWidth={2.5} strokeLinecap="round"
            />
          );
        }

        return (
          <g key={idx}>
            {/* Invisible fat hit area for eraser */}
            <path
              d={hitPathD}
              fill="none"
              stroke="transparent"
              strokeWidth={Math.max(14, width + 10)}
              style={{ cursor: eraserMode ? 'pointer' : 'default' }}
              onPointerDown={eraserMode ? (e) => {
                e.stopPropagation();
                onRemoveLine?.(idx);
              } : undefined}
            />
            {/* Visible line */}
            <path
              d={pathD}
              fill="none"
              stroke={ln.color}
              strokeWidth={width}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={isDashed ? '8,5' : 'none'}
              opacity={0.9}
              pointerEvents="none"
            />
            {arrowPoly}
            {blockLine}
          </g>
        );
      })}
    </g>
  );
}
