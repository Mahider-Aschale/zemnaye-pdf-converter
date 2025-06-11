import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

// Disable Next.js default body parsing to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to parse form data
const parseForm = (req: NextApiRequest): Promise<{ file: File }> => {
  const form = formidable({ multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err || !files.file) reject('File parsing error');
      else resolve({ file: Array.isArray(files.file) ? files.file[0] : files.file });
    });
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers for cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Respond to preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { file } = await parseForm(req);
    const fileExt = file.originalFilename?.split('.').pop()?.toLowerCase();

    const supportedTypes = ['docx', 'pptx'];
    if (!fileExt || !supportedTypes.includes(fileExt)) {
      return res.status(400).json({ error: 'Only .docx and .pptx files are supported.' });
    }

    const formData = new FormData();
    formData.append('File', fs.createReadStream(file.filepath), file.originalFilename || 'upload');

    const secret = process.env.CONVERT_API_SECRET;
    if (!secret) throw new Error('Missing ConvertAPI secret key');

    const url = `https://v2.convertapi.com/convert/${fileExt}/to/pdf?Secret=${secret}`;
    const response = await axios.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const downloadUrl = response.data.Files?.[0]?.Url;
    if (!downloadUrl) throw new Error('No file URL returned by ConvertAPI.');

    res.status(200).json({ downloadUrl });
  } catch (error: any) {
    const errMsg = error?.response?.data?.Message || error?.message || 'Conversion failed';
    console.error('ConvertAPI error:', error?.response?.data || error);
    res.status(500).json({ error: errMsg });
  }
}
