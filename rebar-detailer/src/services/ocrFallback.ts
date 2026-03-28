import Tesseract from 'tesseract.js';
import type { CreateRebarItem } from '../models/RebarItem.js';
import { parseLengthToInches } from '../utils/rebarLookup.js';

interface OcrResult {
  items: Partial<CreateRebarItem>[];
  rawText: string;
  confidence: number;
}

/**
 * Extract rebar information from a drawing image using Tesseract OCR + regex patterns.
 */
export async function extractWithOcr(
  imagePath: string,
  projectId: string,
  sheetId: string,
): Promise<OcrResult> {
  const { data } = await Tesseract.recognize(imagePath, 'eng', {
    logger: () => {}, // Suppress progress logging
  });

  const rawText = data.text;
  const items = parseOcrText(rawText, projectId, sheetId);
  const confidence = items.length > 0 ? 0.5 : 0; // OCR results are inherently lower confidence

  return { items, rawText, confidence };
}

/**
 * Extract rebar callouts from OCR text using regex patterns.
 */
function parseOcrText(
  text: string,
  projectId: string,
  sheetId: string,
): Partial<CreateRebarItem>[] {
  const items: Partial<CreateRebarItem>[] = [];
  const lines = text.split('\n');
  let markCounter = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Pattern: quantity-#size (e.g., "12-#8", "(4) #9", "4-#5")
    const qtyBarMatch = trimmed.match(/\(?(\d+)\)?\s*[-–]\s*#(\d{1,2})/);

    // Pattern: #size @ spacing (e.g., "#5 @ 12" O.C.", "#4@8"OC")
    const spacingMatch = trimmed.match(/#(\d{1,2})\s*@\s*(\d+(?:\.\d+)?)\s*["\u2033]?\s*[oO]\.?[cC]\.?/);

    // Pattern: #size bar with length (e.g., "#8 x 22'-6"")
    const lengthMatch = trimmed.match(/#(\d{1,2})\s*[xX]\s*([\d]+['\u2032][\s-]*[\d]*["\u2033]?)/);

    // Pattern: stirrup callout (e.g., "#4 stirrups", "#3 ties")
    const stirrupMatch = trimmed.match(/#(\d{1,2})\s*(?:stirrup|tie|hoop)s?/i);

    // Pattern: simple bar reference (e.g., "#5 bars", "#8")
    const simpleBarMatch = trimmed.match(/#(\d{1,2})\s*(?:bar|rebar)?s?\b/);

    if (qtyBarMatch) {
      const item: Partial<CreateRebarItem> = {
        projectId,
        sheetId,
        barMark: `OCR-${markCounter++}`,
        barSize: parseInt(qtyBarMatch[2]),
        quantity: parseInt(qtyBarMatch[1]),
        shapeCode: '00',
        dimensions: {},
        source: 'ocr',
        confidence: 0.6,
      };

      // Check if there's also spacing info on the same line
      if (spacingMatch) {
        item.spacing = parseFloat(spacingMatch[2]);
      }

      // Check for length info
      if (lengthMatch) {
        item.totalLength = parseLengthToInches(lengthMatch[2]);
      }

      // Check for structural element context
      const elementMatch = trimmed.match(/(footing|column|beam|slab|wall|foundation|pile\s*cap|grade\s*beam|pier)\s*([A-Z]?\d*)/i);
      if (elementMatch) {
        item.structuralElement = `${elementMatch[1]} ${elementMatch[2]}`.trim();
      }

      items.push(item);
    } else if (spacingMatch) {
      const item: Partial<CreateRebarItem> = {
        projectId,
        sheetId,
        barMark: `OCR-${markCounter++}`,
        barSize: parseInt(spacingMatch[1]),
        spacing: parseFloat(spacingMatch[2]),
        shapeCode: '00',
        dimensions: {},
        quantity: 1,
        source: 'ocr',
        confidence: 0.5,
      };

      if (stirrupMatch) {
        item.shapeCode = '51';
        item.confidence = 0.55;
      }

      items.push(item);
    } else if (stirrupMatch && !spacingMatch && !qtyBarMatch) {
      items.push({
        projectId,
        sheetId,
        barMark: `OCR-${markCounter++}`,
        barSize: parseInt(stirrupMatch[1]),
        shapeCode: '51',
        dimensions: {},
        quantity: 1,
        source: 'ocr',
        confidence: 0.4,
        notes: 'Stirrup/tie - verify dimensions',
      });
    } else if (lengthMatch && !qtyBarMatch) {
      items.push({
        projectId,
        sheetId,
        barMark: `OCR-${markCounter++}`,
        barSize: parseInt(lengthMatch[1]),
        totalLength: parseLengthToInches(lengthMatch[2]),
        shapeCode: '00',
        dimensions: {},
        quantity: 1,
        source: 'ocr',
        confidence: 0.5,
      });
    }
  }

  // Also look for bar bending schedule tables
  const bbsItems = parseBarScheduleTable(text, projectId, sheetId, markCounter);
  items.push(...bbsItems);

  return items;
}

/**
 * Attempt to parse a bar bending schedule table from OCR text.
 * These tables typically have columns: Mark, Size, Shape, Length, Qty, etc.
 */
function parseBarScheduleTable(
  text: string,
  projectId: string,
  sheetId: string,
  startMark: number,
): Partial<CreateRebarItem>[] {
  const items: Partial<CreateRebarItem>[] = [];

  // Look for table-like rows with tab or space-separated values
  // Typical BBS row: "1A  #5  Straight  20'-0"  12"
  const tableRowPattern = /^([A-Z]?\d+[A-Z]?)\s+#?(\d{1,2})\s+(\w+)\s+([\d'"\s-]+)\s+(\d+)/gm;
  let match;

  while ((match = tableRowPattern.exec(text)) !== null) {
    const shapeStr = match[3].toLowerCase();
    let shapeCode = '00';
    if (shapeStr.includes('stirrup') || shapeStr.includes('tie')) shapeCode = '51';
    else if (shapeStr.includes('l-') || shapeStr.includes('l shape')) shapeCode = '11';
    else if (shapeStr.includes('u-') || shapeStr.includes('u shape') || shapeStr.includes('hairpin')) shapeCode = '21';
    else if (shapeStr.includes('hook')) shapeCode = '12';

    items.push({
      projectId,
      sheetId,
      barMark: match[1],
      barSize: parseInt(match[2]),
      shapeCode,
      totalLength: parseLengthToInches(match[4]),
      quantity: parseInt(match[5]),
      dimensions: {},
      source: 'ocr',
      confidence: 0.65,
    });
  }

  return items;
}

/**
 * Extract text entities that might come from DXF parsing.
 */
export function extractFromDxfText(
  textEntities: string[],
  projectId: string,
  sheetId: string,
): Partial<CreateRebarItem>[] {
  // Join all text entities and parse as if it were OCR text
  const combinedText = textEntities.join('\n');
  return parseOcrText(combinedText, projectId, sheetId);
}
