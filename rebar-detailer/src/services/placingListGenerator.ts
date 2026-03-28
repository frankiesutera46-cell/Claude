import { db } from '../db/connection.js';
import { SHAPE_DESCRIPTIONS, BAR_WEIGHTS, calculateCutLength } from '../utils/rebarLookup.js';

export interface PlacingItem {
  barMark: string;
  barSize: number;
  sizeLabel: string;
  shapeDescription: string;
  cutLength: number;
  cutLengthDisplay: string;
  quantity: number;
  spacing?: number;
  spacingDisplay?: string;
  notes: string;
  confidence: number;
}

export interface ElementGroup {
  structuralElement: string;
  items: PlacingItem[];
}

export interface ZoneGroup {
  zone: string;
  elements: ElementGroup[];
  totalBars: number;
  totalWeight: number;
}

export interface PlacingList {
  projectId: string;
  projectName: string;
  zones: ZoneGroup[];
  grandTotalBars: number;
  grandTotalWeight: number;
}

export function generatePlacingList(projectId: string): PlacingList {
  const project = db.getProject(projectId);
  const items = db.getRebarItems(projectId);

  const zoneMap = new Map<string, Map<string, any[]>>();

  for (const item of items) {
    const zone = item.zone || 'Unassigned';
    const element = item.structural_element || 'General';

    if (!zoneMap.has(zone)) zoneMap.set(zone, new Map());
    const elementMap = zoneMap.get(zone)!;
    if (!elementMap.has(element)) elementMap.set(element, []);
    elementMap.get(element)!.push(item);
  }

  const zones: ZoneGroup[] = [];
  let grandTotalBars = 0;
  let grandTotalWeight = 0;

  for (const [zoneName, elementMap] of zoneMap) {
    const elements: ElementGroup[] = [];
    let zoneTotalBars = 0;
    let zoneTotalWeight = 0;

    for (const [elementName, elementItems] of elementMap) {
      const placingItems: PlacingItem[] = [];
      const sorted = sortByPlacementOrder(elementItems);

      for (const item of sorted) {
        const dimensions = {
          a: item.dim_a || undefined,
          b: item.dim_b || undefined,
          c: item.dim_c || undefined,
          d: item.dim_d || undefined,
          e: item.dim_e || undefined,
          hookType: item.hook_type || undefined,
        };

        let cutLength = item.total_length;
        if (!cutLength) {
          cutLength = calculateCutLength(item.bar_size, item.shape_code || '00', dimensions);
        }

        const qty = item.quantity || 1;
        const weight = (cutLength / 12) * (BAR_WEIGHTS[item.bar_size] || 0) * qty;

        zoneTotalBars += qty;
        zoneTotalWeight += weight;

        placingItems.push({
          barMark: item.bar_mark || '—',
          barSize: item.bar_size,
          sizeLabel: `#${item.bar_size}`,
          shapeDescription: getPlacingShapeDescription(item),
          cutLength,
          cutLengthDisplay: inchesToDisplay(cutLength),
          quantity: qty,
          spacing: item.spacing || undefined,
          spacingDisplay: item.spacing ? `${item.spacing}" O.C.` : undefined,
          notes: buildPlacingNotes(item),
          confidence: item.confidence || 1,
        });
      }

      elements.push({ structuralElement: elementName, items: placingItems });
    }

    grandTotalBars += zoneTotalBars;
    grandTotalWeight += zoneTotalWeight;

    zones.push({
      zone: zoneName,
      elements,
      totalBars: zoneTotalBars,
      totalWeight: Math.round(zoneTotalWeight),
    });
  }

  return {
    projectId,
    projectName: project?.name || 'Unknown Project',
    zones,
    grandTotalBars,
    grandTotalWeight: Math.round(grandTotalWeight),
  };
}

function sortByPlacementOrder(items: any[]): any[] {
  const order: Record<string, number> = {
    '00': 1, '11': 2, '13': 3, '21': 4, '51': 5, '52': 5, '56': 5,
  };
  return [...items].sort((a, b) => {
    const orderA = order[a.shape_code] || 3;
    const orderB = order[b.shape_code] || 3;
    if (orderA !== orderB) return orderA - orderB;
    return (a.bar_size || 0) - (b.bar_size || 0);
  });
}

function getPlacingShapeDescription(item: any): string {
  const shapeCode = item.shape_code || '00';
  const base = SHAPE_DESCRIPTIONS[shapeCode] || 'See drawing';
  const dims: string[] = [];
  if (item.dim_a) dims.push(`A=${inchesToDisplay(item.dim_a)}`);
  if (item.dim_b) dims.push(`B=${inchesToDisplay(item.dim_b)}`);
  if (item.dim_c) dims.push(`C=${inchesToDisplay(item.dim_c)}`);
  if (item.hook_type) dims.push(`${item.hook_type}° hook`);
  return dims.length > 0 ? `${base} (${dims.join(', ')})` : base;
}

function buildPlacingNotes(item: any): string {
  const parts: string[] = [];
  if (item.notes) parts.push(item.notes);
  if (item.coating && item.coating !== 'none') parts.push(`${item.coating}-coated`);
  if (item.grade && item.grade !== 60) parts.push(`Grade ${item.grade}`);
  if (item.confidence < 0.7) parts.push('VERIFY');
  return parts.join(' | ');
}

function inchesToDisplay(inches: number): string {
  if (!inches || inches <= 0) return '0"';
  const feet = Math.floor(inches / 12);
  const remainingInches = Math.round(inches % 12);
  if (feet === 0) return `${remainingInches}"`;
  return `${feet}'-${remainingInches}"`;
}
