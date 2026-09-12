// app/api/payments/proof-upload/route.ts
// Handles payment proof upload (file or base64 data)
// Supported types: JPG, PNG, WEBP, PDF <= 10MB
// Saves to public/uploads/proofs/ in local dev, or returns data URI in serverless (Vercel) environments.

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function persistFileOrDataUrl(
  buffer: Buffer,
  mimeType: string,
  ext: string
): Promise<{ url: string; filename: string }> {
  const randomString = crypto.randomBytes(8).toString("hex");
  const filename = `proof_${Date.now()}_${randomString}${ext}`;

  // On Vercel / serverless, filesystem is read-only. Fall back to Data URI directly.
  if (process.env.VERCEL) {
    return {
      url: `data:${mimeType};base64,${buffer.toString("base64")}`,
      filename,
    };
  }

  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "proofs");
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);
    return {
      url: `/uploads/proofs/${filename}`,
      filename,
    };
  } catch (fsErr) {
    console.warn("Local filesystem write failed, using data URI fallback:", fsErr);
    return {
      url: `data:${mimeType};base64,${buffer.toString("base64")}`,
      filename,
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession(); // Any logged in staff or admin can upload proof

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "File size exceeds maximum allowed limit of 10MB" },
          { status: 400 }
        );
      }

      const mimeType = file.type;
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return NextResponse.json(
          { error: "Invalid file format. Allowed: JPG, PNG, WEBP, PDF" },
          { status: 400 }
        );
      }

      const ext = EXTENSION_MAP[mimeType] || path.extname(file.name) || ".bin";
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { url, filename } = await persistFileOrDataUrl(buffer, mimeType, ext);

      return NextResponse.json({
        success: true,
        url,
        filename,
        mimeType,
        size: file.size,
      });
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      const { dataUrl, filename: originalFilename } = body;

      if (!dataUrl || typeof dataUrl !== "string") {
        return NextResponse.json({ error: "No image data provided" }, { status: 400 });
      }

      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return NextResponse.json({ error: "Invalid data URL format" }, { status: 400 });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return NextResponse.json(
          { error: "Invalid format. Allowed: JPG, PNG, WEBP, PDF" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(base64Data, "base64");
      if (buffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "File size exceeds maximum allowed limit of 10MB" },
          { status: 400 }
        );
      }

      const ext = EXTENSION_MAP[mimeType] || ".jpg";
      const { url, filename } = await persistFileOrDataUrl(buffer, mimeType, ext);

      return NextResponse.json({
        success: true,
        url,
        filename,
        mimeType,
        size: buffer.length,
      });
    }

    return NextResponse.json(
      { error: "Unsupported Content-Type. Use multipart/form-data or application/json" },
      { status: 400 }
    );
  } catch (err: any) {
    if (err?.name === "AuthError" || err?.message === "UNAUTHENTICATED" || err?.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Proof upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload file", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
