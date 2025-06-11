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
      if (err || !files.file) return reject('File parsing error');
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      resolve({ file });
    });
  });
};

//  Delete uploaded file after conversion
const safeDeleteFile = (filePath: string) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(` Deleted uploaded file: ${filePath}`);
  }
};

// Main API handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { file } = await parseForm(req);
    const filePath = file.filepath;
    const originalName = file.originalFilename || 'upload';
    const fileExt = originalName.split('.').pop()?.toLowerCase();

    const supportedTypes = ['docx', 'pptx'];
    if (!fileExt || !supportedTypes.includes(fileExt)) {
      return res.status(400).json({ error: 'Only .docx and .pptx files are supported.' });
    }

    const secret = process.env.CONVERT_API_SECRET;
    if (!secret) {
      throw new Error('Missing ConvertAPI secret key');
    }

    const formData = new FormData();
    formData.append('File', fs.createReadStream(filePath), originalName);

    const url = `https://v2.convertapi.com/convert/${fileExt}/to/pdf?Secret=${secret}`;
    console.log(` Calling ConvertAPI: ${url}`);

    const response = await axios.post(url, formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log(' ConvertAPI response:', JSON.stringify(response.data, null, 2));

    const files = response.data.Files?.[0];
    const downloadUrl = files?.Url;
    const fileDataBase64 = files?.FileData;

    if (downloadUrl) {
      const pdfResponse = await axios.get(downloadUrl, { responseType: 'stream' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=converted.pdf');

      pdfResponse.data.pipe(res);
      pdfResponse.data.on('end', () => safeDeleteFile(filePath));

    } else if (fileDataBase64) {
      const buffer = Buffer.from(fileDataBase64, 'base64');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=converted.pdf');

      res.send(buffer);
      safeDeleteFile(filePath);

    } else {
      console.error(' Missing file URL or base64 data:', response.data);
      throw new Error('Neither Url nor FileData found in ConvertAPI response.');
    }

  } catch (error: any) {
    const errMessage = error?.response?.data?.Message || error.message || 'Conversion failed';
    console.error(' ConvertAPI error:', error?.response?.data || error);
    return res.status(500).json({ error: errMessage });
  }
}
