import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import { config } from '../config/index.js';
import {
  detectFormat,
  pdfToImages,
  processImage,
  processDxf,
} from './fileIngestion.js';
import { extractWithClaude } from './claudeVision.js';
import { extractWithOcr, extractFromDxfText } from './ocrFallback.js';
import type { CreateRebarItem } from '../models/RebarItem.js';
import { calculateCutLength } from '../utils/rebarLookup.js';

/**
 * Process an uploaded file through the full extraction pipeline.
 */
export async function processUploadedFile(
  filePath: string,
  filename: string,
  projectId: string,
): Promise<{ sheetsCreated: number; itemsExtracted: number }> {
  const format = detectFormat(filename);
  const projectUploadDir = path.join(config.uploadDir, projectId);

  if (!fs.existsSync(projectUploadDir)) {
    fs.mkdirSync(projectUploadDir, { recursive: true });
  }

  let sheetsCreated = 0;
  let itemsExtracted = 0;

  if (format === 'pdf') {
    const imagePaths = await pdfToImages(filePath, projectUploadDir);

    for (let i = 0; i < imagePaths.length; i++) {
      const sheetId = uuidv4();
      db.createSheet({
        id: sheetId,
        project_id: projectId,
        filename,
        original_path: filePath,
        image_path: imagePaths[i],
        page_number: i + 1,
        status: 'processing',
      });

      const count = await extractAndStore(imagePaths[i], projectId, sheetId);
      itemsExtracted += count;
      db.updateSheet(sheetId, { status: 'complete' });
      sheetsCreated++;
    }

    if (imagePaths.length === 0) {
      const sheetId = uuidv4();
      db.createSheet({
        id: sheetId,
        project_id: projectId,
        filename,
        original_path: filePath,
        page_number: 1,
        status: 'error',
        error_message: 'Could not rasterize PDF. Install poppler-utils or ghostscript.',
      });
      sheetsCreated++;
    }
  } else if (format === 'image') {
    const processedPath = await processImage(filePath, projectUploadDir);
    const sheetId = uuidv4();

    db.createSheet({
      id: sheetId,
      project_id: projectId,
      filename,
      original_path: filePath,
      image_path: processedPath,
      page_number: 1,
      status: 'processing',
    });

    const count = await extractAndStore(processedPath, projectId, sheetId);
    itemsExtracted += count;
    db.updateSheet(sheetId, { status: 'complete' });
    sheetsCreated++;
  } else if (format === 'dxf') {
    const { textEntities, imagePath } = await processDxf(filePath, projectUploadDir);
    const sheetId = uuidv4();

    db.createSheet({
      id: sheetId,
      project_id: projectId,
      filename,
      original_path: filePath,
      image_path: imagePath || undefined,
      page_number: 1,
      status: 'processing',
    });

    let items: Partial<CreateRebarItem>[] = [];

    if (imagePath) {
      try {
        const claudeResult = await extractWithClaude(imagePath, projectId, sheetId);
        if (claudeResult.confidence > 0.5) {
          items = claudeResult.items;
        }
      } catch (err) {
        console.error('Claude extraction failed for DXF:', err);
      }
    }

    const dxfItems = extractFromDxfText(textEntities, projectId, sheetId);
    items = mergeItems(items, dxfItems);

    const count = storeItems(items, projectId, sheetId);
    itemsExtracted += count;
    db.updateSheet(sheetId, { status: 'complete' });
    sheetsCreated++;
  } else if (format === 'dwg') {
    const sheetId = uuidv4();
    db.createSheet({
      id: sheetId,
      project_id: projectId,
      filename,
      original_path: filePath,
      page_number: 1,
      status: 'error',
      error_message: 'DWG format requires conversion to DXF. Use ODA File Converter or save as DXF from AutoCAD.',
    });
    sheetsCreated++;
  }

  return { sheetsCreated, itemsExtracted };
}

async function extractAndStore(
  imagePath: string,
  projectId: string,
  sheetId: string,
): Promise<number> {
  let items: Partial<CreateRebarItem>[] = [];

  try {
    const claudeResult = await extractWithClaude(imagePath, projectId, sheetId);
    if (claudeResult.confidence > 0.5) {
      items = claudeResult.items;
    }
  } catch (err) {
    console.error('Claude Vision extraction failed:', err);
  }

  if (items.length === 0) {
    try {
      const ocrResult = await extractWithOcr(imagePath, projectId, sheetId);
      items = ocrResult.items;
    } catch (err) {
      console.error('OCR extraction also failed:', err);
    }
  } else {
    try {
      const ocrResult = await extractWithOcr(imagePath, projectId, sheetId);
      if (ocrResult.items.length > 0) {
        items = mergeItems(items, ocrResult.items);
      }
    } catch {
      // OCR supplement failed
    }
  }

  return storeItems(items, projectId, sheetId);
}

function mergeItems(
  primary: Partial<CreateRebarItem>[],
  secondary: Partial<CreateRebarItem>[],
): Partial<CreateRebarItem>[] {
  const merged = [...primary];
  for (const secItem of secondary) {
    const isDuplicate = primary.some(
      (priItem) =>
        priItem.barSize === secItem.barSize &&
        priItem.barMark === secItem.barMark &&
        priItem.structuralElement === secItem.structuralElement,
    );
    if (!isDuplicate) {
      merged.push(secItem);
    }
  }
  return merged;
}

function storeItems(
  items: Partial<CreateRebarItem>[],
  projectId: string,
  sheetId: string,
): number {
  let count = 0;
  for (const item of items) {
    let totalLength = item.totalLength;
    if (!totalLength && item.dimensions && item.shapeCode) {
      totalLength = calculateCutLength(item.barSize || 5, item.shapeCode, item.dimensions);
    }

    db.createRebarItem({
      id: uuidv4(),
      project_id: projectId,
      sheet_id: sheetId,
      bar_mark: item.barMark || '',
      bar_size: item.barSize || 5,
      shape_code: item.shapeCode || '00',
      total_length: totalLength || null,
      dim_a: item.dimensions?.a || null,
      dim_b: item.dimensions?.b || null,
      dim_c: item.dimensions?.c || null,
      dim_d: item.dimensions?.d || null,
      dim_e: item.dimensions?.e || null,
      hook_type: item.dimensions?.hookType || null,
      quantity: item.quantity || 1,
      spacing: item.spacing || null,
      structural_element: item.structuralElement || '',
      zone: item.zone || null,
      grade: item.grade || 60,
      coating: item.coating || 'none',
      notes: item.notes || null,
      confidence: item.confidence || 0.5,
      source: item.source || 'manual',
    });
    count++;
  }
  return count;
}
