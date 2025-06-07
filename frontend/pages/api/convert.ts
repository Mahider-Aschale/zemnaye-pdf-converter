import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, {  Files, Fields } from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to parse the form data using formidable
const parseForm = (req: NextApiRequest): Promise<{ fields: Fields; files: Files }> => {
  const form = formidable({ multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { files } = await parseForm(req);
    const fileData = files.file;

    if (!fileData) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadedFile = Array.isArray(fileData) ? fileData[0] : fileData;

    return res.status(200).json({
      filename: uploadedFile.originalFilename,
      mimetype: uploadedFile.mimetype,
      filepath: uploadedFile.filepath,
    });
  } catch (error) {
    console.error('Error parsing form:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
