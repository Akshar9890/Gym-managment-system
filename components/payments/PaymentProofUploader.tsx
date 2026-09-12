"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Camera,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
} from "lucide-react";

interface PaymentProofUploaderProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  required?: boolean;
}

export function PaymentProofUploader({
  value,
  onChange,
  required = false,
}: PaymentProofUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stop camera when modal closes or unmounts
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  async function compressImage(file: File): Promise<File> {
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      return file;
    }
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxDim = 1400;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file);
            } else {
              resolve(
                new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                  type: "image/jpeg",
                })
              );
            }
          },
          "image/jpeg",
          0.82
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  }

  const handleFileUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setError("Invalid file format. Please upload JPG, PNG, WEBP, or PDF");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const fileToUpload = await compressImage(file);
      const formData = new FormData();
      formData.append("file", fileToUpload);

      const res = await fetch("/api/payments/proof-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload file");
      }

      onChange(data.url);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please check device permissions.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopCamera();

    setIsUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/proof-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, filename: "camera_capture.jpg" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload photo");
      }

      onChange(data.url);
    } catch (err: any) {
      console.error("Capture upload error:", err);
      setError(err.message || "Failed to save captured photo");
    } finally {
      setIsUploading(false);
    }
  };

  const isPdf = Boolean(
    value &&
      (value.toLowerCase().endsWith(".pdf") ||
        value.startsWith("data:application/pdf"))
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Payment Proof / Receipt {required && <span className="text-rose-400">*</span>}
        </label>
        {value && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
            <CheckCircle className="w-3.5 h-3.5" /> Attached
          </span>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = "";
        }}
      />

      {/* Hidden canvas for camera snapshot */}
      <canvas ref={canvasRef} className="hidden" />

      {/* When proof is uploaded */}
      {value ? (
        <div className="relative rounded-xl border border-slate-700 bg-slate-900/80 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            {isPdf ? (
              <div className="w-12 h-12 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shrink-0 relative group">
                <img src={value} alt="Payment Proof" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">
                {isPdf ? "Payment Proof Document (PDF)" : "Payment Screenshot / Photo"}
              </p>
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors mt-0.5"
              >
                <Eye className="w-3 h-3" /> View original
              </a>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
              title="Remove proof"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* When no proof is uploaded */
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-4 transition-colors hover:border-slate-600">
          {isUploading ? (
            <div className="py-6 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <p className="text-xs font-medium">Uploading payment proof...</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 transition-all shadow-sm"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Upload Screenshot / PDF</span>
              </button>

              <button
                type="button"
                onClick={startCamera}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 transition-all shadow-sm"
              >
                <Camera className="w-4 h-4 text-amber-400" />
                <span>Take Photo via Camera</span>
              </button>
            </div>
          )}

          <p className="text-center text-[11px] text-slate-500 mt-2">
            Upload screenshot of UPI transaction, bank transfer, or cash slip (JPG, PNG, WEBP, PDF up to 10MB)
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Camera Capture Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
              <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-400" /> Capture Payment Proof
              </span>
              <button
                type="button"
                onClick={stopCamera}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-[4/3] bg-black overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={capturePhoto}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                <Camera className="w-4 h-4" /> Snap & Upload
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
