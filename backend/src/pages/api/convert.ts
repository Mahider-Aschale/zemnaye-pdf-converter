import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import os from "os";
import Cors from "micro-cors";
import { IncomingMessage, ServerResponse } from "http";

const Busboy = require("busboy"); // ✅ Correct way to import Busboy from CommonJS

// Setup CORS middleware
const cors = Cors({
  origin:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3001"
      : "https://zemnaye-pdf-converter.vercel.app",
  allowMethods: ["POST", "OPTIONS"],
});

// ✅ Parse multipart/form-data using Busboy
function parseForm(
  req: IncomingMessage
): Promise<{ buffer: Buffer; filename: string }> {
  return new Promise((resolve, reject) => {
    const bb = new Busboy({ headers: req.headers });
    const chunks: Buffer[] = [];
    let fileName = "";

    bb.on("file", (_name: string, file: NodeJS.ReadableStream, info: { filename: string }) => {
      fileName = info.filename;
      file.on("data", (chunk: Buffer) => chunks.push(chunk));
    });

    bb.on("finish", () => {
      resolve({ buffer: Buffer.concat(chunks), filename: fileName });
    });

    bb.on("error", reject);
    req.pipe(bb);
  });
}

// ✅ The actual API handler
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { buffer, filename } = await parseForm(req as IncomingMessage);

    const tempDir = path.join(os.tmpdir(), `upload-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const inputFilePath = path.join(tempDir, filename);
    await fs.writeFile(inputFilePath, buffer);

    const outputFilePath = inputFilePath.replace(path.extname(filename), ".pdf");

    const sofficePath =
      process.platform === "win32"
        ? `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`
        : "soffice";

    await new Promise<void>((resolve, reject) => {
      const process = spawn(
        sofficePath,
        ["--headless", "--convert-to", "pdf", "--outdir", tempDir, inputFilePath],
        { shell: true }
      );

      process.stdout.on("data", (data) => console.log("LibreOffice stdout:", data.toString()));
      process.stderr.on("data", (data) => console.error("LibreOffice stderr:", data.toString()));

      process.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`LibreOffice exited with code ${code}`));
      });

      process.on("error", reject);
    });

    const pdfBuffer = await fs.readFile(outputFilePath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename.replace(/\.\w+$/, ".pdf")}"`
    );
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("Conversion Error:", error);
    return res.status(500).json({ error: "Conversion failed. Please try again." });
  }
}

// ✅ Wrap handler with micro-cors and cast to proper types for compatibility
export default cors((handler as unknown) as (req: IncomingMessage, res: ServerResponse) => void);
