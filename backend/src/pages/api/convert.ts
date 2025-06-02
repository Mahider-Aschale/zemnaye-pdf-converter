// File: /app/api/convert/route.ts (Next.js 13+ App Router API Route)

import { NextRequest, NextResponse } from 'next/server';
import { mkdirSync, readFileSync, unlinkSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import formidable, { File as FormidableFile, Files } from 'formidable';
import { promisify } from 'util';

// ⛔ Required so Next.js doesn’t parse the request body
export const config = {
  api: {
    bodyParser: false,
  },
};

// ✅ Helper function to parse multipart/form-data using formidable
const parseForm = async (
  req: NextRequest
): Promise<{ file: FormidableFile }> => {
  const form = formidable({
    multiples: false,
    uploadDir: '/tmp',
    keepExtensions: true,
  });

  // Wrap in a Promise to use with async/await
  const [fields, files]: [formidable.Fields, formidable.Files] = await new Promise((resolve, reject) => {
    form.parse(req as any, (err, fields, files) => {
      if (err) reject(err);
      else resolve([fields, files]);
    });
  });

  // Handle multiple file edge cases
  const rawFile = files.file;
  const file = Array.isArray(rawFile) ? rawFile[0] : rawFile;

  if (!file || !file.filepath) {
    throw new Error('No valid file uploaded');
  }

  return { file };
};

// ✅ POST handler for converting uploaded files to PDF
export async function POST(req: NextRequest) {
  try {
    // 1. Parse the form to get uploaded file
    const { file } = await parseForm(req);
    const inputPath = file.filepath;
    const tempDir = `/tmp/${uuidv4()}`;
    mkdirSync(tempDir, { recursive: true });

    const outputDir = tempDir;

    // 2. Run LibreOffice CLI to convert to PDF
    await new Promise<void>((resolve, reject) => {
      const libre = spawn('libreoffice', [
        '--headless',
        '--convert-to',
        'pdf',
        '--outdir',
        outputDir,
        inputPath,
      ]);

      libre.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`LibreOffice failed with exit code ${code}`));
      });
    });

    // 3. Read the converted PDF file
    const outputFileName = path.basename(inputPath).replace(/\.[^.]+$/, '.pdf');
    const outputPath = path.join(outputDir, outputFileName);
    const pdfBuffer = readFileSync(outputPath);

    // 4. Clean up temp files
    unlinkSync(inputPath);
    unlinkSync(outputPath);

    // 5. Send the PDF buffer as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputFileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Error converting file:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Conversion failed' }),
      { status: 500 }
    );
  }
}
