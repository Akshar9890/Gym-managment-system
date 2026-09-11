// app/api/payments/proof-upload/route.ts
// Handles payment proof upload (file or base64 data)
// Supported types: JPG, PNG, WEBP, PDF <= 10MB
// Saves to public/uploads/proofs/ and returns the URL.

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

export async function POST(req: NextRequest) {
  try {
    await requireSession(); // Any logged in staff or admin can upload proof

    const contentType = req.headers.get("content-type") || "";

    const uploadDir = path.join(process.cwd(), "public", "uploads", "proofs");
    await fs.mkdir(uploadDir, { recursive: true });

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
      const randomString = crypto.randomBytes(8).toString("hex");
      const filename = `proof_${Date.now()}_${randomString}${ext}`;
      const filePath = path.join(uploadDir, filename);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(filePath, buffer);

      const publicUrl = `/uploads/proofs/${filename}`;

      return NextResponse.json({
        success: true,
        url: publicUrl,
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
      const randomString = crypto.randomBytes(8).toString("hex");
      const filename = `proof_${Date.now()}_${randomString}${ext}`;
      const filePath = path.join(uploadDir, filename);

      await fs.writeFile(filePath, buffer);

      const publicUrl = `/uploads/proofs/${filename}`;

      return NextResponse.json({
        success: true,
        url: publicUrl,
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
    if (err.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Proof upload error:", err);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
