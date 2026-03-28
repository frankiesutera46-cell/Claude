import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import uploadRoutes from './routes/upload.js';
import projectRoutes from './routes/projects.js';
import rebarItemRoutes from './routes/rebarItems.js';
import reportRoutes from './routes/reports.js';
import estimatingRoutes from './routes/estimating.js';
import toolsRoutes from './routes/tools.js';

const app = express();

// Ensure directories exist
for (const dir of [config.uploadDir, config.exportDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve uploaded images for the sheet viewer
app.use('/uploads', express.static(config.uploadDir));

// API routes
app.use('/api/upload', uploadRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', rebarItemRoutes);
app.use('/api/projects', reportRoutes);
app.use('/api/estimating', estimatingRoutes);
app.use('/api/tools', toolsRoutes);

// Error handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Rebar Detailer running at http://localhost:${config.port}`);
});

export default app;
