import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs/promises';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { name } = req.query;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid file name' });
  }

  try {
    const filePath = path.join('/tmp', name); // Only read from Vercel’s writable /tmp
    const fileData = await fs.readFile(filePath);
    const fileExt = path.extname(name).toLowerCase();

    let contentType = 'application/octet-stream';
    if (fileExt === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (fileExt === '.pptx') contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${name}"`);
    res.send(fileData);
  } catch (error) {
    console.error('Preview error:', error);
    res.status(404).json({ error: 'File not found' });
  }
}
