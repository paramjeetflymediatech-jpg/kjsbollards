"use client";

import React, { useState } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { BollardItem } from "@/types";
import { X, Sliders } from "lucide-react";

interface IoConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  bollard: BollardItem | null;
}

export function IoConfigModal({ isOpen, onClose, bollard }: IoConfigModalProps) {
  const { showToast } = useToast();
  const [pulseDuration, setPulseDuration] = useState(1000);
  const [in1Type, setIn1Type] = useState("NO");
  const [in2Type, setIn2Type] = useState("NC");
  const [saving, setSaving] = useState(false);

  if (!isOpen || !bollard) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest(`/v1/bollards/${bollard.id}/io-config`, {
        method: "POST",
        body: JSON.stringify({ pulseDuration, in1Type, in2Type }),
      });
      showToast("I/O terminal configuration dispatched to hardware", "success");
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
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-100">
              I/O Configuration: {bollard.name}
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
              Relay Pulse Duration (Milliseconds)
            </label>
            <input
              type="number"
              min="100"
              max="10000"
              step="100"
              value={pulseDuration}
              onChange={(e) => setPulseDuration(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Input 1 (Safety Loop)
              </label>
              <select
                value={in1Type}
                onChange={(e) => setIn1Type(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141b29] border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/60"
              >
                <option value="NO">Normally Open (NO)</option>
                <option value="NC">Normally Closed (NC)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Input 2 (Stroke Limit)
              </label>
              <select
                value={in2Type}
                onChange={(e) => setIn2Type(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141b29] border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/60"
              >
                <option value="NO">Normally Open (NO)</option>
                <option value="NC">Normally Closed (NC)</option>
              </select>
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
              {saving ? "Saving..." : "Apply I/O Config"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
