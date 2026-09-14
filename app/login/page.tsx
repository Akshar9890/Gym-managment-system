"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push(data.redirectUrl || (data.role === "STAFF" ? "/staff" : "/dashboard"));
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    setError("");
    setPasskeyLoading(true);

    try {
      // 1. Fetch authentication options (pass email if already entered for scoped lookup, or empty for 1-tap discoverable)
      const optRes = await fetch("/api/auth/passkey/login-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() || undefined }),
      });

      const options = await optRes.json();

      if (!optRes.ok) {
        throw new Error(options.error || "Failed to initialize passkey sign-in");
      }

      // 2. Trigger biometric / security key prompt on device
      const authenticationResponse = await startAuthentication({
        optionsJSON: options,
      });

      // 3. Verify response with server and establish session
      const verifyRes = await fetch("/api/auth/passkey/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authenticationResponse }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Passkey authentication failed");
      }

      router.push(verifyData.redirectUrl || "/dashboard");
      router.refresh();
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        // User dismissed the biometric prompt
        return;
      }
      setError(err.message || "Passkey login failed. Please try again or use password.");
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0C0E] px-4">
      {/* Background subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#F59E0B 1px, transparent 1px), linear-gradient(90deg, #F59E0B 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6.5 6.5h11M6.5 17.5h11M4 12h16M4 8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5ZM20 8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5ZM4 20.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5ZM20 20.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight">
            BSF THE GYM
          </h1>
          <p className="text-sm text-gray-500 mt-1">Staff & Management Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#17191E] border border-[#252830] rounded-xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* 1-Tap Passkey / Face ID Button */}
          <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={passkeyLoading || loading}
            className="w-full py-3 px-4 bg-[#111316] hover:bg-[#1C1F26] border border-amber-500/40 hover:border-amber-400 text-white font-semibold rounded-lg transition-all text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/5 group cursor-pointer disabled:opacity-50 mb-6"
          >
            {passkeyLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Fingerprint className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            )}
            <span>
              {passkeyLoading
                ? "Verifying Biometrics..."
                : "Sign in with Passkey / Face ID"}
            </span>
          </button>

          {/* OR divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#252830]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#17191E] px-3 text-gray-500 font-medium">
                Or sign in with password
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-400 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#111316] border border-[#252830] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors text-sm"
                placeholder="staff@bsfgym.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-400 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#111316] border border-[#252830] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading || passkeyLoading}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  <span>Signing in…</span>
                </>
              ) : (
                "Sign in with Password"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          BSF THE GYM • Gotri-Sevasi Road, Vadodara
        </p>
      </div>
    </div>
  );
}
