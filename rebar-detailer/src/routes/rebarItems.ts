import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';

const router = Router();

router.get('/projects/:projectId/rebar', (req, res) => {
  res.json(db.getRebarItems(req.params.projectId));
});

router.get('/rebar/:id', (req, res) => {
  const item = db.getRebarItem(req.params.id);
  if (!item) { res.status(404).json({ error: 'Rebar item not found' }); return; }
  res.json(item);
});

router.put('/rebar/:id', (req, res) => {
  const updated = db.updateRebarItem(req.params.id, req.body);
  if (!updated) { res.status(404).json({ error: 'Rebar item not found' }); return; }
  res.json(updated);
});

router.post('/projects/:projectId/rebar', (req, res) => {
  const b = req.body;
  const id = uuidv4();
  const sheets = db.getSheets(req.params.projectId);
  const sheetId = b.sheet_id || sheets[0]?.id || 'manual';

  db.createRebarItem({
    id,
    project_id: req.params.projectId,
    sheet_id: sheetId,
    bar_mark: b.bar_mark || '',
    bar_size: b.bar_size || 5,
    shape_code: b.shape_code || '00',
    total_length: b.total_length || null,
    dim_a: b.dim_a || null,
    dim_b: b.dim_b || null,
    dim_c: b.dim_c || null,
    dim_d: b.dim_d || null,
    dim_e: b.dim_e || null,
    hook_type: b.hook_type || null,
    quantity: b.quantity || 1,
    spacing: b.spacing || null,
    structural_element: b.structural_element || '',
    zone: b.zone || null,
    grade: b.grade || 60,
    coating: b.coating || 'none',
    notes: b.notes || null,
    confidence: 1.0,
    source: 'manual',
  });

  res.status(201).json(db.getRebarItem(id));
});

router.delete('/rebar/:id', (req, res) => {
  if (!db.deleteRebarItem(req.params.id)) {
    res.status(404).json({ error: 'Rebar item not found' }); return;
  }
  res.json({ success: true });
});

export default router;
