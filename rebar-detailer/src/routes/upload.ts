import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { upload } from '../middleware/upload.js';
import { db } from '../db/connection.js';
import { processUploadedFile } from '../services/extractionPipeline.js';

const router = Router();

router.post('/', upload.array('files', 20), async (req, res, next) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const projectName = req.body.projectName || `Project ${new Date().toLocaleDateString()}`;
    const projectId = req.body.projectId || uuidv4();

    if (!db.getProject(projectId)) {
      db.createProject({
        id: projectId,
        name: projectName,
        description: req.body.description || '',
      });
    }

    let totalSheets = 0;
    let totalItems = 0;
    const results = [];

    for (const file of files) {
      try {
        const result = await processUploadedFile(file.path, file.originalname, projectId);
        totalSheets += result.sheetsCreated;
        totalItems += result.itemsExtracted;
        results.push({ filename: file.originalname, ...result, status: 'success' });
      } catch (err: any) {
        results.push({ filename: file.originalname, status: 'error', error: err.message });
      }
    }

    res.json({ projectId, projectName, totalSheets, totalItems, files: results });
  } catch (err) {
    next(err);
  }
});

export default router;
