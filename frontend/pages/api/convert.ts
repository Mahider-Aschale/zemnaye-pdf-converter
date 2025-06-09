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
    const fileStream = fs.createReadStream(file.filepath);

    const form = new FormData();
    form.append('file', fileStream, file.originalFilename || '');


    const cloudConvertResponse = await axios.post(
      'https://api.cloudconvert.com/v2/convert',
      {
        "input_format": "docx", // or pptx
        "output_format": "pdf",
        "engine": "office",
        "file": form,
      },
      {
        headers: {
          Authorization: `Bearer CLOUDCONVERT_API_KEY`, // Replace this
          ...form.getHeaders(),
        },
      }
    );

    // Handle response or stream back the result URL
    const resultUrl = cloudConvertResponse.data.data.result.url;
    res.status(200).json({ downloadUrl: resultUrl });

  } catch (error) {
    console.error('CloudConvert error:', error);
    res.status(500).json({ error: 'Conversion failed' });
  }
}


