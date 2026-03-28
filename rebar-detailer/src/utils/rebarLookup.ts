import type { BarSize, HookType } from '../models/RebarItem.js';

// ACI bar weights in lb/ft
export const BAR_WEIGHTS: Record<number, number> = {
  3: 0.376,
  4: 0.668,
  5: 1.043,
  6: 1.502,
  7: 2.044,
  8: 2.670,
  9: 3.400,
  10: 4.303,
  11: 5.313,
  14: 7.650,
  18: 13.600,
};

// Bar nominal diameters in inches
export const BAR_DIAMETERS: Record<number, number> = {
  3: 0.375,
  4: 0.500,
  5: 0.625,
  6: 0.750,
  7: 0.875,
  8: 1.000,
  9: 1.128,
  10: 1.270,
  11: 1.410,
  14: 1.693,
  18: 2.257,
};

// Bar cross-sectional area in sq inches
export const BAR_AREAS: Record<number, number> = {
  3: 0.11,
  4: 0.20,
  5: 0.31,
  6: 0.44,
  7: 0.60,
  8: 0.79,
  9: 1.00,
  10: 1.27,
  11: 1.56,
  14: 2.25,
  18: 4.00,
};

// Minimum bend diameter per ACI 318-19 Table 25.3.1
// Expressed as multiples of bar diameter (db)
export const MIN_BEND_DIAMETER: Record<number, number> = {
  3: 6,  // 6db
  4: 6,
  5: 6,
  6: 6,
  7: 6,
  8: 6,
  9: 8,  // 8db for #9-#11
  10: 8,
  11: 8,
  14: 10, // 10db for #14, #18
  18: 10,
};

// Standard hook extensions per ACI 318
// 90-degree hook: 12db extension
// 135-degree hook: 6db extension (stirrup/tie hooks)
// 180-degree hook: 4db (but not less than 2.5") extension
export function getHookExtension(barSize: number, hookType: HookType): number {
  const db = BAR_DIAMETERS[barSize] || 0;
  switch (hookType) {
    case '90':
      return 12 * db;
    case '135':
      return Math.max(6 * db, 3); // 6db but not less than 3"
    case '180':
      return Math.max(4 * db, 2.5);
    default:
      return 0;
  }
}

// Bend deduction: the amount to subtract from overall dimensions
// because the bar curves around the bend instead of making a sharp corner
// Deduction = bend radius + bar radius - (pi/4 * (bend radius + bar radius))
// Simplified: for standard bends, deduction ≈ 0.5 * bend diameter
export function getBendDeduction(barSize: number): number {
  const db = BAR_DIAMETERS[barSize] || 0;
  const bendMultiple = MIN_BEND_DIAMETER[barSize] || 6;
  const bendRadius = (bendMultiple * db) / 2;
  const barRadius = db / 2;
  const r = bendRadius + barRadius;
  // Deduction per 90-degree bend = 2r - (pi/2 * r) = r(2 - pi/2)
  return r * (2 - Math.PI / 2);
}

// Shape code descriptions for human-readable output
export const SHAPE_DESCRIPTIONS: Record<string, string> = {
  '00': 'Straight',
  '11': 'L-shape (90° bend)',
  '12': 'L-shape with hook',
  '13': 'Z-shape (2 opposite bends)',
  '21': 'U-shape (hairpin)',
  '22': 'U-shape with unequal legs',
  '23': 'U-shape with hooks',
  '31': 'Channel shape',
  '32': 'Channel with hooks',
  '41': 'Z-crank',
  '44': 'Double crank',
  '51': 'Rectangular stirrup/tie',
  '52': 'Rectangular stirrup with hooks',
  '56': 'Circular',
  '63': 'Trapezoidal stirrup',
  '67': 'Diamond stirrup',
  '75': 'T-shape',
  '77': 'Spiral',
  '98': 'Special - see drawing',
  '99': 'Other - see notes',
};

/**
 * Calculate the total cut length for a bar given its shape and dimensions.
 * Dimensions a, b, c, d, e represent the legs of the shape per standard conventions.
 * All dimensions in inches. Returns total cut length in inches.
 */
export function calculateCutLength(
  barSize: number,
  shapeCode: string,
  dimensions: { a?: number; b?: number; c?: number; d?: number; e?: number; hookType?: string },
): number {
  const { a = 0, b = 0, c = 0, d = 0, e = 0, hookType } = dimensions;
  const bendDeduction = getBendDeduction(barSize);
  const hookExt = hookType ? getHookExtension(barSize, hookType as HookType) : 0;

  switch (shapeCode) {
    case '00': // Straight
      return a || 0;

    case '11': // L-shape
      return a + b - bendDeduction;

    case '12': // L-shape with hook
      return a + b - bendDeduction + hookExt;

    case '13': // Z-shape
      return a + b + c - 2 * bendDeduction;

    case '21': // U-shape (hairpin)
      return a + b + c - 2 * bendDeduction;

    case '22': // U-shape unequal legs
      return a + b + c - 2 * bendDeduction;

    case '23': // U-shape with hooks
      return a + b + c - 2 * bendDeduction + 2 * hookExt;

    case '31': // Channel shape
      return a + b + c + d - 3 * bendDeduction;

    case '51': // Rectangular stirrup
      return 2 * (a + b) - 4 * bendDeduction + 2 * hookExt;

    case '52': // Rectangular stirrup with hooks
      return 2 * (a + b) - 4 * bendDeduction + 2 * hookExt;

    case '44': // Double crank
      return a + b + c + d + e - 4 * bendDeduction;

    case '56': // Circular
      return Math.PI * a; // a = diameter

    case '77': // Spiral
      // a = diameter, b = pitch, c = height
      if (a && b && c) {
        const turns = c / b;
        const circumference = Math.PI * a;
        return turns * Math.sqrt(circumference * circumference + b * b);
      }
      return 0;

    default:
      // For unknown shapes, sum all provided dimensions
      return a + b + c + d + e;
  }
}

/**
 * Calculate total weight in pounds for a set of bars.
 */
export function calculateWeight(barSize: number, totalLengthInches: number): number {
  const weightPerFt = BAR_WEIGHTS[barSize] || 0;
  return (totalLengthInches / 12) * weightPerFt;
}

/**
 * Calculate quantity from spacing and member length.
 * memberLength and spacing both in inches.
 */
export function quantityFromSpacing(memberLength: number, spacing: number): number {
  if (spacing <= 0) return 0;
  return Math.floor(memberLength / spacing) + 1;
}

/**
 * Parse a length string like "22'-6\"" or "10'-0\"" to inches.
 */
export function parseLengthToInches(lengthStr: string): number {
  // Try feet-inches format: 22'-6", 10'-0", 5'6"
  const ftInMatch = lengthStr.match(/(\d+)['\u2032]\s*-?\s*(\d+(?:\.\d+)?)["\u2033]?/);
  if (ftInMatch) {
    return parseInt(ftInMatch[1]) * 12 + parseFloat(ftInMatch[2]);
  }

  // Try feet only: 22', 10'
  const ftMatch = lengthStr.match(/(\d+(?:\.\d+)?)['\u2032]/);
  if (ftMatch) {
    return parseFloat(ftMatch[1]) * 12;
  }

  // Try inches only: 36", 48"
  const inMatch = lengthStr.match(/(\d+(?:\.\d+)?)["\u2033]/);
  if (inMatch) {
    return parseFloat(inMatch[1]);
  }

  // Try plain number (assume inches)
  const num = parseFloat(lengthStr);
  return isNaN(num) ? 0 : num;
}
