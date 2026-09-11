// components/settings/SettingsClient.tsx — Account Settings for Admin and Staff
"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  User,
  Mail,
  Phone,
  Lock,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Save,
  KeyRound,
} from "lucide-react";

export interface UserSettingsProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  profilePhoto: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface SettingsClientProps {
  initialUser: UserSettingsProfile;
}

export function SettingsClient({ initialUser }: SettingsClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form State
  const [user, setUser] = useState<UserSettingsProfile>(initialUser);
  const [name, setName] = useState(initialUser.name);
  const [email, setEmail] = useState(initialUser.email);
  const [phone, setPhone] = useState(initialUser.phone || "");
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialUser.profilePhoto
  );

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Handle Image Upload
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setProfileError("Photo size must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setProfileError("Please select a valid image file");
      return;
    }

    setProfileError("");
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
    };
    reader.readAsDataURL(file);
  }

  function handleRemovePhoto() {
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Submit Profile Changes
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setProfileLoading(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() ? phone.trim() : null,
          profilePhoto: photoPreview,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setProfileError(json.error || "Failed to update profile");
        return;
      }

      setUser(json.data);
      setProfileSuccess("Profile details and credentials updated successfully!");
      router.refresh();
      setTimeout(() => setProfileSuccess(""), 4000);
    } catch {
      setProfileError("Network error. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  }

  // Submit Password Change
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match");
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setPasswordError(json.error || "Failed to change password");
        return;
      }

      setPasswordSuccess("Password changed successfully! Keep your new password safe.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(""), 5000);
    } catch {
      setPasswordError("Network error. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  }

  const roleLabel = {
    SUPER_ADMIN: "Super Administrator",
    ADMIN: "Administrator",
    STAFF: "Gym Staff",
  }[user.role] || user.role;

  const roleColor = {
    SUPER_ADMIN: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    ADMIN: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    STAFF: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  }[user.role] || "bg-gray-500/10 text-gray-400";

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-white tracking-tight">
          Account Settings
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Manage your login email ID, password, profile photo, and security preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Account Summary Card */}
        <div className="space-y-6">
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-6 shadow-xl space-y-5 text-center">
            {/* Avatar */}
            <div className="relative mx-auto w-28 h-28 rounded-full overflow-hidden border-2 border-amber-500/30 bg-[#111316] shadow-inner flex items-center justify-center">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-gray-500" />
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {user.name}
              </h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{user.email}</p>
              <div className="mt-3 inline-block">
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${roleColor}`}
                >
                  {roleLabel}
                </span>
              </div>
            </div>

            <div className="border-t border-[#252830] pt-4 text-xs space-y-2 text-left">
              <div className="flex items-center justify-between text-gray-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Account Status</span>
                </span>
                <span className="text-emerald-400 font-semibold">Active</span>
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <span>Created</span>
                </span>
                <span className="text-gray-300 font-mono">
                  {format(new Date(user.createdAt), "dd MMM yyyy")}
                </span>
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  <span>Last Login</span>
                </span>
                <span className="text-gray-300 font-mono">
                  {user.lastLoginAt
                    ? format(new Date(user.lastLoginAt), "dd MMM, hh:mm a")
                    : "Active session"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Profile & Security Forms */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section 1: Profile & Photo */}
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-6 shadow-xl space-y-6">
            <div className="border-b border-[#252830] pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <span>Profile Information & Photo</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Update your identity details and account photo.
              </p>
            </div>

            {profileSuccess && (
              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Photo Upload Actions */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-[#252830] bg-[#111316] flex items-center justify-center text-gray-500 shrink-0">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-gray-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-[#111316] hover:bg-[#20242D] text-white border border-[#252830] text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>{photoPreview ? "Change Photo" : "Upload Photo"}</span>
                    </button>
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  JPG, PNG, or WEBP up to 5MB.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full pl-9 pr-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Email ID (Login ID) */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Email ID (Login Credential) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@bsfgym.com"
                    className="w-full pl-9 pr-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 font-mono"
                  />
                </div>
                <p className="text-[11px] text-amber-400/80 mt-1">
                  Changing your email ID will change the email address you use to log in.
                </p>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit Indian Mobile Number"
                    className="w-full pl-9 pr-3 py-2 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 font-mono"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/10 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{profileLoading ? "Saving Changes..." : "Save Profile Details"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Security & Password */}
          <div className="bg-[#17191E] border border-[#252830] rounded-xl p-6 shadow-xl space-y-6">
            <div className="border-b border-[#252830] pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Security & Password</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Update your account password. Must be at least 8 characters.
              </p>
            </div>

            {passwordSuccess && (
              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Current Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full pl-9 pr-10 py-2 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  New Password (min. 8 characters) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter strong new password"
                    className="w-full pl-9 pr-10 py-2 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-9 pr-10 py-2 bg-[#111316] border border-[#252830] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Password */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-500/10 flex items-center gap-2 disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{passwordLoading ? "Updating Password..." : "Update Password"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
