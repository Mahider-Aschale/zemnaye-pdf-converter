import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs-extra'; // ✅ use fs-extra instead of 'fs/promises'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { name } = req.query;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid name parameter' });
  }

  try {
    const filePath = path.join(process.cwd(), 'public', 'uploads', path.basename(name));
    const fileBuffer = await fs.readFile(filePath); // ✅ works like fs.promises.readFile
    const fileExt = path.extname(filePath).toLowerCase();

    if (fileExt === '.docx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } else if (fileExt === '.pptx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
    }

    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
    return res.send(fileBuffer);
  } catch (error) {
    console.error('Preview error:', error);
    return res.status(500).json({ error: 'Failed to load file' });
  }
}
