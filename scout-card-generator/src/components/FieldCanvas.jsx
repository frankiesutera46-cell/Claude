import { useState, useRef, useCallback } from 'react';
import { getRoutePath, ROUTE_TYPES, PLAYER_COLORS } from '../data/formations';
import { simplifyLine, buildLinePath } from '../utils/drawing';
import DrawnLines from './DrawnLines';

const FIELD_WIDTH = 600;
const FIELD_HEIGHT = 400;
const LOS_Y = 250;

const YARD_LINES = [
  { y: 50, label: '20' },
  { y: 100, label: '30' },
  { y: 150, label: '40' },
  { y: 200, label: '50' },
  { y: 300, label: '40' },
  { y: 350, label: '30' },
];

function FieldLines() {
  return (
    <g>
      <rect x={0} y={0} width={FIELD_WIDTH} height={FIELD_HEIGHT} fill="#f8f8f0" />
      <line x1={38} y1={0} x2={38} y2={FIELD_HEIGHT} stroke="#888" strokeWidth={1.5} />
      <line x1={562} y1={0} x2={562} y2={FIELD_HEIGHT} stroke="#888" strokeWidth={1.5} />
      {YARD_LINES.map(({ y, label }) => (
        <g key={`yard-${y}`}>
          <line x1={38} y1={y} x2={562} y2={y} stroke="#aaa" strokeWidth={1} />
          <text x={58} y={y} fill="#bbb" fontSize={28} fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle" dominantBaseline="central" transform={`rotate(-90, 58, ${y})`} opacity={0.5}>{label}</text>
          <text x={542} y={y} fill="#bbb" fontSize={28} fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle" dominantBaseline="central" transform={`rotate(90, 542, ${y})`} opacity={0.5}>{label}</text>
        </g>
      ))}
      {Array.from({ length: 40 }).map((_, i) => {
        const y = i * 12.5;
        return (
          <g key={`hash-${i}`}>
            <line x1={213} y1={y} x2={219} y2={y} stroke="#999" strokeWidth={0.8} />
            <line x1={381} y1={y} x2={387} y2={y} stroke="#999" strokeWidth={0.8} />
          </g>
        );
      })}
      <line x1={38} y1={LOS_Y} x2={562} y2={LOS_Y} stroke="#2563eb" strokeWidth={2.5} opacity={0.7} />
    </g>
  );
}

function PlayerDot({ player, posKey, isSelected, isOL, onClick, assignment, isDragging }) {
  return (
    <g
      onPointerDown={(e) => { e.stopPropagation(); onClick(posKey, e); }}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {isOL ? (
        <>
          <rect x={player.x - 10} y={player.y - 10} width={20} height={20} fill={isSelected ? '#e94560' : 'white'} stroke={isSelected ? '#e94560' : '#333'} strokeWidth={2} rx={2} />
          <text x={player.x} y={player.y + 4} textAnchor="middle" fill={isSelected ? 'white' : '#333'} fontSize={8} fontFamily="Arial, sans-serif" fontWeight="bold" pointerEvents="none">{player.label}</text>
        </>
      ) : (
        <>
          <circle cx={player.x} cy={player.y} r={12} fill={isSelected ? '#e94560' : 'white'} stroke={isSelected ? '#e94560' : '#333'} strokeWidth={2} />
          <text x={player.x} y={player.y + 4} textAnchor="middle" fill={isSelected ? 'white' : '#333'} fontSize={9} fontFamily="Arial, sans-serif" fontWeight="bold" pointerEvents="none">{player.label}</text>
        </>
      )}
    </g>
  );
}

function DefensiveDot({ defender, isSelected, onClick, isDragging }) {
  return (
    <g
      onPointerDown={(e) => { e.stopPropagation(); onClick(defender.id, e); }}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <circle cx={defender.x} cy={defender.y} r={12} fill={isSelected ? '#e94560' : '#ddd'} stroke={isSelected ? '#e94560' : '#666'} strokeWidth={2} />
      <text x={defender.x} y={defender.y + 4} textAnchor="middle" fill={isSelected ? 'white' : '#333'} fontSize={8} fontFamily="Arial, sans-serif" fontWeight="bold" pointerEvents="none">{defender.label}</text>
    </g>
  );
}

function RouteLine({ player, routeKey, posKey }) {
  if (!routeKey || !ROUTE_TYPES[routeKey]) return null;

  const route = ROUTE_TYPES[routeKey];
  const isLeftSide = player.x < 300;
  const points = getRoutePath(routeKey, player.x, player.y, !isLeftSide);
  const color = PLAYER_COLORS[posKey] || '#333';

  if (points.length < 2) return null;

  const pathParts = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length; i++) {
    pathParts.push(`L ${points[i].x} ${points[i].y}`);
  }
  const pathD = pathParts.join(' ');
  const endPoint = points[points.length - 1];
  const prevPoint = points[points.length - 2];

  const isMotion = route.type === 'motion';
  const isBlock = route.type === 'block';

  const angle = Math.atan2(endPoint.y - prevPoint.y, endPoint.x - prevPoint.x);
  const arrowLen = 8;
  const arrowAngle = Math.PI / 6;

  return (
    <g>
      <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={isMotion ? '6,4' : isBlock ? '4,3' : 'none'} opacity={0.9} />
      {!isBlock && (
        <polygon
          points={`${endPoint.x},${endPoint.y} ${endPoint.x - arrowLen * Math.cos(angle - arrowAngle)},${endPoint.y - arrowLen * Math.sin(angle - arrowAngle)} ${endPoint.x - arrowLen * Math.cos(angle + arrowAngle)},${endPoint.y - arrowLen * Math.sin(angle + arrowAngle)}`}
          fill={color}
        />
      )}
      {isBlock && (
        <>
          <line x1={endPoint.x - 6} y1={endPoint.y - 4} x2={endPoint.x + 6} y2={endPoint.y + 4} stroke={color} strokeWidth={3} strokeLinecap="round" />
          <line x1={endPoint.x + 6} y1={endPoint.y - 4} x2={endPoint.x - 6} y2={endPoint.y + 4} stroke={color} strokeWidth={3} strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

export default function FieldCanvas({
  players,
  selectedPlayer,
  onSelectPlayer,
  assignments,
  cardId,
  customPositions,
  onDragPlayer,
  defensivePlayers = [],
  selectedDefender,
  onSelectDefender,
  onDragDefender,
  // Drawing props
  drawMode = false,
  eraserMode = false,
  drawColor = '#cc0000',
  drawWidth = 2,
  drawStyle = 'solid',
  lines = [],
  onAddLine,
  onRemoveLine,
}) {
  const svgRef = useRef(null);
  const previewRef = useRef(null);
  const currentLineRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  const OL_KEYS = ['C', 'LG', 'RG', 'LT', 'RT'];

  const getSVGPoint = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  const handlePlayerClick = useCallback((key, e) => {
    if (drawMode || eraserMode) return;
    setDragging({ key, type: 'offense' });
    onSelectPlayer?.(key);
    svgRef.current?.setPointerCapture?.(e.pointerId);
  }, [onSelectPlayer, drawMode, eraserMode]);

  const handleDefenderClick = useCallback((id, e) => {
    if (drawMode || eraserMode) return;
    setDragging({ key: id, type: 'defense' });
    onSelectDefender?.(id);
    svgRef.current?.setPointerCapture?.(e.pointerId);
  }, [onSelectDefender, drawMode, eraserMode]);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();

    if (drawMode && !eraserMode) {
      // Start freehand drawing
      const pt = getSVGPoint(e);
      const pressure = e.pointerType === 'pen' ? e.pressure : 0.5;
      const pressureWidth = drawWidth * (0.5 + pressure);
      currentLineRef.current = {
        pts: [{ x: pt.x, y: pt.y, p: pressure }],
        color: drawColor,
        width: drawWidth,
        pressureWidth,
        style: drawStyle,
      };
      svgRef.current?.setPointerCapture?.(e.pointerId);
      return;
    }

    // Eraser clicks are handled by DrawnLines component
    if (eraserMode) return;

    // Field click (deselect)
    if (!dragging) {
      onSelectPlayer?.(null);
      onSelectDefender?.(null);
    }
  }, [drawMode, eraserMode, drawColor, drawWidth, drawStyle, getSVGPoint, dragging, onSelectPlayer, onSelectDefender]);

  const handlePointerMove = useCallback((e) => {
    e.preventDefault();

    // Drawing in progress
    if (currentLineRef.current) {
      const pt = getSVGPoint(e);
      const last = currentLineRef.current.pts[currentLineRef.current.pts.length - 1];
      const dx = pt.x - last.x, dy = pt.y - last.y;
      if (dx * dx + dy * dy > 4) {
        const pressure = e.pointerType === 'pen' ? e.pressure : 0.5;
        currentLineRef.current.pts.push({ x: pt.x, y: pt.y, p: pressure });
        // Update pressure width with running average
        if (e.pointerType === 'pen') {
          currentLineRef.current.pressureWidth = drawWidth * (0.5 + pressure);
        }
        // Live preview via DOM ref
        if (previewRef.current) {
          const d = buildLinePath(currentLineRef.current.pts, currentLineRef.current.style);
          previewRef.current.setAttribute('d', d);
          previewRef.current.setAttribute('stroke', currentLineRef.current.color);
          previewRef.current.setAttribute('stroke-width', currentLineRef.current.pressureWidth || currentLineRef.current.width);
          previewRef.current.setAttribute('stroke-dasharray', currentLineRef.current.style === 'dashed' ? '8,5' : '');
          previewRef.current.style.display = '';
        }
      }
      return;
    }

    // Player drag
    if (!dragging) return;
    const pt = getSVGPoint(e);
    const x = Math.max(42, Math.min(558, pt.x));
    const y = Math.max(5, Math.min(395, pt.y));
    if (dragging.type === 'offense') {
      onDragPlayer?.(dragging.key, x, y);
    } else {
      onDragDefender?.(dragging.key, x, y);
    }
  }, [dragging, getSVGPoint, onDragPlayer, onDragDefender, drawWidth]);

  const handlePointerUp = useCallback(() => {
    // Commit drawing
    if (currentLineRef.current) {
      if (currentLineRef.current.pts.length >= 2) {
        const simplified = simplifyLine(currentLineRef.current.pts, 1.5);
        const newLine = {
          pts: simplified,
          color: currentLineRef.current.color,
          width: currentLineRef.current.width,
          pressureWidth: currentLineRef.current.pressureWidth,
          style: currentLineRef.current.style,
        };
        onAddLine?.(newLine);
      }
      currentLineRef.current = null;
      if (previewRef.current) {
        previewRef.current.style.display = 'none';
        previewRef.current.setAttribute('d', '');
      }
      return;
    }

    setDragging(null);
  }, [onAddLine]);

  // Merge base positions with custom drag positions
  const resolvedPlayers = {};
  for (const [key, player] of Object.entries(players)) {
    if (customPositions?.[key]) {
      resolvedPlayers[key] = { ...player, x: customPositions[key].x, y: customPositions[key].y };
    } else {
      resolvedPlayers[key] = player;
    }
  }

  const cursorStyle = drawMode && !eraserMode ? 'crosshair' : eraserMode ? 'pointer' : 'default';

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`}
      className="w-full"
      style={{ touchAction: 'none', userSelect: 'none', cursor: cursorStyle }}
      id={`field-svg-${cardId || 'editor'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <FieldLines />

      {/* Drawn lines (below routes) */}
      <DrawnLines lines={lines} eraserMode={eraserMode} onRemoveLine={onRemoveLine} />

      {/* Drawing preview path */}
      <path
        ref={previewRef}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
        style={{ display: 'none' }}
        pointerEvents="none"
      />

      {/* Route lines */}
      {Object.entries(resolvedPlayers).map(([key, player]) => (
        <RouteLine key={`route-${key}`} player={player} routeKey={assignments?.[key]} posKey={key} />
      ))}

      {/* Defensive players */}
      {defensivePlayers.map((def) => (
        <DefensiveDot key={def.id} defender={def} isSelected={selectedDefender === def.id} onClick={handleDefenderClick} isDragging={dragging?.key === def.id} />
      ))}

      {/* Offensive players */}
      {Object.entries(resolvedPlayers).map(([key, player]) => (
        <PlayerDot key={key} posKey={key} player={player} isSelected={selectedPlayer === key} isOL={OL_KEYS.includes(key)} onClick={handlePlayerClick} assignment={assignments?.[key]} isDragging={dragging?.key === key} />
      ))}
    </svg>
  );
}
