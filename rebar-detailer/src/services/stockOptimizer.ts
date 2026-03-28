/**
 * Stock Length Optimizer
 *
 * Given a list of cut lengths and quantities from the BBS, determines the optimal
 * cutting patterns from standard stock lengths to minimize scrap/waste.
 *
 * Uses a first-fit-decreasing (FFD) bin packing heuristic.
 */

export const STANDARD_STOCK_LENGTHS = [20, 30, 40, 60]; // feet

export interface CutRequirement {
  barMark: string;
  barSize: number;
  cutLengthFt: number; // feet
  quantity: number;
}

export interface CuttingPattern {
  stockLength: number; // feet
  cuts: { barMark: string; lengthFt: number }[];
  usedLength: number;
  wasteLength: number;
  wastePercent: number;
}

export interface StockOptimizationResult {
  barSize: number;
  patterns: CuttingPattern[];
  totalStockBars: number;
  totalStockLength: number; // feet
  totalUsedLength: number;
  totalWasteLength: number;
  wastePercent: number;
  stockBreakdown: { stockLength: number; count: number }[];
}

export interface OptimizationSummary {
  results: StockOptimizationResult[];
  grandTotalStockBars: number;
  grandTotalStockLengthFt: number;
  grandTotalWasteFt: number;
  overallWastePercent: number;
  estimatedSavingsVsWorstCase: number; // feet saved vs using shortest stock for everything
}

/**
 * Optimize cutting patterns for all bar sizes.
 */
export function optimizeStockLengths(
  requirements: CutRequirement[],
  availableStockLengths: number[] = STANDARD_STOCK_LENGTHS,
): OptimizationSummary {
  // Group by bar size
  const bySize = new Map<number, CutRequirement[]>();
  for (const req of requirements) {
    if (!bySize.has(req.barSize)) bySize.set(req.barSize, []);
    bySize.get(req.barSize)!.push(req);
  }

  const results: StockOptimizationResult[] = [];

  for (const [barSize, reqs] of bySize) {
    const result = optimizeForSize(barSize, reqs, availableStockLengths);
    results.push(result);
  }

  results.sort((a, b) => a.barSize - b.barSize);

  const grandTotalStockBars = results.reduce((s, r) => s + r.totalStockBars, 0);
  const grandTotalStockLengthFt = results.reduce((s, r) => s + r.totalStockLength, 0);
  const grandTotalWasteFt = results.reduce((s, r) => s + r.totalWasteLength, 0);
  const overallWastePercent = grandTotalStockLengthFt > 0
    ? Math.round((grandTotalWasteFt / grandTotalStockLengthFt) * 10000) / 100
    : 0;

  // Calculate savings vs worst case (using 20' stock for everything)
  const worstCaseWaste = calculateWorstCaseWaste(requirements, Math.min(...availableStockLengths));
  const estimatedSavingsVsWorstCase = Math.round((worstCaseWaste - grandTotalWasteFt) * 100) / 100;

  return {
    results,
    grandTotalStockBars,
    grandTotalStockLengthFt: Math.round(grandTotalStockLengthFt * 100) / 100,
    grandTotalWasteFt: Math.round(grandTotalWasteFt * 100) / 100,
    overallWastePercent,
    estimatedSavingsVsWorstCase,
  };
}

function optimizeForSize(
  barSize: number,
  requirements: CutRequirement[],
  stockLengths: number[],
): StockOptimizationResult {
  // Expand quantities into individual cut pieces
  const pieces: { barMark: string; lengthFt: number }[] = [];
  for (const req of requirements) {
    for (let i = 0; i < req.quantity; i++) {
      pieces.push({ barMark: req.barMark, lengthFt: req.cutLengthFt });
    }
  }

  // Sort pieces largest first (FFD heuristic)
  pieces.sort((a, b) => b.lengthFt - a.lengthFt);

  const sortedStock = [...stockLengths].sort((a, b) => a - b);
  const patterns: CuttingPattern[] = [];

  for (const piece of pieces) {
    // Try to fit in existing open pattern
    let placed = false;

    for (const pattern of patterns) {
      const remaining = pattern.stockLength - pattern.usedLength;
      if (remaining >= piece.lengthFt) {
        pattern.cuts.push(piece);
        pattern.usedLength = Math.round((pattern.usedLength + piece.lengthFt) * 100) / 100;
        pattern.wasteLength = Math.round((pattern.stockLength - pattern.usedLength) * 100) / 100;
        pattern.wastePercent = Math.round((pattern.wasteLength / pattern.stockLength) * 10000) / 100;
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Need a new stock bar — pick the smallest stock that fits
      const stockLength = selectBestStock(piece.lengthFt, sortedStock);
      if (stockLength === 0) continue; // piece too long for any stock

      patterns.push({
        stockLength,
        cuts: [piece],
        usedLength: piece.lengthFt,
        wasteLength: Math.round((stockLength - piece.lengthFt) * 100) / 100,
        wastePercent: Math.round(((stockLength - piece.lengthFt) / stockLength) * 10000) / 100,
      });
    }
  }

  const totalStockBars = patterns.length;
  const totalStockLength = patterns.reduce((s, p) => s + p.stockLength, 0);
  const totalUsedLength = patterns.reduce((s, p) => s + p.usedLength, 0);
  const totalWasteLength = Math.round((totalStockLength - totalUsedLength) * 100) / 100;
  const wastePercent = totalStockLength > 0
    ? Math.round((totalWasteLength / totalStockLength) * 10000) / 100
    : 0;

  // Count stock bars by length
  const stockCount = new Map<number, number>();
  for (const p of patterns) {
    stockCount.set(p.stockLength, (stockCount.get(p.stockLength) || 0) + 1);
  }
  const stockBreakdown = Array.from(stockCount.entries())
    .sort(([a], [b]) => a - b)
    .map(([stockLength, count]) => ({ stockLength, count }));

  return {
    barSize,
    patterns,
    totalStockBars,
    totalStockLength: Math.round(totalStockLength * 100) / 100,
    totalUsedLength: Math.round(totalUsedLength * 100) / 100,
    totalWasteLength,
    wastePercent,
    stockBreakdown,
  };
}

function selectBestStock(cutLength: number, sortedStockLengths: number[]): number {
  for (const stock of sortedStockLengths) {
    if (stock >= cutLength) return stock;
  }
  // If no standard stock fits, use the largest
  return sortedStockLengths.length > 0 ? sortedStockLengths[sortedStockLengths.length - 1] : 0;
}

function calculateWorstCaseWaste(requirements: CutRequirement[], shortestStock: number): number {
  let totalWaste = 0;
  for (const req of requirements) {
    for (let i = 0; i < req.quantity; i++) {
      const stock = Math.ceil(req.cutLengthFt / shortestStock) * shortestStock;
      totalWaste += stock - req.cutLengthFt;
    }
  }
  return totalWaste;
}
