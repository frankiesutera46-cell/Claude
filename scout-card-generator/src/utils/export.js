import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import { FORMATIONS, mirrorFormation, getRoutePath, ROUTE_TYPES, PLAYER_COLORS } from '../data/formations';
import { buildLinePath } from './drawing';

// ============================================================
// Shared SVG-to-data-URL helper (used by both PDF and PPTX)
// ============================================================

const YARD_LINES = [
  { y: 50, label: '20' },
  { y: 100, label: '30' },
  { y: 150, label: '40' },
  { y: 200, label: '50' },
  { y: 300, label: '40' },
  { y: 350, label: '30' },
];

function buildCardSVG(card, width = 700, height = 460) {
  const formation = card.mirrored
    ? mirrorFormation(FORMATIONS[card.formationKey])
    : FORMATIONS[card.formationKey];

  const OL_KEYS = ['C', 'LG', 'RG', 'LT', 'RT'];
  const LOS_Y = 250;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="${width}" height="${height}">`;

  // Field — white background
  svg += `<rect x="0" y="0" width="600" height="400" fill="#f8f8f0"/>`;

  // Sidelines
  svg += `<line x1="38" y1="0" x2="38" y2="400" stroke="#888" stroke-width="1.5"/>`;
  svg += `<line x1="562" y1="0" x2="562" y2="400" stroke="#888" stroke-width="1.5"/>`;

  // Yard lines and numbers
  for (const { y, label } of YARD_LINES) {
    svg += `<line x1="38" y1="${y}" x2="562" y2="${y}" stroke="#aaa" stroke-width="1"/>`;
    svg += `<text x="58" y="${y}" fill="#bbb" font-size="28" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle" dominant-baseline="central" transform="rotate(-90, 58, ${y})" opacity="0.5">${label}</text>`;
    svg += `<text x="542" y="${y}" fill="#bbb" font-size="28" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle" dominant-baseline="central" transform="rotate(90, 542, ${y})" opacity="0.5">${label}</text>`;
  }

  // Hash marks
  for (let i = 0; i < 40; i++) {
    const y = i * 12.5;
    svg += `<line x1="213" y1="${y}" x2="219" y2="${y}" stroke="#999" stroke-width="0.8"/>`;
    svg += `<line x1="381" y1="${y}" x2="387" y2="${y}" stroke="#999" stroke-width="0.8"/>`;
  }

  // LOS
  svg += `<line x1="38" y1="${LOS_Y}" x2="562" y2="${LOS_Y}" stroke="#2563eb" stroke-width="2.5" opacity="0.7"/>`;

  // Resolve custom positions
  const resolvedPlayers = {};
  for (const [key, player] of Object.entries(formation.players)) {
    if (card.customPositions?.[key]) {
      resolvedPlayers[key] = { ...player, ...card.customPositions[key] };
    } else {
      resolvedPlayers[key] = player;
    }
  }

  // Routes
  for (const [key, player] of Object.entries(resolvedPlayers)) {
    const routeKey = card.assignments?.[key];
    if (!routeKey || !ROUTE_TYPES[routeKey]) continue;

    const route = ROUTE_TYPES[routeKey];
    const color = PLAYER_COLORS[key] || '#333';
    const isLeftSide = player.x < 300;
    const points = getRoutePath(routeKey, player.x, player.y, !isLeftSide);

    if (points.length >= 2) {
      const pathParts = [`M ${points[0].x} ${points[0].y}`];
      for (let i = 1; i < points.length; i++) {
        pathParts.push(`L ${points[i].x} ${points[i].y}`);
      }
      const isMotion = route.type === 'motion';
      const isBlock = route.type === 'block';
      svg += `<path d="${pathParts.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ${isMotion ? 'stroke-dasharray="6,4"' : isBlock ? 'stroke-dasharray="4,3"' : ''} opacity="0.9"/>`;

      const endPt = points[points.length - 1];
      const prevPt = points[points.length - 2];
      if (isBlock) {
        svg += `<line x1="${endPt.x - 6}" y1="${endPt.y - 4}" x2="${endPt.x + 6}" y2="${endPt.y + 4}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
        svg += `<line x1="${endPt.x + 6}" y1="${endPt.y - 4}" x2="${endPt.x - 6}" y2="${endPt.y + 4}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
      } else {
        const angle = Math.atan2(endPt.y - prevPt.y, endPt.x - prevPt.x);
        const arrowLen = 8;
        const arrowAngle = Math.PI / 6;
        const ax1 = endPt.x - arrowLen * Math.cos(angle - arrowAngle);
        const ay1 = endPt.y - arrowLen * Math.sin(angle - arrowAngle);
        const ax2 = endPt.x - arrowLen * Math.cos(angle + arrowAngle);
        const ay2 = endPt.y - arrowLen * Math.sin(angle + arrowAngle);
        svg += `<polygon points="${endPt.x},${endPt.y} ${ax1},${ay1} ${ax2},${ay2}" fill="${color}"/>`;
      }
    }
  }

  // Defensive players
  for (const def of (card.defensivePlayers || [])) {
    svg += `<circle cx="${def.x}" cy="${def.y}" r="12" fill="#ddd" stroke="#666" stroke-width="2"/>`;
    svg += `<text x="${def.x}" y="${def.y + 4}" text-anchor="middle" fill="#333" font-size="8" font-family="Arial, sans-serif" font-weight="bold">${def.label}</text>`;
  }

  // Offensive players
  for (const [key, player] of Object.entries(resolvedPlayers)) {
    const isOL = OL_KEYS.includes(key);
    if (isOL) {
      svg += `<rect x="${player.x - 10}" y="${player.y - 10}" width="20" height="20" fill="white" stroke="#333" stroke-width="2" rx="2"/>`;
      svg += `<text x="${player.x}" y="${player.y + 4}" text-anchor="middle" fill="#333" font-size="8" font-family="Arial, sans-serif" font-weight="bold">${player.label}</text>`;
    } else {
      svg += `<circle cx="${player.x}" cy="${player.y}" r="12" fill="white" stroke="#333" stroke-width="2"/>`;
      svg += `<text x="${player.x}" y="${player.y + 4}" text-anchor="middle" fill="#333" font-size="9" font-family="Arial, sans-serif" font-weight="bold">${player.label}</text>`;
    }
  }

  // Drawn freehand lines
  for (const ln of (card.lines || [])) {
    if (!ln.pts || ln.pts.length < 2) continue;
    const pathD = buildLinePath(ln.pts, ln.style);
    const width = ln.pressureWidth || ln.width || 2;
    const isDashed = ln.style === 'dashed';
    svg += `<path d="${pathD}" fill="none" stroke="${ln.color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${isDashed ? 'stroke-dasharray="8,5"' : ''} opacity="0.9"/>`;

    const hasArrow = ln.style === 'arrow' || ln.style === 'curvedarrow';
    const hasBlock = ln.style === 'block' || ln.style === 'curvedblock';
    if (hasArrow && ln.pts.length >= 2) {
      const ep = ln.pts[ln.pts.length - 1];
      const lp = ln.pts[Math.max(0, ln.pts.length - 3)];
      const ang = Math.atan2(ep.y - lp.y, ep.x - lp.x);
      const sz = Math.max(6, width * 3);
      const ax1 = ep.x - sz * Math.cos(ang - 0.4);
      const ay1 = ep.y - sz * Math.sin(ang - 0.4);
      const ax2 = ep.x - sz * Math.cos(ang + 0.4);
      const ay2 = ep.y - sz * Math.sin(ang + 0.4);
      svg += `<polygon points="${ep.x.toFixed(1)},${ep.y.toFixed(1)} ${ax1.toFixed(1)},${ay1.toFixed(1)} ${ax2.toFixed(1)},${ay2.toFixed(1)}" fill="${ln.color}"/>`;
    }
    if (hasBlock && ln.pts.length >= 2) {
      const ep = ln.pts[ln.pts.length - 1];
      const lp = ln.pts[Math.max(0, ln.pts.length - 3)];
      const ang = Math.atan2(ep.y - lp.y, ep.x - lp.x);
      const sz = Math.max(7, width * 3);
      const bx1 = ep.x + sz * Math.cos(ang + 1.57);
      const by1 = ep.y + sz * Math.sin(ang + 1.57);
      const bx2 = ep.x + sz * Math.cos(ang - 1.57);
      const by2 = ep.y + sz * Math.sin(ang - 1.57);
      svg += `<line x1="${bx1.toFixed(1)}" y1="${by1.toFixed(1)}" x2="${bx2.toFixed(1)}" y2="${by2.toFixed(1)}" stroke="${ln.color}" stroke-width="2.5" stroke-linecap="round"/>`;
    }
  }

  svg += `</svg>`;
  return svg;
}

function svgToDataUrl(svgString) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

async function svgToPngDataUrl(svgString, width = 700, height = 460) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = svgToDataUrl(svgString);
  });
}

// ============================================================
// PDF Export
// ============================================================

export async function exportToPDF(cards, title = 'Scout Cards') {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: 'letter' });
  const pageW = 11;
  const pageH = 8.5;
  const margin = 0.4;
  const fieldW = pageW - margin * 2;
  const fieldH = 4.5;

  for (let i = 0; i < cards.length; i++) {
    if (i > 0) pdf.addPage();
    const card = cards[i];
    const formation = FORMATIONS[card.formationKey];

    // Title bar
    pdf.setFillColor(30, 30, 50);
    pdf.rect(margin, margin, fieldW, 0.6, 'F');
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`#${i + 1}`, margin + 0.15, margin + 0.4);

    // Hash badge
    const hashLabel = card.hash === 'L' ? 'LEFT' : card.hash === 'R' ? 'RIGHT' : 'MID';
    pdf.setFillColor(233, 69, 96);
    pdf.roundedRect(margin + 0.6, margin + 0.12, 0.7, 0.36, 0.05, 0.05, 'F');
    pdf.setFontSize(10);
    pdf.text(hashLabel, margin + 0.95, margin + 0.37, { align: 'center' });

    // D&D
    if (card.downDistance) {
      pdf.setFontSize(11);
      pdf.text(card.downDistance, margin + 1.5, margin + 0.4);
    }

    // Play name
    pdf.setFontSize(14);
    pdf.text(card.playName || 'UNNAMED', pageW / 2, margin + 0.4, { align: 'center' });

    // Formation name
    pdf.setFontSize(9);
    pdf.setTextColor(160, 160, 180);
    pdf.text(
      (formation?.name || '') + (card.mirrored ? ' (Flipped)' : ''),
      pageW - margin - 0.15,
      margin + 0.4,
      { align: 'right' }
    );

    // Field diagram as PNG
    const svgStr = buildCardSVG(card, 700, 460);
    const pngUrl = await svgToPngDataUrl(svgStr, 700, 460);
    const imgY = margin + 0.7;
    pdf.addImage(pngUrl, 'PNG', margin, imgY, fieldW, fieldH);

    // Footer notes
    const footerY = imgY + fieldH + 0.2;
    pdf.setFontSize(8);
    pdf.setTextColor(80, 80, 80);

    if (card.playerNotes && Object.keys(card.playerNotes).length > 0) {
      const fm = card.mirrored ? mirrorFormation(formation) : formation;
      const noteTexts = Object.entries(card.playerNotes).map(
        ([key, note]) => `${fm?.players?.[key]?.label || key}: ${note}`
      );
      pdf.text(noteTexts.join('   |   '), margin + 0.1, footerY);
    }

    if (card.notes) {
      pdf.setFont('courier', 'italic');
      pdf.text(card.notes, margin + 0.1, footerY + 0.2);
    }
  }

  pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
}

// ============================================================
// PPTX Export
// ============================================================

export async function exportToPPTX(cards, title = 'Scout Cards') {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = title;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const formation = FORMATIONS[card.formationKey];
    const slide = pptx.addSlide();

    slide.background = { fill: '1a1a2e' };

    // Header bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.3, y: 0.2, w: 12.7, h: 0.6,
      fill: { color: '0f3460' }, rectRadius: 0.05,
    });

    slide.addText(`#${i + 1}`, {
      x: 0.4, y: 0.22, w: 0.5, h: 0.55,
      color: 'e94560', fontFace: 'Courier New', fontSize: 18, bold: true,
    });

    const hashLabel = card.hash === 'L' ? 'LEFT' : card.hash === 'R' ? 'RIGHT' : 'MID';
    slide.addShape(pptx.ShapeType.rect, {
      x: 1.0, y: 0.3, w: 0.8, h: 0.35,
      fill: { color: 'e94560' }, rectRadius: 0.05,
    });
    slide.addText(hashLabel, {
      x: 1.0, y: 0.3, w: 0.8, h: 0.35,
      color: 'FFFFFF', fontFace: 'Courier New', fontSize: 10, bold: true, align: 'center', valign: 'middle',
    });

    if (card.downDistance) {
      slide.addText(card.downDistance, {
        x: 2.0, y: 0.22, w: 1.2, h: 0.55,
        color: 'FFFFFF', fontFace: 'Courier New', fontSize: 12, bold: true,
      });
    }

    slide.addText(card.playName || 'UNNAMED', {
      x: 3.5, y: 0.22, w: 6, h: 0.55,
      color: 'FFFFFF', fontFace: 'Courier New', fontSize: 16, bold: true, align: 'center',
    });

    slide.addText((formation?.name || '') + (card.mirrored ? ' (Flipped)' : ''), {
      x: 10.0, y: 0.22, w: 3.0, h: 0.55,
      color: 'a0a0b0', fontFace: 'Courier New', fontSize: 9, align: 'right',
    });

    const svgStr = buildCardSVG(card, 700, 460);
    const pngUrl = await svgToPngDataUrl(svgStr, 700, 460);
    slide.addImage({ data: pngUrl, x: 1.5, y: 1.0, w: 10.3, h: 5.2 });

    const fm = card.mirrored ? mirrorFormation(formation) : formation;
    if (card.playerNotes && Object.keys(card.playerNotes).length > 0) {
      const noteTexts = Object.entries(card.playerNotes).map(
        ([key, note]) => `${fm?.players?.[key]?.label || key}: ${note}`
      );
      slide.addText(noteTexts.join('   |   '), {
        x: 0.5, y: 6.5, w: 12, h: 0.4,
        color: 'a0a0b0', fontFace: 'Courier New', fontSize: 8,
      });
    }

    if (card.notes) {
      slide.addText(card.notes, {
        x: 0.5, y: 6.9, w: 12, h: 0.4,
        color: '808090', fontFace: 'Courier New', fontSize: 8, italic: true,
      });
    }
  }

  await pptx.writeFile({ fileName: `${title.replace(/\s+/g, '_')}.pptx` });
}
