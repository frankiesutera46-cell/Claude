import { Router } from 'express';
import { db } from '../db/connection.js';
import { generateBBS } from '../services/bbsGenerator.js';
import { generatePlacingList } from '../services/placingListGenerator.js';
import {
  exportBBSCsv,
  exportBBSPdf,
  exportPlacingListCsv,
  exportPlacingListPdf,
} from '../services/exportService.js';

const router = Router();

router.get('/:id/bbs', (req, res) => {
  try { res.json(generateBBS(req.params.id)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/placing-list', (req, res) => {
  try { res.json(generatePlacingList(req.params.id)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/export/bbs-csv', (req, res) => {
  try {
    const csv = exportBBSCsv(req.params.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="bbs-${req.params.id}.csv"`);
    res.send(csv);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/export/bbs-pdf', async (req, res, next) => {
  try {
    const project = db.getProject(req.params.id);
    const pdfPath = await exportBBSPdf(req.params.id, project?.name || 'Project');
    res.download(pdfPath);
  } catch (err) { next(err); }
});

router.get('/:id/export/placing-csv', (req, res) => {
  try {
    const csv = exportPlacingListCsv(req.params.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="placing-list-${req.params.id}.csv"`);
    res.send(csv);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/export/placing-pdf', async (req, res, next) => {
  try {
    const pdfPath = await exportPlacingListPdf(req.params.id);
    res.download(pdfPath);
  } catch (err) { next(err); }
});

export default router;
