import { Router } from 'express';
import { db } from '../db/connection.js';

const router = Router();

router.get('/', (_req, res) => {
  const projects = db.getProjects().map((p: any) => ({
    ...p,
    sheet_count: db.getProjectSheetCount(p.id),
    item_count: db.getProjectItemCount(p.id),
  }));
  res.json(projects);
});

router.get('/:id', (req, res) => {
  const project = db.getProject(req.params.id);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  res.json({
    ...project,
    sheet_count: db.getProjectSheetCount(project.id),
    item_count: db.getProjectItemCount(project.id),
  });
});

router.delete('/:id', (req, res) => {
  if (!db.deleteProject(req.params.id)) {
    res.status(404).json({ error: 'Project not found' }); return;
  }
  res.json({ success: true });
});

router.get('/:id/sheets', (req, res) => {
  res.json(db.getSheets(req.params.id));
});

export default router;
