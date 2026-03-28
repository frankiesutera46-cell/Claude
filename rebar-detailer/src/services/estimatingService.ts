/**
 * Rebar Estimating Takeoff Service
 *
 * Uses industry-standard rebar density ratios (lbs per cubic yard of concrete)
 * to estimate rebar quantities for bidding/budgeting purposes.
 *
 * Sources: ACI, CRSI Design Handbook, RS Means
 */

import fs from 'fs';
import { config } from '../config/index.js';

// ── Rebar Density Ratios (lbs of rebar per CY of concrete) ──

export interface DensityRange {
  light: number;
  medium: number;
  heavy: number;
  description: string;
}

export const REBAR_DENSITIES: Record<string, DensityRange> = {
  spread_footing: {
    light: 45,
    medium: 75,
    heavy: 110,
    description: 'Spread/isolated footings',
  },
  continuous_footing: {
    light: 50,
    medium: 85,
    heavy: 130,
    description: 'Continuous/strip footings',
  },
  mat_foundation: {
    light: 80,
    medium: 130,
    heavy: 200,
    description: 'Mat/raft foundations',
  },
  pile_cap: {
    light: 80,
    medium: 120,
    heavy: 175,
    description: 'Pile caps',
  },
  grade_beam: {
    light: 75,
    medium: 120,
    heavy: 175,
    description: 'Grade beams',
  },
  column_tied: {
    light: 150,
    medium: 225,
    heavy: 350,
    description: 'Tied columns',
  },
  column_spiral: {
    light: 175,
    medium: 275,
    heavy: 400,
    description: 'Spiral columns',
  },
  beam_regular: {
    light: 100,
    medium: 175,
    heavy: 275,
    description: 'Beams (regular)',
  },
  beam_transfer: {
    light: 175,
    medium: 275,
    heavy: 400,
    description: 'Transfer beams',
  },
  slab_on_grade: {
    light: 30,
    medium: 55,
    heavy: 85,
    description: 'Slab on grade',
  },
  elevated_slab: {
    light: 60,
    medium: 100,
    heavy: 165,
    description: 'Elevated/suspended slab',
  },
  post_tension_slab: {
    light: 25,
    medium: 40,
    heavy: 65,
    description: 'Post-tensioned slab (mild steel only)',
  },
  shear_wall: {
    light: 80,
    medium: 140,
    heavy: 225,
    description: 'Shear walls',
  },
  retaining_wall: {
    light: 70,
    medium: 120,
    heavy: 190,
    description: 'Retaining walls',
  },
  basement_wall: {
    light: 60,
    medium: 100,
    heavy: 160,
    description: 'Basement walls',
  },
  stairs: {
    light: 75,
    medium: 115,
    heavy: 175,
    description: 'Stairs',
  },
};

// ── Per-SF ratios for slabs (alternative input) ──
export const SLAB_PSF_RATIOS: Record<string, DensityRange> = {
  slab_on_grade: {
    light: 0.5,
    medium: 1.2,
    heavy: 2.5,
    description: 'Slab on grade (lbs/SF)',
  },
  elevated_slab: {
    light: 2.0,
    medium: 4.0,
    heavy: 7.0,
    description: 'Elevated slab (lbs/SF)',
  },
  post_tension_slab: {
    light: 0.8,
    medium: 1.5,
    heavy: 2.5,
    description: 'PT slab mild steel (lbs/SF)',
  },
};

// ── Estimating Element ──

export type ElementType = keyof typeof REBAR_DENSITIES;
export type DensityLevel = 'light' | 'medium' | 'heavy' | 'custom';
export type InputMethod = 'dimensions' | 'volume' | 'area';

export interface EstimateElement {
  id: string;
  estimateId: string;
  name: string;               // User label, e.g. "Footings Level B1"
  elementType: ElementType;
  inputMethod: InputMethod;
  // Dimensions input
  length?: number;             // feet
  width?: number;              // feet
  depth?: number;              // feet (thickness)
  count?: number;              // number of identical elements
  // Direct volume input
  cubicYards?: number;
  // Area input (for slabs)
  squareFeet?: number;
  thickness?: number;          // inches (for area method)
  // Density
  densityLevel: DensityLevel;
  customDensity?: number;      // lbs/CY if custom
  // Calculated results
  concreteVolumeCY: number;
  rebarDensityUsed: number;    // lbs/CY actually used
  rebarWeightLbs: number;
  rebarWeightTons: number;
  notes?: string;
}

export interface Estimate {
  id: string;
  projectName: string;
  buildingType?: string;
  description?: string;
  elements: EstimateElement[];
  wasteFactor: number;         // percentage, e.g. 5 = 5%
  lapSpliceFactor: number;     // percentage for lap splices, e.g. 10
  accessoriesFactor: number;   // chairs, spacers, wire etc, e.g. 3
  // Totals
  totalConcreteCY: number;
  subtotalRebarLbs: number;
  wasteRebarLbs: number;
  lapSpliceRebarLbs: number;
  accessoriesLbs: number;
  grandTotalRebarLbs: number;
  grandTotalRebarTons: number;
  avgDensityLbsCY: number;
  createdAt: string;
  updatedAt: string;
}

// ── Calculation Logic ──

export function calculateElement(el: Partial<EstimateElement>): {
  concreteVolumeCY: number;
  rebarDensityUsed: number;
  rebarWeightLbs: number;
  rebarWeightTons: number;
} {
  let concreteVolumeCY = 0;

  if (el.inputMethod === 'volume' && el.cubicYards) {
    concreteVolumeCY = el.cubicYards;
  } else if (el.inputMethod === 'area' && el.squareFeet && el.thickness) {
    // SF * thickness(in) / 12 = CF, / 27 = CY
    concreteVolumeCY = (el.squareFeet * (el.thickness / 12)) / 27;
  } else if (el.inputMethod === 'dimensions' && el.length && el.width && el.depth) {
    // L * W * D in feet = CF, / 27 = CY, * count
    const volumePerUnit = (el.length * el.width * el.depth) / 27;
    concreteVolumeCY = volumePerUnit * (el.count || 1);
  }

  // Get density
  let rebarDensityUsed = 0;
  if (el.densityLevel === 'custom' && el.customDensity) {
    rebarDensityUsed = el.customDensity;
  } else if (el.elementType && REBAR_DENSITIES[el.elementType]) {
    const level = (el.densityLevel || 'medium') as keyof DensityRange;
    rebarDensityUsed = (REBAR_DENSITIES[el.elementType] as any)[level] || 0;
  }

  // For slab area method, optionally use PSF ratio instead
  if (el.inputMethod === 'area' && el.squareFeet && el.elementType && SLAB_PSF_RATIOS[el.elementType]) {
    const level = (el.densityLevel || 'medium') as keyof DensityRange;
    const psfRatio = (SLAB_PSF_RATIOS[el.elementType] as any)[level];
    if (psfRatio) {
      // Use PSF ratio directly: SF * lbs/SF
      const rebarWeightLbs = el.squareFeet * psfRatio;
      return {
        concreteVolumeCY,
        rebarDensityUsed: concreteVolumeCY > 0 ? rebarWeightLbs / concreteVolumeCY : 0,
        rebarWeightLbs,
        rebarWeightTons: rebarWeightLbs / 2000,
      };
    }
  }

  const rebarWeightLbs = concreteVolumeCY * rebarDensityUsed;

  return {
    concreteVolumeCY: Math.round(concreteVolumeCY * 100) / 100,
    rebarDensityUsed,
    rebarWeightLbs: Math.round(rebarWeightLbs * 100) / 100,
    rebarWeightTons: Math.round((rebarWeightLbs / 2000) * 100) / 100,
  };
}

export function calculateEstimateTotals(
  elements: EstimateElement[],
  wasteFactor: number,
  lapSpliceFactor: number,
  accessoriesFactor: number,
): {
  totalConcreteCY: number;
  subtotalRebarLbs: number;
  wasteRebarLbs: number;
  lapSpliceRebarLbs: number;
  accessoriesLbs: number;
  grandTotalRebarLbs: number;
  grandTotalRebarTons: number;
  avgDensityLbsCY: number;
} {
  const totalConcreteCY = elements.reduce((s, e) => s + (e.concreteVolumeCY || 0), 0);
  const subtotalRebarLbs = elements.reduce((s, e) => s + (e.rebarWeightLbs || 0), 0);

  const wasteRebarLbs = subtotalRebarLbs * (wasteFactor / 100);
  const lapSpliceRebarLbs = subtotalRebarLbs * (lapSpliceFactor / 100);
  const accessoriesLbs = subtotalRebarLbs * (accessoriesFactor / 100);

  const grandTotalRebarLbs = subtotalRebarLbs + wasteRebarLbs + lapSpliceRebarLbs + accessoriesLbs;
  const grandTotalRebarTons = grandTotalRebarLbs / 2000;
  const avgDensityLbsCY = totalConcreteCY > 0 ? subtotalRebarLbs / totalConcreteCY : 0;

  return {
    totalConcreteCY: Math.round(totalConcreteCY * 100) / 100,
    subtotalRebarLbs: Math.round(subtotalRebarLbs),
    wasteRebarLbs: Math.round(wasteRebarLbs),
    lapSpliceRebarLbs: Math.round(lapSpliceRebarLbs),
    accessoriesLbs: Math.round(accessoriesLbs),
    grandTotalRebarLbs: Math.round(grandTotalRebarLbs),
    grandTotalRebarTons: Math.round(grandTotalRebarTons * 100) / 100,
    avgDensityLbsCY: Math.round(avgDensityLbsCY),
  };
}

// ── Persistence ──

const dbPath = config.dbPath.replace('.db', '-estimates.json');

function loadData(): Record<string, Estimate> {
  if (fs.existsSync(dbPath)) {
    return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  }
  return {};
}

function saveData(data: Record<string, Estimate>): void {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export function getEstimates(): Estimate[] {
  return Object.values(loadData()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getEstimate(id: string): Estimate | null {
  return loadData()[id] || null;
}

export function saveEstimate(estimate: Estimate): void {
  const data = loadData();
  data[estimate.id] = estimate;
  saveData(data);
}

export function deleteEstimate(id: string): boolean {
  const data = loadData();
  if (!data[id]) return false;
  delete data[id];
  saveData(data);
  return true;
}

// ── Quick Estimate by Building Type ──

export interface BuildingTemplate {
  name: string;
  description: string;
  elements: Partial<EstimateElement>[];
}

export const BUILDING_TEMPLATES: Record<string, BuildingTemplate> = {
  low_rise_office: {
    name: 'Low-Rise Office (1-3 stories)',
    description: 'Typical low-rise commercial office building',
    elements: [
      { name: 'Spread Footings', elementType: 'spread_footing', densityLevel: 'medium' },
      { name: 'Grade Beams', elementType: 'grade_beam', densityLevel: 'medium' },
      { name: 'Columns', elementType: 'column_tied', densityLevel: 'medium' },
      { name: 'Beams', elementType: 'beam_regular', densityLevel: 'medium' },
      { name: 'Elevated Slabs', elementType: 'elevated_slab', densityLevel: 'medium' },
      { name: 'Slab on Grade', elementType: 'slab_on_grade', densityLevel: 'medium' },
    ],
  },
  mid_rise_residential: {
    name: 'Mid-Rise Residential (4-8 stories)',
    description: 'Residential tower with shear walls',
    elements: [
      { name: 'Mat Foundation', elementType: 'mat_foundation', densityLevel: 'medium' },
      { name: 'Columns', elementType: 'column_tied', densityLevel: 'medium' },
      { name: 'Shear Walls', elementType: 'shear_wall', densityLevel: 'medium' },
      { name: 'Elevated Slabs', elementType: 'elevated_slab', densityLevel: 'medium' },
      { name: 'Beams', elementType: 'beam_regular', densityLevel: 'medium' },
      { name: 'Stairs', elementType: 'stairs', densityLevel: 'medium' },
      { name: 'Basement Walls', elementType: 'basement_wall', densityLevel: 'medium' },
    ],
  },
  high_rise: {
    name: 'High-Rise (9+ stories)',
    description: 'High-rise with heavy foundations and shear walls',
    elements: [
      { name: 'Mat Foundation', elementType: 'mat_foundation', densityLevel: 'heavy' },
      { name: 'Pile Caps', elementType: 'pile_cap', densityLevel: 'heavy' },
      { name: 'Columns', elementType: 'column_spiral', densityLevel: 'heavy' },
      { name: 'Transfer Beams', elementType: 'beam_transfer', densityLevel: 'heavy' },
      { name: 'Shear Walls', elementType: 'shear_wall', densityLevel: 'heavy' },
      { name: 'Elevated Slabs', elementType: 'elevated_slab', densityLevel: 'medium' },
      { name: 'Stairs', elementType: 'stairs', densityLevel: 'medium' },
    ],
  },
  warehouse: {
    name: 'Warehouse / Industrial',
    description: 'Single-story industrial/warehouse building',
    elements: [
      { name: 'Spread Footings', elementType: 'spread_footing', densityLevel: 'light' },
      { name: 'Continuous Footings', elementType: 'continuous_footing', densityLevel: 'light' },
      { name: 'Slab on Grade', elementType: 'slab_on_grade', densityLevel: 'medium' },
      { name: 'Grade Beams', elementType: 'grade_beam', densityLevel: 'light' },
    ],
  },
  parking_garage: {
    name: 'Parking Garage',
    description: 'Multi-level parking structure',
    elements: [
      { name: 'Footings', elementType: 'spread_footing', densityLevel: 'medium' },
      { name: 'Columns', elementType: 'column_tied', densityLevel: 'heavy' },
      { name: 'Beams', elementType: 'beam_regular', densityLevel: 'heavy' },
      { name: 'PT Slabs', elementType: 'post_tension_slab', densityLevel: 'medium' },
      { name: 'Shear Walls', elementType: 'shear_wall', densityLevel: 'medium' },
      { name: 'Retaining Walls', elementType: 'retaining_wall', densityLevel: 'medium' },
    ],
  },
  retaining_wall_project: {
    name: 'Retaining Wall Project',
    description: 'Standalone retaining wall with footings',
    elements: [
      { name: 'Continuous Footings', elementType: 'continuous_footing', densityLevel: 'medium' },
      { name: 'Retaining Walls', elementType: 'retaining_wall', densityLevel: 'medium' },
    ],
  },
};
