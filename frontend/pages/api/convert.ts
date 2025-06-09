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

    // Step 1: Create upload task
    const uploadTaskRes = await axios.post(
      'https://api.cloudconvert.com/v2/import/upload',
      {},
      {
        headers: {
          Authorization: `Bearer ${process.env.CLOUDCONVERT_API_KEY}`, // You must store your key in Vercel env vars
        },
      }
    );

    const uploadTask = uploadTaskRes.data.data;
    const uploadUrl = uploadTask.result.form.url;
    const uploadParams = uploadTask.result.form.parameters;

    const formData = new FormData();
    for (const [key, value] of Object.entries(uploadParams)) {
      if (typeof value === 'string' || value instanceof Blob) {
        formData.append(key, value);
      } else {
        console.warn(`Skipping key ${key} because it's not a valid FormData value`);
      }
    }

    formData.append('file', fileStream, file.originalFilename || 'upload.docx');

    await axios.post(uploadUrl, formData, {
      headers: formData.getHeaders(),
    });

    // Step 3: Convert uploaded file
    const convertRes = await axios.post(
      'https://api.cloudconvert.com/v2/convert',
      {
        input_format: 'docx',
        output_format: 'pdf',
        engine: 'office',
        input: 'import/upload',
        file: uploadTask.id,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CLOUDCONVERT_API_KEY}`,
        },
      }
    );

    const convertTask = convertRes.data.data;

    // Step 4: Wait for conversion to finish
    let finishedTask;
    for (let i = 0; i < 15; i++) {
      const status = await axios.get(
        `https://api.cloudconvert.com/v2/tasks/${convertTask.id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.CLOUDCONVERT_API_KEY}`,
          },
        }
      );

      if (status.data.data.status === 'finished') {
        finishedTask = status.data.data;
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
    }

    if (!finishedTask || !finishedTask.result || !finishedTask.result.files) {
      throw new Error('Conversion did not finish or returned no result.');
    }

    const fileUrl = finishedTask.result.files[0].url;
    res.status(200).json({ downloadUrl: fileUrl });

  } catch (error: any) {
    console.error('CloudConvert error:', error.response?.data || error.message || error);
    res.status(500).json({ error: error.response?.data || error.message || 'Conversion failed' });
  }
}
