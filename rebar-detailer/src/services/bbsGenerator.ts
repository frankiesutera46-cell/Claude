import { db } from '../db/connection.js';
import {
  BAR_WEIGHTS,
  calculateCutLength,
  calculateWeight,
  SHAPE_DESCRIPTIONS,
} from '../utils/rebarLookup.js';

export interface BBSRow {
  barMark: string;
  barSize: number;
  shapeCode: string;
  shapeDescription: string;
  dimensions: { a?: number; b?: number; c?: number; d?: number; e?: number; hookType?: string };
  cutLength: number;
  quantity: number;
  totalLength: number;
  unitWeight: number;
  totalWeight: number;
  grade: number;
  coating: string;
  notes: string;
}

export interface BBSSummary {
  rows: BBSRow[];
  totalsBySize: { barSize: number; totalWeight: number; totalLength: number }[];
  grandTotalWeight: number;
  grandTotalLength: number;
}

export function generateBBS(projectId: string): BBSSummary {
  const items = db.getRebarItems(projectId);

  const markGroups = new Map<string, any[]>();
  for (const item of items) {
    const mark = item.bar_mark || 'UNMARK';
    if (!markGroups.has(mark)) markGroups.set(mark, []);
    markGroups.get(mark)!.push(item);
  }

  const rows: BBSRow[] = [];

  for (const [mark, groupItems] of markGroups) {
    const rep = groupItems[0];
    const barSize = rep.bar_size;
    const shapeCode = rep.shape_code || '00';

    const dimensions = {
      a: rep.dim_a || undefined,
      b: rep.dim_b || undefined,
      c: rep.dim_c || undefined,
      d: rep.dim_d || undefined,
      e: rep.dim_e || undefined,
      hookType: rep.hook_type || undefined,
    };

    let cutLength = rep.total_length;
    if (!cutLength) {
      cutLength = calculateCutLength(barSize, shapeCode, dimensions);
    }

    const quantity = groupItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
    const totalLengthInches = cutLength * quantity;
    const totalLengthFeet = totalLengthInches / 12;
    const unitWeight = BAR_WEIGHTS[barSize] || 0;
    const totalWeight = calculateWeight(barSize, totalLengthInches);

    const notes = groupItems.map((item: any) => item.notes).filter(Boolean).join('; ');

    rows.push({
      barMark: mark,
      barSize,
      shapeCode,
      shapeDescription: SHAPE_DESCRIPTIONS[shapeCode] || 'Unknown',
      dimensions,
      cutLength,
      quantity,
      totalLength: Math.round(totalLengthFeet * 100) / 100,
      unitWeight,
      totalWeight: Math.round(totalWeight * 100) / 100,
      grade: rep.grade || 60,
      coating: rep.coating || 'none',
      notes,
    });
  }

  rows.sort((a, b) => {
    const aNum = parseInt(a.barMark.replace(/\D/g, '')) || 0;
    const bNum = parseInt(b.barMark.replace(/\D/g, '')) || 0;
    return aNum - bNum || a.barMark.localeCompare(b.barMark);
  });

  const sizeMap = new Map<number, { totalWeight: number; totalLength: number }>();
  for (const row of rows) {
    const existing = sizeMap.get(row.barSize) || { totalWeight: 0, totalLength: 0 };
    existing.totalWeight += row.totalWeight;
    existing.totalLength += row.totalLength;
    sizeMap.set(row.barSize, existing);
  }

  const totalsBySize = Array.from(sizeMap.entries())
    .map(([barSize, totals]) => ({
      barSize,
      totalWeight: Math.round(totals.totalWeight * 100) / 100,
      totalLength: Math.round(totals.totalLength * 100) / 100,
    }))
    .sort((a, b) => a.barSize - b.barSize);

  const grandTotalWeight = Math.round(rows.reduce((s, r) => s + r.totalWeight, 0) * 100) / 100;
  const grandTotalLength = Math.round(rows.reduce((s, r) => s + r.totalLength, 0) * 100) / 100;

  return { rows, totalsBySize, grandTotalWeight, grandTotalLength };
}
