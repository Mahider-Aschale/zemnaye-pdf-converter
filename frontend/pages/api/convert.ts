import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Files, Fields } from 'formidable';
import path from 'path';
import fs from 'fs/promises';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Parse form with formidable
const parseForm = (req: NextApiRequest): Promise<{ fields: Fields; files: Files }> => {
  const form = formidable({
    multiples: false,
    uploadDir: '/tmp', // ✅ Vercel’s writable directory
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

// Convert to PDF using ApiFlash
const convertToPDF = async (previewUrl: string): Promise<Buffer> => {
  const apiKey = process.env.APIFLASH_API_KEY;
  if (!apiKey) throw new Error('Missing APIFLASH_API_KEY');

  const screenshotUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${apiKey}&url=${encodeURIComponent(previewUrl)}&format=pdf&response_type=image`;
  const response = await fetch(screenshotUrl);
  if (!response.ok) throw new Error('Conversion failed');

  return Buffer.from(await response.arrayBuffer());
};

// Main handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { files } = await parseForm(req);
    const file = files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploaded = Array.isArray(file) ? file[0] : file;
    const filename = path.basename(uploaded.filepath);

    // 🧠 Read the file to base64 or serve it in a preview route
    const previewUrl = `https://zemnaye-pdf-converter-two.vercel.app/api/preview?name=${filename}`;

    const pdfBuffer = await convertToPDF(previewUrl);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=converted.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Conversion error:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
