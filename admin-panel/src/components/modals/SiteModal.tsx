"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { SiteItem, AdminUser } from "@/types";
import { X, Building2 } from "lucide-react";

interface SiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  siteToEdit: SiteItem | null;
}

export function SiteModal({ isOpen, onClose, onSuccess, siteToEdit }: SiteModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      apiRequest<{ data: AdminUser[] }>("/v1/admin/users?limit=100")
        .then((res) => setUsers(res.data || []))
        .catch(() => {});
    }

    if (siteToEdit) {
      setName(siteToEdit.name || "");
      setAddress(siteToEdit.address || "");
      setOwnerId(siteToEdit.ownerId || "");
    } else {
      setName("");
      setAddress("");
      setOwnerId("");
    }
  }, [siteToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (siteToEdit) {
        await apiRequest(`/v1/admin/sites/${siteToEdit.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: name.trim(),
            address: address.trim(),
            ownerId: ownerId || null,
          }),
        });
        showToast("Site updated successfully", "success");
      } else {
        await apiRequest("/v1/admin/sites", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            address: address.trim(),
            ownerId: ownerId || undefined,
          }),
        });
        showToast("New perimeter created successfully", "success");
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
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-100">
              {siteToEdit ? `Edit Site: ${siteToEdit.name}` : "Create New Security Site"}
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
              Perimeter / Site Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. North Gate Logistics Perimeter"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Physical Location / Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Unit 4, Gateway Industrial Estate, London"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Designated Primary Owner (Account Holder)
            </label>
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141b29] border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/60"
            >
              <option value="">-- No Owner Assigned (System Managed) --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) [{u.role.toUpperCase()}]
                </option>
              ))}
            </select>
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
              {saving ? "Saving..." : siteToEdit ? "Update Site" : "Save Site"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
