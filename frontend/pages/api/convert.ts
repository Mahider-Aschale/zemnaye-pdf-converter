import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Files, Fields } from 'formidable';
import path from 'path';
import https from 'https';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Parse form with formidable
const parseForm = (req: NextApiRequest): Promise<{ fields: Fields; files: Files }> => {
  const form = formidable({ multiples: false, uploadDir: path.join(process.cwd(), 'public', 'uploads'), keepExtensions: true });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};


// Convert to PDF using ApiFlash
const convertToPDF = async (fileUrl: string): Promise<Buffer> => {
  const apiKey = process.env.APIFLASH_API_KEY;
  if (!apiKey) throw new Error('Missing APIFLASH_API_KEY');

  const apiUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${apiKey}&format=pdf&response_type=image&url=${encodeURIComponent(fileUrl)}`;

  return new Promise((resolve, reject) => {
    https.get(apiUrl, (res) => {
      if (res.statusCode !== 200) {
        let msg = `Failed to fetch PDF. Status code: ${res.statusCode}`;
        res.resume(); // Consume response to free memory
        return reject(new Error(msg));
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', (err) => reject(err));
  });
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
    const fileUrl = `https://${req.headers.host}/uploads/${filename}`; // Vercel will serve this

    const pdfBuffer = await convertToPDF(fileUrl);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=converted.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Conversion error:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
