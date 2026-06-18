/**
 * Pricing & Bid Generator
 *
 * Calculates material costs, labor costs, and generates bid proposals.
 */

import { BAR_WEIGHTS } from '../utils/rebarLookup.js';

// ── Default Pricing (adjustable per project) ──

export interface PricingConfig {
  // Material pricing per ton by bar size
  materialPricePerTon: Record<number, number>;
  // Epoxy coating surcharge per ton
  epoxyPremiumPerTon: number;
  galvanizedPremiumPerTon: number;
  // Accessories (chairs, spacers, wire) as % of material
  accessoriesPercent: number;
  // Delivery/freight per ton
  deliveryPerTon: number;
  // Labor rate per ton by complexity
  laborRatePerTon: { light: number; medium: number; heavy: number };
  // Overhead & profit markup %
  overheadPercent: number;
  profitPercent: number;
  // Bond cost %
  bondPercent: number;
  // Sales tax on material %
  salesTaxPercent: number;
}

export const DEFAULT_PRICING: PricingConfig = {
  materialPricePerTon: {
    3: 1150, 4: 1100, 5: 1080, 6: 1080, 7: 1100,
    8: 1100, 9: 1120, 10: 1140, 11: 1160, 14: 1250, 18: 1350,
  },
  epoxyPremiumPerTon: 350,
  galvanizedPremiumPerTon: 800,
  accessoriesPercent: 3,
  deliveryPerTon: 65,
  laborRatePerTon: {
    light: 450,   // Simple SOG, footings
    medium: 650,  // Standard columns, beams, walls
    heavy: 900,   // Complex connections, high-rise, congested areas
  },
  overheadPercent: 10,
  profitPercent: 10,
  bondPercent: 2,
  salesTaxPercent: 0,
};

// ── Labor Production Rates (tons per 8-hr crew day) ──

export interface ProductionRate {
  tonsPerCrewDay: number;
  crewSize: number;
  description: string;
}

export const PRODUCTION_RATES: Record<string, ProductionRate> = {
  slab_on_grade: { tonsPerCrewDay: 3.0, crewSize: 4, description: 'Slab on grade — open, easy access' },
  elevated_slab: { tonsPerCrewDay: 2.0, crewSize: 4, description: 'Elevated slab — staging, shoring' },
  post_tension_slab: { tonsPerCrewDay: 2.5, crewSize: 4, description: 'PT slab mild steel' },
  spread_footing: { tonsPerCrewDay: 2.5, crewSize: 4, description: 'Spread footings' },
  continuous_footing: { tonsPerCrewDay: 2.5, crewSize: 4, description: 'Continuous footings' },
  mat_foundation: { tonsPerCrewDay: 2.0, crewSize: 5, description: 'Mat foundations — heavy, congested' },
  pile_cap: { tonsPerCrewDay: 1.8, crewSize: 5, description: 'Pile caps — congested' },
  grade_beam: { tonsPerCrewDay: 2.2, crewSize: 4, description: 'Grade beams' },
  column_tied: { tonsPerCrewDay: 1.5, crewSize: 4, description: 'Tied columns — vertical work' },
  column_spiral: { tonsPerCrewDay: 1.2, crewSize: 4, description: 'Spiral columns — complex' },
  beam_regular: { tonsPerCrewDay: 1.5, crewSize: 4, description: 'Beams — elevated, forms' },
  beam_transfer: { tonsPerCrewDay: 1.0, crewSize: 5, description: 'Transfer beams — heavy, congested' },
  shear_wall: { tonsPerCrewDay: 1.8, crewSize: 4, description: 'Shear walls' },
  retaining_wall: { tonsPerCrewDay: 2.0, crewSize: 4, description: 'Retaining walls' },
  basement_wall: { tonsPerCrewDay: 2.0, crewSize: 4, description: 'Basement walls' },
  stairs: { tonsPerCrewDay: 1.0, crewSize: 3, description: 'Stairs — tight, complex bends' },
};

// ── Bid Line Items ──

export interface BidLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface LaborEstimate {
  elementType: string;
  elementName: string;
  tons: number;
  productionRate: number;
  crewSize: number;
  crewDays: number;
  laborHours: number;
  laborCost: number;
}

export interface BidSummary {
  // Material
  materialBySize: { barSize: number; tons: number; pricePerTon: number; total: number }[];
  materialSubtotal: number;
  coatingSurcharge: number;
  accessoriesCost: number;
  deliveryCost: number;
  salesTax: number;
  totalMaterialCost: number;

  // Labor
  laborDetails: LaborEstimate[];
  totalLaborHours: number;
  totalCrewDays: number;
  totalLaborCost: number;

  // Summary
  directCost: number;
  overheadCost: number;
  profitAmount: number;
  bondCost: number;
  grandTotal: number;
  pricePerTon: number;
  totalTons: number;

  lineItems: BidLineItem[];
}

/**
 * Generate a complete bid from BBS data or estimate data.
 */
export function generateBid(
  elements: { elementType: string; name: string; barSize: number; tons: number; coating: string }[],
  pricingConfig: PricingConfig = DEFAULT_PRICING,
): BidSummary {
  const pc = pricingConfig;

  // ── Material Costs ──
  const sizeMap = new Map<number, number>();
  let totalTons = 0;
  let epoxyTons = 0;
  let galvTons = 0;

  for (const el of elements) {
    const current = sizeMap.get(el.barSize) || 0;
    sizeMap.set(el.barSize, current + el.tons);
    totalTons += el.tons;
    if (el.coating === 'epoxy') epoxyTons += el.tons;
    if (el.coating === 'galvanized') galvTons += el.tons;
  }

  const materialBySize = Array.from(sizeMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([barSize, tons]) => ({
      barSize,
      tons: round2(tons),
      pricePerTon: pc.materialPricePerTon[barSize] || 1100,
      total: round2(tons * (pc.materialPricePerTon[barSize] || 1100)),
    }));

  const materialSubtotal = materialBySize.reduce((s, m) => s + m.total, 0);
  const coatingSurcharge = round2(epoxyTons * pc.epoxyPremiumPerTon + galvTons * pc.galvanizedPremiumPerTon);
  const accessoriesCost = round2(materialSubtotal * (pc.accessoriesPercent / 100));
  const deliveryCost = round2(totalTons * pc.deliveryPerTon);
  const salesTax = round2((materialSubtotal + coatingSurcharge + accessoriesCost) * (pc.salesTaxPercent / 100));
  const totalMaterialCost = round2(materialSubtotal + coatingSurcharge + accessoriesCost + deliveryCost + salesTax);

  // ── Labor Costs ──
  const laborDetails: LaborEstimate[] = [];
  const elementGroups = new Map<string, { type: string; name: string; tons: number }>();

  for (const el of elements) {
    const key = `${el.elementType}:${el.name}`;
    const existing = elementGroups.get(key) || { type: el.elementType, name: el.name, tons: 0 };
    existing.tons += el.tons;
    elementGroups.set(key, existing);
  }

  for (const [_, group] of elementGroups) {
    const rate = PRODUCTION_RATES[group.type] || PRODUCTION_RATES['beam_regular'];
    const crewDays = group.tons / rate.tonsPerCrewDay;
    const laborHours = crewDays * 8 * rate.crewSize;

    // Determine labor rate complexity
    let complexity: 'light' | 'medium' | 'heavy' = 'medium';
    if (['slab_on_grade', 'spread_footing', 'continuous_footing'].includes(group.type)) complexity = 'light';
    if (['column_spiral', 'beam_transfer', 'mat_foundation', 'pile_cap'].includes(group.type)) complexity = 'heavy';

    const laborCost = group.tons * pc.laborRatePerTon[complexity];

    laborDetails.push({
      elementType: group.type,
      elementName: group.name,
      tons: round2(group.tons),
      productionRate: rate.tonsPerCrewDay,
      crewSize: rate.crewSize,
      crewDays: round2(crewDays),
      laborHours: round2(laborHours),
      laborCost: round2(laborCost),
    });
  }

  const totalLaborHours = round2(laborDetails.reduce((s, l) => s + l.laborHours, 0));
  const totalCrewDays = round2(laborDetails.reduce((s, l) => s + l.crewDays, 0));
  const totalLaborCost = round2(laborDetails.reduce((s, l) => s + l.laborCost, 0));

  // ── Summary ──
  const directCost = round2(totalMaterialCost + totalLaborCost);
  const overheadCost = round2(directCost * (pc.overheadPercent / 100));
  const profitAmount = round2((directCost + overheadCost) * (pc.profitPercent / 100));
  const bondCost = round2((directCost + overheadCost + profitAmount) * (pc.bondPercent / 100));
  const grandTotal = round2(directCost + overheadCost + profitAmount + bondCost);
  const pricePerTon = totalTons > 0 ? round2(grandTotal / totalTons) : 0;

  // ── Line Items for Bid Sheet ──
  const lineItems: BidLineItem[] = [
    { description: 'Reinforcing Steel (furnished)', quantity: round2(totalTons), unit: 'ton', unitPrice: round2(materialSubtotal / totalTons), total: materialSubtotal },
    ...(coatingSurcharge > 0 ? [{ description: 'Epoxy/Galvanized Coating', quantity: round2(epoxyTons + galvTons), unit: 'ton', unitPrice: round2(coatingSurcharge / (epoxyTons + galvTons || 1)), total: coatingSurcharge }] : []),
    { description: 'Accessories (chairs, spacers, wire)', quantity: 1, unit: 'lot', unitPrice: accessoriesCost, total: accessoriesCost },
    { description: 'Delivery & Freight', quantity: round2(totalTons), unit: 'ton', unitPrice: pc.deliveryPerTon, total: deliveryCost },
    ...(salesTax > 0 ? [{ description: 'Sales Tax', quantity: 1, unit: 'lot', unitPrice: salesTax, total: salesTax }] : []),
    { description: 'Reinforcing Steel (placed)', quantity: round2(totalTons), unit: 'ton', unitPrice: round2(totalLaborCost / totalTons), total: totalLaborCost },
    { description: 'Overhead', quantity: 1, unit: 'lot', unitPrice: overheadCost, total: overheadCost },
    { description: 'Profit', quantity: 1, unit: 'lot', unitPrice: profitAmount, total: profitAmount },
    ...(bondCost > 0 ? [{ description: 'Bond', quantity: 1, unit: 'lot', unitPrice: bondCost, total: bondCost }] : []),
  ];

  return {
    materialBySize,
    materialSubtotal: round2(materialSubtotal),
    coatingSurcharge,
    accessoriesCost,
    deliveryCost,
    salesTax,
    totalMaterialCost,
    laborDetails,
    totalLaborHours,
    totalCrewDays,
    totalLaborCost,
    directCost,
    overheadCost,
    profitAmount,
    bondCost,
    grandTotal,
    pricePerTon,
    totalTons: round2(totalTons),
    lineItems,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
