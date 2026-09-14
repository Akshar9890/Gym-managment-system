"use client";

import React, { useState, useEffect } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { KeyRound, Fingerprint, Trash2, Plus, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { format } from "date-fns";

interface PasskeyItem {
  id: string;
  name: string | null;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export function PasskeyManager() {
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchPasskeys();
  }, []);

  async function fetchPasskeys() {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/passkey/list");
      const data = await res.json();
      if (res.ok) {
        setPasskeys(data.passkeys || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function getAutoDeviceName(): string {
    if (typeof window === "undefined") return "My Device";
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return "iPhone Face ID / Touch ID";
    if (/iPad/i.test(ua)) return "iPad Face ID / Touch ID";
    if (/Macintosh/i.test(ua)) return "MacBook Touch ID";
    if (/Android/i.test(ua)) return "Android Biometrics";
    if (/Windows/i.test(ua)) return "Windows Hello";
    return "Biometric Passkey";
  }

  async function handleRegisterPasskey() {
    try {
      setMessage(null);
      setRegistering(true);

      // 1. Get registration options from server
      const optRes = await fetch("/api/auth/passkey/register-options", {
        method: "POST",
      });
      const options = await optRes.json();

      if (!optRes.ok) {
        throw new Error(options.error || "Failed to generate passkey options");
      }

      // 2. Trigger browser passkey creation modal (Touch ID / Face ID / Windows Hello)
      const registrationResponse = await startRegistration({ optionsJSON: options });

      const deviceName = getAutoDeviceName();

      // 3. Send response back to server for verification
      const verifyRes = await fetch("/api/auth/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationResponse, deviceName }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Passkey registration failed");
      }

      setMessage({
        type: "success",
        text: `Passkey "${deviceName}" registered successfully! You can now log in instantly using biometrics.`,
      });

      await fetchPasskeys();
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setMessage({
          type: "error",
          text: "Passkey registration was cancelled by user.",
        });
      } else {
        setMessage({
          type: "error",
          text: err.message || "Failed to register passkey on this device.",
        });
      }
    } finally {
      setRegistering(false);
    }
  }

  async function handleDeletePasskey(id: string) {
    if (!confirm("Are you sure you want to remove this passkey?")) return;

    try {
      setDeletingId(id);
      setMessage(null);
      const res = await fetch("/api/auth/passkey/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkeyId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete passkey");
      }

      setPasskeys((prev) => prev.filter((p) => p.id !== id));
      setMessage({ type: "success", text: "Passkey removed." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to remove passkey." });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-[#17191E] border border-[#252830] rounded-xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-semibold text-white">
              Passkey &amp; Biometric Sign-in
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Sign into BSF THE GYM instantly with Touch ID, Face ID, Windows Hello, or Android Fingerprint without typing a password.
          </p>
        </div>

        <button
          onClick={handleRegisterPasskey}
          disabled={registering}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold shadow-lg shadow-amber-500/10 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          {registering ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span>{registering ? "Registering..." : "Add This Device"}</span>
        </button>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-xs flex items-center gap-2.5 border ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-red-500/10 text-red-400 border-red-500/30"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="py-6 flex items-center justify-center text-gray-500 text-xs">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          <span>Loading registered devices...</span>
        </div>
      ) : passkeys.length === 0 ? (
        <div className="border border-dashed border-[#2E3340] rounded-lg p-6 text-center text-xs text-gray-400">
          <KeyRound className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="font-medium text-gray-300">No passkeys registered yet</p>
          <p className="text-gray-500 mt-0.5">
            Click &ldquo;Add This Device&rdquo; above to link your phone, tablet, or laptop biometrics.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#252830] border border-[#252830] rounded-lg overflow-hidden">
          {passkeys.map((pk) => (
            <div
              key={pk.id}
              className="p-4 flex items-center justify-between hover:bg-[#1C1F26] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">
                    {pk.name || "Biometric Passkey"}
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                    <span>
                      Added {format(new Date(pk.createdAt), "dd MMM yyyy")}
                    </span>
                    {pk.lastUsedAt && (
                      <>
                        <span>•</span>
                        <span>
                          Last used {format(new Date(pk.lastUsedAt), "dd MMM yyyy, hh:mm a")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeletePasskey(pk.id)}
                disabled={deletingId === pk.id}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                title="Remove Passkey"
              >
                {deletingId === pk.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
