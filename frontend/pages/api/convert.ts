// pages/api/convert.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({
    multiples: false,
    keepExtensions: true,
    uploadDir: path.join(process.cwd(), '/uploads'),
  });

  try {
    const [fields, files] = await form.parse(req);
    const file = files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadedFile = Array.isArray(file) ? file[0] : file;

    const { filepath, mimetype, originalFilename } = uploadedFile;

    if (!filepath || !originalFilename) {
      return res.status(400).json({ error: 'Invalid file data' });
    }

    // Validate file type
    const allowedTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    if (!allowedTypes.includes(mimetype || '')) {
      return res.status(400).json({ error: 'Only DOCX and PPTX files are allowed' });
    }

    // 👉 You can insert your file conversion logic here
    // Example (mock response):
    const convertedFilename = originalFilename.replace(/\.(docx|pptx)$/i, '.pdf');
    const downloadUrl = `/downloads/${convertedFilename}`;

    // Respond
    return res.status(200).json({
      message: 'File uploaded successfully',
      originalFilename,
      convertedFilename,
      downloadUrl,
    });
  } catch (err) {
    console.error('Error parsing form:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export default handler;
