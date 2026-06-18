import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  exportDir: path.resolve(process.env.EXPORT_DIR || './exports'),
  dbPath: path.resolve(process.env.DB_PATH || './rebar-detailer.db'),
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/tiff',
    'application/dxf',
    'application/octet-stream', // DWG/DXF often comes as this
  ],
  claudeModel: 'claude-sonnet-4-20250514',
  maxConcurrentExtractions: 3,
};
