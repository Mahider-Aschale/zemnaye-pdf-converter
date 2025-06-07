import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false, // important to disable Next.js default body parser for formidable to work
  },
};

// Wrap formidable's parse function into a Promise for async/await usage
const parseForm = (req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
  const form = new formidable.IncomingForm();
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

   
    const file = files.file; // 'file' is the field name from frontend form

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Handle file depending on whether it's single or multiple
    // formidable's file can be File | File[]
    const uploadedFile = Array.isArray(file) ? file[0] : file;

    // You can access properties like:
    // uploadedFile.filepath (string), uploadedFile.mimetype (string), uploadedFile.originalFilename (string)

    // Example: Just return file info
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
