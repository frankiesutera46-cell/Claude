import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Error:', err.message || err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
    return;
  }

  if (err.message?.includes('Unsupported file type')) {
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: err.message || 'Internal server error' });
}
