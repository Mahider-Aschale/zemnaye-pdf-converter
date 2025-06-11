import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

export const config = {
  api: {
    bodyParser: false,
  },
};

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
    
    // ✅ MUST be "File" (capital F) or ConvertAPI will reject it
    formData.append('File', fs.createReadStream(file.filepath), file.originalFilename || 'upload');

    const secret = process.env.CONVERT_API_SECRET;
    if (!secret) throw new Error('Missing ConvertAPI secret key');

    const url = `https://v2.convertapi.com/convert/${fileExt}/to/pdf?Secret=${secret}`;
    console.log(`Converting ${file.originalFilename} using: ${url}`);

    const response = await axios.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    console.log('ConvertAPI full response:', response.data);

    const downloadUrl = response.data.Files?.[0]?.Url;
    if (!downloadUrl) throw new Error('No file URL returned by ConvertAPI.');

    res.status(200).json({ downloadUrl });
  } catch (error: any) {
    const errMsg = error?.response?.data?.Message || error?.message || 'Conversion failed';
    console.error('ConvertAPI error:', error?.response?.data || error);
    res.status(500).json({ error: errMsg });
  }
  
  }

