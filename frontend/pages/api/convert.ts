// pages/api/convert.ts

import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false, // still required if future file support is considered
  },
};


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', 'https://zemnaye-pdf-converter-two.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { urlToConvert } = req.query;

  if (!urlToConvert || typeof urlToConvert !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid URL to convert' });
  }

  const accessKey = process.env.APIFLASH_API_KEY;
  if (!accessKey) {
    return res.status(500).json({ error: 'Missing APIFlash API key' });
  }

  const apiFlashUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${accessKey}&url=${encodeURIComponent(
    urlToConvert
  )}&format=pdf`;

  try {
    const response = await fetch(apiFlashUrl);
    if (!response.ok) {
      throw new Error(`APIFlash failed with status ${response.status}`);
    }

    const pdfBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=snapshot.pdf');
    res.send(Buffer.from(pdfBuffer));
  } catch (error: any) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: 'Failed to convert URL to PDF', detail: error.message });
  }
}
