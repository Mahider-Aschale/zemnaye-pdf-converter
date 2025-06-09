import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { file } = await parseForm(req);
    const fileStream = fs.createReadStream(file.filepath);

    // STEP 1: Create CloudConvert Job
    const jobRes = await axios.post(
      'https://api.cloudconvert.com/v2/jobs',
      {
        tasks: {
          'import-my-file': {
            operation: 'import/upload',
          },
          'convert-my-file': {
            operation: 'convert',
            input: 'import-my-file',
            input_format: 'docx',
            output_format: 'pdf',
            engine: 'office',
          },
          'export-my-file': {
            operation: 'export/url',
            input: 'convert-my-file',
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.CLOUDCONVERT_API_KEY}`,
        },
      }
    );

    const job = jobRes.data.data;
    const importTask = job.tasks.find((t: any) => t.name === 'import-my-file');
    const uploadUrl = importTask.result.form.url;
    const uploadParams = importTask.result.form.parameters;

    // STEP 2: Upload File to CloudConvert
    const formData = new FormData();
    for (const [key, value] of Object.entries(uploadParams)) {
      formData.append(key, value as string);
    }
    formData.append('file', fileStream, file.originalFilename || 'upload.docx');

    await axios.post(uploadUrl, formData, {
      headers: formData.getHeaders(),
    });

    // STEP 3: Poll for job completion
    let exportTask;
    for (let i = 0; i < 15; i++) {
      const pollRes = await axios.get(`https://api.cloudconvert.com/v2/jobs/${job.id}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLOUDCONVERT_API_KEY}`,
        },
      });

      const jobData = pollRes.data.data;
      exportTask = jobData.tasks.find(
        (t: any) => t.name === 'export-my-file' && t.status === 'finished'
      );

      if (exportTask) break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!exportTask || !exportTask.result || !exportTask.result.files.length) {
      throw new Error('Export failed or did not complete in time.');
    }

    const downloadUrl = exportTask.result.files[0].url;
    res.status(200).json({ downloadUrl });
  } catch (error: any) {
    console.error('CloudConvert error:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
}
