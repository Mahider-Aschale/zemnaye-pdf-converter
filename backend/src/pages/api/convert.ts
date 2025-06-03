import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import os from "os";
import Cors from "micro-cors";
import { IncomingMessage } from "http";
import Busboy from "busboy";

const cors = Cors({
  origin:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3001"
      : "https://zemnaye-pdf-converter.vercel.app",
  allowMethods: ["POST", "OPTIONS"],
});

function parseForm(req: IncomingMessage): Promise<{ buffer: Buffer; filename: string }> {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });
    const chunks: Buffer[] = [];
    let filename = "";

    bb.on("file", (_fieldname, file, info) => {
      filename = info.filename;
      file.on("data", (chunk: Buffer) => chunks.push(chunk));
    });

    bb.on("finish", () => {
      resolve({ buffer: Buffer.concat(chunks), filename });
    });

    bb.on("error", reject);
    req.pipe(bb);
  });
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { buffer, filename } = await parseForm(req);

    const tempDir = path.join(os.tmpdir(), `upload-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const inputFilePath = path.join(tempDir, filename);
    await fs.writeFile(inputFilePath, buffer);

    const outputFilePath = inputFilePath.replace(path.extname(filename), ".pdf");
    const sofficePath = `"C:\\Program Files\\LibreOffice\\program\\soffice.exe"`;

    await new Promise<void>((resolve, reject) => {
      const process = spawn(
        sofficePath,
        ["--headless", "--convert-to", "pdf", "--outdir", tempDir, inputFilePath],
        { shell: true }
      );

      process.stdout.on("data", (data) => console.log("stdout:", data.toString()));
      process.stderr.on("data", (data) => console.error("stderr:", data.toString()));

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

// ✅ Wrap and export correctly
const wrappedHandler = cors(handler as any);
export default wrappedHandler;
