"use client";

import React, { useState } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { BollardItem } from "@/types";
import { X, Gauge } from "lucide-react";

interface BarrierConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  bollard: BollardItem | null;
}

export function BarrierConfigModal({ isOpen, onClose, bollard }: BarrierConfigModalProps) {
  const { showToast } = useToast();
  const [speed, setSpeed] = useState(3);
  const [reboundSensitivity, setReboundSensitivity] = useState(bollard?.reboundSensitivity || 5);
  const [autoCloseDelay, setAutoCloseDelay] = useState(15);
  const [saving, setSaving] = useState(false);

  if (!isOpen || !bollard) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest(`/v1/bollards/${bollard.id}/barrier-config`, {
        method: "POST",
        body: JSON.stringify({ speed, reboundSensitivity, autoCloseDelay }),
      });
      showToast("Hydraulic & barrier timing calibrated on MCU", "success");
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
              <Gauge className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-100">
              Barrier Calibration: {bollard.name}
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
              Hydraulic Actuator Speed Level (1 = Slowest, 5 = Max Turbo)
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
            <div className="flex justify-between text-[11px] font-mono text-cyan-400 mt-1">
              <span>Level 1 (Heavy Anti-Ram)</span>
              <span>Level {speed} Selected</span>
              <span>Level 5 (Fast Lane)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Anti-Crush / Rebound Sensitivity (1 = Soft, 10 = Rigid)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={reboundSensitivity}
              onChange={(e) => setReboundSensitivity(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Auto-Lower / Auto-Close Timeout (Seconds, 0 = Manual Only)
            </label>
            <input
              type="number"
              min="0"
              max="120"
              value={autoCloseDelay}
              onChange={(e) => setAutoCloseDelay(Number(e.target.value))}
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
              {saving ? "Calibrating..." : "Dispatch Calibration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
