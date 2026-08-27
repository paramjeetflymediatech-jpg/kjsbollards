"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { AdminUser } from "@/types";
import { X, UserPlus, Save } from "lucide-react";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userToEdit: AdminUser | null;
}

export function UserModal({ isOpen, onClose, onSuccess, userToEdit }: UserModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminUser["role"]>("operator");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name || "");
      setEmail(userToEdit.email || "");
      setPassword("");
      setRole(userToEdit.role || "operator");
      setEnabled(userToEdit.enabled ?? true);
    } else {
      setName("");
      setEmail("");
      setPassword("");
      setRole("operator");
      setEnabled(true);
    }
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (userToEdit) {
        const body: Record<string, any> = { name: name.trim(), role, enabled };
        if (password.trim().length >= 6) {
          body.password = password.trim();
        }
        await apiRequest(`/v1/admin/users/${userToEdit.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        showToast(`User ${email} updated successfully`, "success");
      } else {
        if (!password || password.trim().length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        await apiRequest("/v1/admin/users", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: password.trim(),
            role,
            enabled,
          }),
        });
        showToast(`User ${email} registered successfully`, "success");
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-[#0f141f] border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              {userToEdit ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <h3 className="text-base font-bold text-slate-100">
              {userToEdit ? `Edit User: ${userToEdit.email}` : "Add New User Account"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              disabled={!!userToEdit}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@kjsbollards.co.uk"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-slate-100 disabled:opacity-50 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              {userToEdit ? "Change Password (Optional)" : "Password (Min. 6 characters)"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={userToEdit ? "Leave blank to keep unchanged" : "••••••••••••"}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AdminUser["role"])}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141b29] border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/60"
              >
                <option value="operator">OPERATOR</option>
                <option value="owner">OWNER</option>
                <option value="admin">ADMIN</option>
                <option value="family">FAMILY</option>
                <option value="staff">STAFF</option>
                <option value="viewer">VIEWER</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Status
              </label>
              <label className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="rounded border-white/20 text-cyan-500 focus:ring-0"
                />
                <span className="text-sm font-medium text-slate-200">Active Account</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.3)] disabled:opacity-50"
            >
              {saving ? "Saving..." : userToEdit ? "Update User" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
