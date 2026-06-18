import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { generateBBS, type BBSSummary, type BBSRow } from './bbsGenerator.js';
import { generatePlacingList, type PlacingList } from './placingListGenerator.js';

/**
 * Export BBS as CSV.
 */
export function exportBBSCsv(projectId: string): string {
  const bbs = generateBBS(projectId);

  const records = bbs.rows.map((row) => ({
    'Bar Mark': row.barMark,
    'Bar Size': `#${row.barSize}`,
    'Shape': row.shapeDescription,
    'Shape Code': row.shapeCode,
    'Cut Length (in)': row.cutLength.toFixed(1),
    'Cut Length (ft-in)': inchesToFtIn(row.cutLength),
    'Quantity': row.quantity,
    'Total Length (ft)': row.totalLength.toFixed(2),
    'Unit Weight (lb/ft)': row.unitWeight.toFixed(3),
    'Total Weight (lbs)': row.totalWeight.toFixed(2),
    'Grade': row.grade,
    'Coating': row.coating,
    'Notes': row.notes,
  }));

  // Add summary rows
  records.push({} as any); // blank row
  records.push({ 'Bar Mark': 'SUMMARY BY SIZE' } as any);
  for (const s of bbs.totalsBySize) {
    records.push({
      'Bar Mark': '',
      'Bar Size': `#${s.barSize}`,
      'Total Length (ft)': s.totalLength.toFixed(2),
      'Total Weight (lbs)': s.totalWeight.toFixed(2),
    } as any);
  }
  records.push({
    'Bar Mark': 'GRAND TOTAL',
    'Total Length (ft)': bbs.grandTotalLength.toFixed(2),
    'Total Weight (lbs)': bbs.grandTotalWeight.toFixed(2),
  } as any);

  return stringify(records, { header: true });
}

/**
 * Export BBS as PDF.
 */
export async function exportBBSPdf(projectId: string, projectName: string): Promise<string> {
  const bbs = generateBBS(projectId);
  const outputPath = path.join(config.exportDir, `${projectId}-bbs.pdf`);

  if (!fs.existsSync(config.exportDir)) {
    fs.mkdirSync(config.exportDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 36 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Title
    doc.fontSize(16).font('Helvetica-Bold').text('BAR BENDING SCHEDULE', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(projectName, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(8).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(1);

    // Table header
    const cols = [
      { label: 'Mark', width: 45 },
      { label: 'Size', width: 35 },
      { label: 'Shape', width: 80 },
      { label: 'Cut Length', width: 65 },
      { label: 'Qty', width: 35 },
      { label: 'Total (ft)', width: 60 },
      { label: 'Wt/ft', width: 45 },
      { label: 'Total Wt', width: 55 },
      { label: 'Grade', width: 35 },
      { label: 'Coating', width: 50 },
      { label: 'Notes', width: 180 },
    ];

    let x = 36;
    const headerY = doc.y;

    doc.fontSize(8).font('Helvetica-Bold');
    for (const col of cols) {
      doc.text(col.label, x, headerY, { width: col.width });
      x += col.width;
    }

    doc.moveDown(0.3);
    doc.moveTo(36, doc.y).lineTo(36 + cols.reduce((s, c) => s + c.width, 0), doc.y).stroke();
    doc.moveDown(0.3);

    // Table rows
    doc.font('Helvetica').fontSize(7);
    for (const row of bbs.rows) {
      if (doc.y > 540) {
        doc.addPage();
        doc.y = 36;
      }

      x = 36;
      const rowY = doc.y;
      const values = [
        row.barMark,
        `#${row.barSize}`,
        row.shapeDescription,
        inchesToFtIn(row.cutLength),
        row.quantity.toString(),
        row.totalLength.toFixed(1),
        row.unitWeight.toFixed(3),
        row.totalWeight.toFixed(1),
        row.grade.toString(),
        row.coating,
        row.notes,
      ];

      for (let i = 0; i < cols.length; i++) {
        doc.text(values[i], x, rowY, { width: cols[i].width });
        x += cols[i].width;
      }
      doc.moveDown(0.3);
    }

    // Summary
    doc.moveDown(1);
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('SUMMARY BY BAR SIZE');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(8);

    for (const s of bbs.totalsBySize) {
      doc.text(`#${s.barSize}: ${s.totalLength.toFixed(1)} ft — ${s.totalWeight.toFixed(1)} lbs`);
    }

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(
      `GRAND TOTAL: ${bbs.grandTotalLength.toFixed(1)} ft — ${bbs.grandTotalWeight.toFixed(1)} lbs (${(bbs.grandTotalWeight / 2000).toFixed(2)} tons)`,
    );

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

/**
 * Export Placing List as PDF.
 */
export async function exportPlacingListPdf(projectId: string): Promise<string> {
  const pl = generatePlacingList(projectId);
  const outputPath = path.join(config.exportDir, `${projectId}-placing-list.pdf`);

  if (!fs.existsSync(config.exportDir)) {
    fs.mkdirSync(config.exportDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 36 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Title
    doc.fontSize(16).font('Helvetica-Bold').text('REBAR PLACING LIST', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(pl.projectName, { align: 'center' });
    doc.fontSize(8).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(1);

    for (const zone of pl.zones) {
      if (doc.y > 680) doc.addPage();

      // Zone header
      doc.fontSize(12).font('Helvetica-Bold')
        .text(`ZONE: ${zone.zone}`, { underline: true });
      doc.fontSize(8).font('Helvetica')
        .text(`${zone.totalBars} bars — ${zone.totalWeight} lbs`);
      doc.moveDown(0.5);

      for (const element of zone.elements) {
        if (doc.y > 680) doc.addPage();

        // Element header
        doc.fontSize(10).font('Helvetica-Bold')
          .text(element.structuralElement);
        doc.moveDown(0.3);

        // Column headers
        const cols = [
          { label: 'Mark', width: 50 },
          { label: 'Size', width: 35 },
          { label: 'Shape', width: 140 },
          { label: 'Length', width: 55 },
          { label: 'Qty', width: 35 },
          { label: 'Spacing', width: 55 },
          { label: 'Notes', width: 160 },
        ];

        let x = 36;
        const headerY = doc.y;
        doc.fontSize(7).font('Helvetica-Bold');
        for (const col of cols) {
          doc.text(col.label, x, headerY, { width: col.width });
          x += col.width;
        }
        doc.moveDown(0.2);
        doc.moveTo(36, doc.y).lineTo(36 + cols.reduce((s, c) => s + c.width, 0), doc.y).stroke();
        doc.moveDown(0.2);

        // Items
        doc.font('Helvetica').fontSize(7);
        for (const item of element.items) {
          if (doc.y > 720) doc.addPage();

          x = 36;
          const rowY = doc.y;
          const values = [
            item.barMark,
            item.sizeLabel,
            item.shapeDescription,
            item.cutLengthDisplay,
            item.quantity.toString(),
            item.spacingDisplay || '—',
            item.notes,
          ];

          // Highlight low-confidence items
          if (item.confidence < 0.7) {
            doc.save();
            doc.rect(34, rowY - 1, cols.reduce((s, c) => s + c.width, 0) + 4, 11)
              .fill('#FFF3CD');
            doc.restore();
            doc.fillColor('black');
          }

          for (let i = 0; i < cols.length; i++) {
            doc.text(values[i], x, rowY, { width: cols[i].width });
            x += cols[i].width;
          }
          doc.moveDown(0.2);
        }

        doc.moveDown(0.5);
      }

      doc.moveDown(0.5);
    }

    // Grand total
    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(
      `GRAND TOTAL: ${pl.grandTotalBars} bars — ${pl.grandTotalWeight} lbs (${(pl.grandTotalWeight / 2000).toFixed(2)} tons)`,
    );

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

/**
 * Export Placing List as CSV.
 */
export function exportPlacingListCsv(projectId: string): string {
  const pl = generatePlacingList(projectId);
  const records: any[] = [];

  for (const zone of pl.zones) {
    for (const element of zone.elements) {
      for (const item of element.items) {
        records.push({
          Zone: zone.zone,
          Element: element.structuralElement,
          'Bar Mark': item.barMark,
          Size: item.sizeLabel,
          Shape: item.shapeDescription,
          'Cut Length': item.cutLengthDisplay,
          Quantity: item.quantity,
          Spacing: item.spacingDisplay || '',
          Notes: item.notes,
        });
      }
    }
  }

  return stringify(records, { header: true });
}

function inchesToFtIn(inches: number): string {
  if (!inches || inches <= 0) return '0"';
  const feet = Math.floor(inches / 12);
  const remaining = Math.round(inches % 12);
  if (feet === 0) return `${remaining}"`;
  return `${feet}'-${remaining}"`;
}
