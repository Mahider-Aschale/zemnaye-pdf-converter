import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Files, Fields } from 'formidable';


export const config = {
  api: {
    bodyParser: false,
  },
};

// Parse form data from incoming request
const parseForm = (req: NextApiRequest): Promise<{ fields: Fields; files: Files }> => {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    fileWriteStreamHandler: () => {
      // Prevent writing to disk by returning a null stream that buffers data
      const chunks: any[] = [];
      const writable = new WritableStream({
        write(chunk) {
          chunks.push(chunk);
        },
        close() {
          // no-op
        }
      });
      return writable as any;
    },
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

// Use ApiFlash to generate a screenshot-based PDF
const convertToPDF = async (previewUrl: string): Promise<Buffer> => {
  const apiKey = process.env.APIFLASH_API_KEY;
  if (!apiKey) throw new Error('Missing APIFLASH_API_KEY');

  const screenshotUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${apiKey}&url=${encodeURIComponent(previewUrl)}&format=pdf&response_type=image`;
  const response = await fetch(screenshotUrl);

  if (!response.ok) throw new Error('PDF conversion failed');
  return Buffer.from(await response.arrayBuffer());
};

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

    // 👇 Dummy preview URL - this part needs to be adjusted if you're not hosting previews
    const previewUrl = `https://zemnaye-pdf-converter-two.vercel.app/preview?name=dummy-preview`; // Replace with real one if needed
    const pdfBuffer = await convertToPDF(previewUrl);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=converted.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Conversion error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
