import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  calculateElement,
  calculateEstimateTotals,
  getEstimates,
  getEstimate,
  saveEstimate,
  deleteEstimate,
  REBAR_DENSITIES,
  SLAB_PSF_RATIOS,
  BUILDING_TEMPLATES,
  type Estimate,
  type EstimateElement,
} from '../services/estimatingService.js';
import { upload } from '../middleware/upload.js';
import { config } from '../config/index.js';
import { detectFormat, pdfToImages, processImage, processDxf } from '../services/fileIngestion.js';
import { extractForEstimating } from '../services/claudeEstimating.js';

const router = Router();

/** GET /api/estimating - List all estimates */
router.get('/', (_req, res) => {
  res.json(getEstimates());
});

/** GET /api/estimating/densities - Get density reference tables */
router.get('/densities', (_req, res) => {
  res.json({ densities: REBAR_DENSITIES, slabPsf: SLAB_PSF_RATIOS });
});

/** GET /api/estimating/templates - Get building templates */
router.get('/templates', (_req, res) => {
  res.json(BUILDING_TEMPLATES);
});

/** GET /api/estimating/:id - Get single estimate */
router.get('/:id', (req, res) => {
  const est = getEstimate(req.params.id);
  if (!est) { res.status(404).json({ error: 'Estimate not found' }); return; }
  res.json(est);
});

/** POST /api/estimating - Create new estimate */
router.post('/', (req, res) => {
  const b = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();

  const elements: EstimateElement[] = (b.elements || []).map((el: any) => {
    const calc = calculateElement(el);
    return {
      id: el.id || uuidv4(),
      estimateId: id,
      name: el.name || '',
      elementType: el.elementType || 'spread_footing',
      inputMethod: el.inputMethod || 'dimensions',
      length: el.length || undefined,
      width: el.width || undefined,
      depth: el.depth || undefined,
      count: el.count || 1,
      cubicYards: el.cubicYards || undefined,
      squareFeet: el.squareFeet || undefined,
      thickness: el.thickness || undefined,
      densityLevel: el.densityLevel || 'medium',
      customDensity: el.customDensity || undefined,
      ...calc,
      notes: el.notes || undefined,
    };
  });

  const wasteFactor = b.wasteFactor ?? 5;
  const lapSpliceFactor = b.lapSpliceFactor ?? 10;
  const accessoriesFactor = b.accessoriesFactor ?? 3;

  const totals = calculateEstimateTotals(elements, wasteFactor, lapSpliceFactor, accessoriesFactor);

  const estimate: Estimate = {
    id,
    projectName: b.projectName || `Estimate ${new Date().toLocaleDateString()}`,
    buildingType: b.buildingType || undefined,
    description: b.description || undefined,
    elements,
    wasteFactor,
    lapSpliceFactor,
    accessoriesFactor,
    ...totals,
    createdAt: now,
    updatedAt: now,
  };

  saveEstimate(estimate);
  res.status(201).json(estimate);
});

/** PUT /api/estimating/:id - Update estimate */
router.put('/:id', (req, res) => {
  const existing = getEstimate(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Estimate not found' }); return; }

  const b = req.body;

  const elements: EstimateElement[] = (b.elements || existing.elements).map((el: any) => {
    const calc = calculateElement(el);
    return {
      id: el.id || uuidv4(),
      estimateId: existing.id,
      name: el.name || '',
      elementType: el.elementType || 'spread_footing',
      inputMethod: el.inputMethod || 'dimensions',
      length: el.length || undefined,
      width: el.width || undefined,
      depth: el.depth || undefined,
      count: el.count || 1,
      cubicYards: el.cubicYards || undefined,
      squareFeet: el.squareFeet || undefined,
      thickness: el.thickness || undefined,
      densityLevel: el.densityLevel || 'medium',
      customDensity: el.customDensity || undefined,
      ...calc,
      notes: el.notes || undefined,
    };
  });

  const wasteFactor = b.wasteFactor ?? existing.wasteFactor;
  const lapSpliceFactor = b.lapSpliceFactor ?? existing.lapSpliceFactor;
  const accessoriesFactor = b.accessoriesFactor ?? existing.accessoriesFactor;

  const totals = calculateEstimateTotals(elements, wasteFactor, lapSpliceFactor, accessoriesFactor);

  const updated: Estimate = {
    ...existing,
    projectName: b.projectName ?? existing.projectName,
    buildingType: b.buildingType ?? existing.buildingType,
    description: b.description ?? existing.description,
    elements,
    wasteFactor,
    lapSpliceFactor,
    accessoriesFactor,
    ...totals,
    updatedAt: new Date().toISOString(),
  };

  saveEstimate(updated);
  res.json(updated);
});

/** DELETE /api/estimating/:id */
router.delete('/:id', (req, res) => {
  if (!deleteEstimate(req.params.id)) {
    res.status(404).json({ error: 'Estimate not found' }); return;
  }
  res.json({ success: true });
});

/** POST /api/estimating/calculate - Calculate without saving (preview) */
router.post('/calculate', (req, res) => {
  const b = req.body;
  const elements = (b.elements || []).map((el: any) => {
    const calc = calculateElement(el);
    return { ...el, ...calc };
  });

  const totals = calculateEstimateTotals(
    elements,
    b.wasteFactor ?? 5,
    b.lapSpliceFactor ?? 10,
    b.accessoriesFactor ?? 3,
  );

  res.json({ elements, ...totals });
});

/** POST /api/estimating/upload - Upload drawings and extract elements for estimating */
router.post('/upload', upload.array('files', 20), async (req, res, next) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const outputDir = path.join(config.uploadDir, 'estimating-' + uuidv4());
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Convert all uploads to images
    const allImagePaths: string[] = [];
    const fileResults: { filename: string; pages: number; status: string; error?: string }[] = [];

    for (const file of files) {
      const format = detectFormat(file.originalname);

      try {
        if (format === 'pdf') {
          const images = await pdfToImages(file.path, outputDir);
          allImagePaths.push(...images);
          fileResults.push({ filename: file.originalname, pages: images.length, status: 'success' });
        } else if (format === 'image') {
          const processed = await processImage(file.path, outputDir);
          allImagePaths.push(processed);
          fileResults.push({ filename: file.originalname, pages: 1, status: 'success' });
        } else if (format === 'dxf') {
          const { imagePath } = await processDxf(file.path, outputDir);
          if (imagePath) {
            allImagePaths.push(imagePath);
            fileResults.push({ filename: file.originalname, pages: 1, status: 'success' });
          } else {
            fileResults.push({ filename: file.originalname, pages: 0, status: 'error', error: 'Could not rasterize DXF' });
          }
        } else {
          fileResults.push({ filename: file.originalname, pages: 0, status: 'error', error: `Unsupported format: ${format}` });
        }
      } catch (err: any) {
        fileResults.push({ filename: file.originalname, pages: 0, status: 'error', error: err.message });
      }
    }

    if (allImagePaths.length === 0) {
      res.status(400).json({
        error: 'No images could be extracted from the uploaded files',
        files: fileResults,
      });
      return;
    }

    // Run Claude Vision extraction for estimating
    const extraction = await extractForEstimating(allImagePaths);

    // Calculate rebar for each extracted element
    const elements = extraction.elements.map((el: any) => {
      const calc = calculateElement(el);
      return { ...el, ...calc };
    });

    const totals = calculateEstimateTotals(
      elements as EstimateElement[],
      5, // default waste
      10, // default lap splice
      3, // default accessories
    );

    res.json({
      elements,
      ...totals,
      files: fileResults,
      pagesProcessed: extraction.pageCount,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
