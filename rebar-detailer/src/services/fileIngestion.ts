import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { config } from '../config/index.js';

export type FileFormat = 'pdf' | 'image' | 'dxf' | 'dwg' | 'unknown';

export function detectFormat(filename: string): FileFormat {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'pdf';
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.tiff':
    case '.tif':
      return 'image';
    case '.dxf':
      return 'dxf';
    case '.dwg':
      return 'dwg';
    default:
      return 'unknown';
  }
}

/**
 * Convert a PDF to page images using pdfjs-dist.
 * Returns array of image file paths (one per page).
 */
export async function pdfToImages(pdfPath: string, outputDir: string): Promise<string[]> {
  // Dynamic import for pdfjs-dist (ESM compatibility)
  const pdfjsLib = await import('pdfjs-dist');

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const imagePaths: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const scale = 3.0; // 300 DPI for standard 72 DPI PDF
    const viewport = page.getViewport({ scale });

    // Create a canvas-like object for node rendering
    const width = Math.floor(viewport.width);
    const height = Math.floor(viewport.height);

    // Use the built-in node canvas from pdfjs
    // We'll render to a raw pixel buffer
    const canvasFactory = {
      create(w: number, h: number) {
        const canvas = {
          width: w,
          height: h,
          getContext() {
            return null; // We'll use a different approach
          },
        };
        return canvas;
      },
      reset() {},
      destroy() {},
    };

    // Alternative approach: use sharp to create the image from raw operator data
    // For now, we use a simpler approach with a virtual canvas
    // In production, you'd use canvas (node-canvas) package
    // For our purposes, we'll convert using the pdf page's text + image content

    const outputPath = path.join(outputDir, `page-${i}.png`);

    // Simplified approach: if the PDF contains embedded images, extract them
    // For structural drawings, they're typically vector, so we need proper rendering
    // Using a shell command to ghostscript or poppler as fallback
    try {
      const { execSync } = await import('child_process');
      // Try pdftoppm (from poppler) first - most reliable for structural drawings
      execSync(
        `pdftoppm -png -r 300 -f ${i} -l ${i} "${pdfPath}" "${path.join(outputDir, 'page')}"`,
        { stdio: 'pipe' }
      );
      // pdftoppm outputs as page-01.png, page-1.png etc
      const possibleNames = [
        path.join(outputDir, `page-${i.toString().padStart(2, '0')}.png`),
        path.join(outputDir, `page-${i}.png`),
        path.join(outputDir, `page-0${i}.png`),
      ];
      const found = possibleNames.find((p) => fs.existsSync(p));
      if (found) {
        if (found !== outputPath) {
          fs.renameSync(found, outputPath);
        }
        imagePaths.push(outputPath);
        continue;
      }
    } catch {
      // pdftoppm not available, try ghostscript
    }

    try {
      const { execSync } = await import('child_process');
      execSync(
        `gs -dNOPAUSE -dBATCH -sDEVICE=png16m -r300 -dFirstPage=${i} -dLastPage=${i} -sOutputFile="${outputPath}" "${pdfPath}"`,
        { stdio: 'pipe' }
      );
      if (fs.existsSync(outputPath)) {
        imagePaths.push(outputPath);
        continue;
      }
    } catch {
      // ghostscript not available either
    }

    // Last resort: create a placeholder noting manual conversion needed
    console.warn(`Could not rasterize page ${i} of ${pdfPath}. Install poppler or ghostscript for PDF rendering.`);
  }

  return imagePaths;
}

/**
 * Process an uploaded image file - ensure it's in a format suitable for Claude Vision.
 * Returns the path to the processed image.
 */
export async function processImage(imagePath: string, outputDir: string): Promise<string> {
  const ext = path.extname(imagePath).toLowerCase();
  const basename = path.basename(imagePath, ext);
  const outputPath = path.join(outputDir, `${basename}.png`);

  // Convert to PNG, resize if too large (Claude has image size limits)
  await sharp(imagePath)
    .resize(4096, 4096, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toFile(outputPath);

  return outputPath;
}

/**
 * Parse a DXF file and extract text entities (rebar callouts).
 * Also rasterize if possible for Claude Vision.
 */
export async function processDxf(dxfPath: string, outputDir: string): Promise<{
  textEntities: string[];
  imagePath?: string;
}> {
  const DxfParser = (await import('dxf-parser')).default;
  const parser = new DxfParser();
  const content = fs.readFileSync(dxfPath, 'utf-8');
  const dxf = parser.parseSync(content);

  const textEntities: string[] = [];

  if (dxf?.entities) {
    for (const entity of dxf.entities) {
      if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
        const text = (entity as any).text || (entity as any).string || '';
        if (text.trim()) {
          textEntities.push(text.trim());
        }
      }
    }
  }

  // Try to rasterize DXF using LibreCAD or other tool
  let imagePath: string | undefined;
  try {
    const { execSync } = await import('child_process');
    const outputPng = path.join(outputDir, `${path.basename(dxfPath, '.dxf')}.png`);
    // Try using libreoffice or inkscape for conversion
    execSync(`inkscape "${dxfPath}" --export-type=png --export-filename="${outputPng}" --export-dpi=300`, {
      stdio: 'pipe',
    });
    if (fs.existsSync(outputPng)) {
      imagePath = outputPng;
    }
  } catch {
    // Rasterization tools not available
  }

  return { textEntities, imagePath };
}

/**
 * Read an image file and return it as a base64-encoded string for Claude Vision API.
 */
export async function imageToBase64(imagePath: string): Promise<{ base64: string; mediaType: string }> {
  const ext = path.extname(imagePath).toLowerCase();
  const mediaTypeMap: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };

  const mediaType = mediaTypeMap[ext] || 'image/png';
  const buffer = fs.readFileSync(imagePath);
  const base64 = buffer.toString('base64');

  return { base64, mediaType };
}
