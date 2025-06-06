// pages/api/convert.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import { config as dotenvConfig } from 'dotenv';
import CloudConvert from 'cloudconvert';
import FormData from 'form-data';




export const config = {
  api: {
    bodyParser: false,
  },
};


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY || '');
  console.log("CLOUDCONVERT_API_KEY:", process.env.CLOUDCONVERT_API_KEY);

  res.setHeader('Access-Control-Allow-Origin', 'https://zemnaye-pdf-converter.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm({ uploadDir: '/tmp', keepExtensions: true });
  form.parse(req, async (err, fields, files) => {
    if (err || !files.file) {
      return res.status(400).json({ error: 'File upload failed' });
    }

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    const inputPath = uploadedFile.filepath;
    const fileName = path.basename(inputPath);

    try {
      const job = await cloudConvert.jobs.create({
        tasks: {
          upload: { operation: 'import/upload' },
          convert: { operation: 'convert', input: 'upload', output_format: 'pdf' },
          export: { operation: 'export/url', input: 'convert' },
        },
      });

      const uploadTask = job.tasks?.find((t: any) => t.name === 'upload');
      if (!uploadTask?.result?.form) {
        return res.status(500).json({ error: 'CloudConvert upload task failed' });
      }

      const { url, parameters } = uploadTask.result.form;

      const fileStream = fs.createReadStream(inputPath);
      const formData = new FormData();
      for (const [key, value] of Object.entries(parameters)) {
        formData.append(key, value as string);
      }
      formData.append('file', fileStream, fileName);

      await fetch(url, {
        method: 'POST',
        body: formData as any,
        headers: formData.getHeaders(),
      });

      const completedJob = await cloudConvert.jobs.wait(job.id);
      const exportTask = completedJob.tasks?.find((t: any) => t.name === 'export');
      const file = exportTask?.result?.files?.[0];

      if (!file?.url) {
        return res.status(500).json({ error: 'Exported file not found' });
      }

      const pdfRes = await fetch(file.url);
      const pdfBuffer = await pdfRes.arrayBuffer();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=converted.pdf');
      res.send(Buffer.from(pdfBuffer));
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Conversion failed', detail: error.message });
    }
  });
}
