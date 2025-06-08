// File: /pages/api/preview.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs/promises';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { name } = req.query;

  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  try {
    const filePath = path.join(process.cwd(), 'public', 'uploads', name);
    const fileData = await fs.readFile(filePath);

    const ext = path.extname(name).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.png': 'image/png',
      '.txt': 'text/plain',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.send(fileData);
  } catch (err) {
    console.error('Preview error:', err);
    res.status(404).json({ error: 'File not found' });
  }
}
