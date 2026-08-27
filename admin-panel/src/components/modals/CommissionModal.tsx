"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { SiteItem } from "@/types";
import { X, PlusCircle } from "lucide-react";

interface CommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CommissionModal({ isOpen, onClose, onSuccess }: CommissionModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [siteId, setSiteId] = useState("");
  const [openDuration, setOpenDuration] = useState(6);
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      apiRequest<SiteItem[]>("/v1/admin/sites")
        .then((res) => setSites(res || []))
        .catch(() => {});
      setName("");
      setDeviceCode("");
      setSiteId("");
      setOpenDuration(6);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceCode.trim()) {
      showToast("Device serial number is required", "warning");
      return;
    }

    setSaving(true);
    try {
      await apiRequest("/v1/bollards", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim() || `Bollard ${deviceCode.trim()}`,
          deviceCode: deviceCode.trim(),
          siteId: siteId || undefined,
          openDuration: Number(openDuration) || 6,
        }),
      });
      showToast(`Hardware controller ${deviceCode} commissioned successfully`, "success");
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
              <PlusCircle className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-100">
              Commission Bollard Controller (RC200)
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
              Device Serial / Code (SN)
            </label>
            <input
              type="text"
              required
              value={deviceCode}
              onChange={(e) => setDeviceCode(e.target.value)}
              placeholder="e.g. RC200-A5B1-01"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 font-mono text-sm text-cyan-300 focus:outline-none focus:border-cyan-500/60 uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Friendly Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Entrance Bollard #1"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Assigned Site / Perimeter
            </label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141b29] border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/60"
            >
              <option value="">-- No Site Bound (Standby Stock) --</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.address || "No Address"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Stroke Travel Duration (Seconds)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={openDuration}
              onChange={(e) => setOpenDuration(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/60"
            />
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
              {saving ? "Commissioning..." : "Commission Hardware"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
