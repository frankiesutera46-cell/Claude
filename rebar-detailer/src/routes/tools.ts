/**
 * Routes for: Pricing/Bid, Stock Optimizer, Labor Calculator, Material PO
 */
import { Router } from 'express';
import { generateBid, DEFAULT_PRICING, PRODUCTION_RATES, type PricingConfig } from '../services/pricingService.js';
import { optimizeStockLengths, STANDARD_STOCK_LENGTHS, type CutRequirement } from '../services/stockOptimizer.js';
import { generateBBS } from '../services/bbsGenerator.js';
import { BAR_WEIGHTS } from '../utils/rebarLookup.js';
import { db } from '../db/connection.js';

const router = Router();

// ── Pricing & Bid ───────────────────────────────────────────

/** GET /api/tools/pricing-defaults */
router.get('/pricing-defaults', (_req, res) => {
  res.json({ pricing: DEFAULT_PRICING, productionRates: PRODUCTION_RATES });
});

/** POST /api/tools/generate-bid - Generate bid from project BBS or manual input */
router.post('/generate-bid', (req, res) => {
  try {
    const { projectId, elements, pricing } = req.body;
    let bidElements: any[] = elements || [];

    // If projectId given, generate from BBS
    if (projectId && !elements) {
      const bbs = generateBBS(projectId);
      bidElements = bbs.rows.map(row => ({
        elementType: 'beam_regular', // default; can be overridden
        name: `Bar Mark ${row.barMark}`,
        barSize: row.barSize,
        tons: row.totalWeight / 2000,
        coating: row.coating || 'none',
      }));
    }

    const pricingConfig = pricing ? { ...DEFAULT_PRICING, ...pricing } : DEFAULT_PRICING;
    const bid = generateBid(bidElements, pricingConfig as PricingConfig);
    res.json(bid);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Stock Length Optimizer ───────────────────────────────────

/** POST /api/tools/optimize-stock */
router.post('/optimize-stock', (req, res) => {
  try {
    const { projectId, requirements, stockLengths } = req.body;
    let reqs: CutRequirement[] = requirements || [];

    // If projectId given, build requirements from BBS
    if (projectId && !requirements) {
      const bbs = generateBBS(projectId);
      reqs = bbs.rows.map(row => ({
        barMark: row.barMark,
        barSize: row.barSize,
        cutLengthFt: row.cutLength / 12, // convert inches to feet
        quantity: row.quantity,
      }));
    }

    const stocks = stockLengths || STANDARD_STOCK_LENGTHS;
    const result = optimizeStockLengths(reqs, stocks);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Labor Calculator ────────────────────────────────────────

/** POST /api/tools/labor-estimate */
router.post('/labor-estimate', (req, res) => {
  try {
    const { elements, hourlyRate } = req.body;
    const rate = hourlyRate || 85; // default ironworker rate

    const results = (elements || []).map((el: any) => {
      const prodRate = PRODUCTION_RATES[el.elementType] || PRODUCTION_RATES['beam_regular'];
      const tons = el.tons || 0;
      const crewDays = tons / prodRate.tonsPerCrewDay;
      const laborHours = crewDays * 8 * prodRate.crewSize;
      const laborCost = laborHours * rate;

      return {
        name: el.name || el.elementType,
        elementType: el.elementType,
        tons: Math.round(tons * 100) / 100,
        crewSize: prodRate.crewSize,
        tonsPerCrewDay: prodRate.tonsPerCrewDay,
        crewDays: Math.round(crewDays * 100) / 100,
        laborHours: Math.round(laborHours * 100) / 100,
        laborCost: Math.round(laborCost * 100) / 100,
        description: prodRate.description,
      };
    });

    const totalHours = results.reduce((s: number, r: any) => s + r.laborHours, 0);
    const totalDays = results.reduce((s: number, r: any) => s + r.crewDays, 0);
    const totalCost = results.reduce((s: number, r: any) => s + r.laborCost, 0);
    const avgCrewSize = results.length > 0
      ? Math.round(results.reduce((s: number, r: any) => s + r.crewSize, 0) / results.length)
      : 4;

    res.json({
      elements: results,
      totalLaborHours: Math.round(totalHours),
      totalCrewDays: Math.round(totalDays * 10) / 10,
      totalLaborCost: Math.round(totalCost),
      avgCrewSize,
      calendarDays: Math.ceil(totalDays / 1), // assuming 1 crew
      hourlyRate: rate,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Material PO Generator ───────────────────────────────────

/** POST /api/tools/generate-po */
router.post('/generate-po', (req, res) => {
  try {
    const { projectId, projectName, supplier, stockOptResult } = req.body;
    let poLines: any[] = [];

    if (stockOptResult) {
      // Use optimized stock lengths
      for (const result of stockOptResult.results || []) {
        for (const stock of result.stockBreakdown || []) {
          poLines.push({
            barSize: result.barSize,
            sizeLabel: `#${result.barSize}`,
            stockLength: stock.stockLength,
            stockLengthLabel: `${stock.stockLength}'-0"`,
            quantity: stock.count,
            unitWeight: BAR_WEIGHTS[result.barSize] || 0,
            totalWeight: Math.round(stock.count * stock.stockLength * (BAR_WEIGHTS[result.barSize] || 0)),
            grade: 60,
            coating: 'none',
          });
        }
      }
    } else if (projectId) {
      // Generate from BBS with default stock lengths
      const bbs = generateBBS(projectId);
      const reqs = bbs.rows.map(row => ({
        barMark: row.barMark,
        barSize: row.barSize,
        cutLengthFt: row.cutLength / 12,
        quantity: row.quantity,
      }));
      const opt = optimizeStockLengths(reqs);

      for (const result of opt.results) {
        for (const stock of result.stockBreakdown) {
          poLines.push({
            barSize: result.barSize,
            sizeLabel: `#${result.barSize}`,
            stockLength: stock.stockLength,
            stockLengthLabel: `${stock.stockLength}'-0"`,
            quantity: stock.count,
            unitWeight: BAR_WEIGHTS[result.barSize] || 0,
            totalWeight: Math.round(stock.count * stock.stockLength * (BAR_WEIGHTS[result.barSize] || 0)),
            grade: 60,
            coating: 'none',
          });
        }
      }
    }

    // Sort by bar size then stock length
    poLines.sort((a: any, b: any) => a.barSize - b.barSize || a.stockLength - b.stockLength);

    const totalBars = poLines.reduce((s: number, l: any) => s + l.quantity, 0);
    const totalWeight = poLines.reduce((s: number, l: any) => s + l.totalWeight, 0);

    res.json({
      projectName: projectName || 'Project',
      supplier: supplier || '',
      date: new Date().toISOString(),
      lines: poLines,
      totalBars,
      totalWeightLbs: totalWeight,
      totalWeightTons: Math.round(totalWeight / 2000 * 100) / 100,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Estimate vs Actual ──────────────────────────────────────

/** POST /api/tools/compare */
router.post('/compare', (req, res) => {
  try {
    const { estimate, actual } = req.body;
    // estimate and actual are arrays of { name, elementType, tons, concreteCY }

    const comparisons = (estimate || []).map((est: any) => {
      const act = (actual || []).find((a: any) =>
        a.name === est.name || a.elementType === est.elementType
      );

      const estTons = est.tons || 0;
      const actTons = act?.tons || 0;
      const variance = actTons - estTons;
      const variancePercent = estTons > 0 ? Math.round((variance / estTons) * 10000) / 100 : 0;

      return {
        name: est.name,
        elementType: est.elementType,
        estimatedTons: Math.round(estTons * 100) / 100,
        actualTons: Math.round(actTons * 100) / 100,
        varianceTons: Math.round(variance * 100) / 100,
        variancePercent,
        status: Math.abs(variancePercent) <= 5 ? 'good' : Math.abs(variancePercent) <= 15 ? 'warning' : 'over',
      };
    });

    // Check for actual items not in estimate
    const unmatchedActual = (actual || []).filter((a: any) =>
      !(estimate || []).some((e: any) => e.name === a.name || e.elementType === a.elementType)
    ).map((a: any) => ({
      name: a.name,
      elementType: a.elementType,
      estimatedTons: 0,
      actualTons: Math.round((a.tons || 0) * 100) / 100,
      varianceTons: Math.round((a.tons || 0) * 100) / 100,
      variancePercent: 100,
      status: 'new',
    }));

    const allComparisons = [...comparisons, ...unmatchedActual];
    const totalEstimated = allComparisons.reduce((s: number, c: any) => s + c.estimatedTons, 0);
    const totalActual = allComparisons.reduce((s: number, c: any) => s + c.actualTons, 0);
    const totalVariance = totalActual - totalEstimated;

    res.json({
      comparisons: allComparisons,
      totalEstimated: Math.round(totalEstimated * 100) / 100,
      totalActual: Math.round(totalActual * 100) / 100,
      totalVarianceTons: Math.round(totalVariance * 100) / 100,
      totalVariancePercent: totalEstimated > 0 ? Math.round((totalVariance / totalEstimated) * 10000) / 100 : 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Dashboard Chart Data ─────────────────────────────────────

/** GET /api/tools/chart-data/:projectId */
router.get('/chart-data/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const bbs = generateBBS(projectId);

    // Weight by bar size
    const weightBySize: Record<string, number> = {};
    for (const row of bbs.rows) {
      const key = `#${row.barSize}`;
      weightBySize[key] = (weightBySize[key] || 0) + row.totalWeight;
    }

    // Weight by structural element
    const items = db.getRebarItems(projectId);
    const weightByElement: Record<string, number> = {};
    for (const item of items) {
      const el = item.structural_element || 'Unknown';
      const wt = item.total_length && item.bar_size
        ? (item.total_length / 12) * (BAR_WEIGHTS[item.bar_size] || 0) * (item.quantity || 1)
        : 0;
      weightByElement[el] = (weightByElement[el] || 0) + wt;
    }

    // Quantity by bar size
    const qtyBySize: Record<string, number> = {};
    for (const row of bbs.rows) {
      const key = `#${row.barSize}`;
      qtyBySize[key] = (qtyBySize[key] || 0) + row.quantity;
    }

    // Confidence distribution
    const confBuckets = { high: 0, medium: 0, low: 0 };
    for (const item of items) {
      const c = item.confidence || 0;
      if (c >= 0.8) confBuckets.high++;
      else if (c >= 0.6) confBuckets.medium++;
      else confBuckets.low++;
    }

    res.json({
      weightBySize,
      weightByElement,
      qtyBySize,
      confidenceDistribution: confBuckets,
      totalWeight: bbs.grandTotalWeight,
      totalLength: bbs.grandTotalLength,
      totalMarks: bbs.rows.length,
      totalItems: items.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Shop Drawing Markup ──────────────────────────────────────

/** GET /api/tools/markup/:sheetId - Load annotations for a sheet */
router.get('/markup/:sheetId', (req, res) => {
  try {
    const sheet = db.getSheet(req.params.sheetId);
    res.json({ annotations: sheet?.markup_annotations || [] });
  } catch {
    res.json({ annotations: [] });
  }
});

/** POST /api/tools/markup/:sheetId - Save annotations for a sheet */
router.post('/markup/:sheetId', (req, res) => {
  try {
    const { annotations } = req.body;
    db.updateSheet(req.params.sheetId, { markup_annotations: annotations || [] });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
