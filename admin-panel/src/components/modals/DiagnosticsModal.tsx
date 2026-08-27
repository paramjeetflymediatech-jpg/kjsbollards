"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { BollardItem } from "@/types";
import { X, Wrench, Wifi, Activity, RotateCcw, Cpu, Radio } from "lucide-react";

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bollard: BollardItem | null;
  onOpenIoConfig: (bollard: BollardItem) => void;
  onOpenBarrierConfig: (bollard: BollardItem) => void;
}

export function DiagnosticsModal({
  isOpen,
  onClose,
  bollard,
  onOpenIoConfig,
  onOpenBarrierConfig,
}: DiagnosticsModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [diagData, setDiagData] = useState<any>(null);
  const [rebooting, setRebooting] = useState(false);

  useEffect(() => {
    if (isOpen && bollard) {
      setLoading(true);
      apiRequest(`/v1/bollards/${bollard.id}/diagnostics`)
        .then((data) => setDiagData(data))
        .catch(() => {
          setDiagData({
            online: false,
            signalStrength: 0,
            cycleCount: bollard.cycleCount || 0,
            inputs: [false, false, false, false],
            outputs: [false, false, false, false],
            hardwareVersion: "RC200-V2",
            softwareVersion: "v1.4.2",
            netType: "WLAN",
            netId: "Standby",
          });
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, bollard]);

  if (!isOpen || !bollard) return null;

  const handleReboot = async () => {
    if (!confirm(`Are you sure you want to send a remote hardware reboot instruction to ${bollard.name}?`)) return;

    setRebooting(true);
    try {
      await apiRequest(`/v1/bollards/${bollard.id}/reboot`, { method: "POST" });
      showToast("Remote reboot command dispatched to hardware", "success");
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setRebooting(false);
    }
  };

  const isOnline = diagData?.online ?? false;
  const signal = diagData?.signalStrength ?? 0;
  const cycles = diagData?.cycleCount ?? bollard.cycleCount ?? 0;
  const inputs: boolean[] = diagData?.inputs || [false, false, false, false];
  const outputs: boolean[] = diagData?.outputs || [false, false, false, false];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-[#0f141f] border border-white/10 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Hardware Diagnostics: {bollard.name}
              </h3>
              <p className="text-[11px] font-mono text-cyan-400">
                SN: {bollard.deviceCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-[10px] uppercase font-mono text-slate-400 mb-1 flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-cyan-400" />
              Socket Link
            </div>
            <div className="text-xs font-bold font-mono">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${isOnline ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                {isOnline ? "ONLINE (Active MQTT)" : "OFFLINE"}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-[10px] uppercase font-mono text-slate-400 mb-1 flex items-center gap-1.5">
              <Wifi className="w-3 h-3 text-cyan-400" />
              4G / RSSI
            </div>
            <div className="text-sm font-bold font-mono text-slate-200">
              {signal}% Signal
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-[10px] uppercase font-mono text-slate-400 mb-1 flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-cyan-400" />
              Cycle Counter
            </div>
            <div className="text-sm font-bold font-mono text-cyan-300">
              {cycles} Full Strokes
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="text-[10px] uppercase font-mono text-slate-400 mb-1 flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-cyan-400" />
              MCU Firmware
            </div>
            <div className="text-xs font-mono text-slate-300 truncate">
              {diagData?.hardwareVersion || "RC200"} / {diagData?.softwareVersion || "v1.4.2"}
            </div>
          </div>
        </div>

        {/* Input Sensor Terminals */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Digital Input Sensor Terminals (Stroke Limit & Safety Loop)
          </div>
          <div className="flex flex-wrap gap-2.5">
            {inputs.map((val, idx) => (
              <span
                key={idx}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                  val
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-white/5 text-slate-400 border-white/5"
                }`}
              >
                IN{idx + 1}: {val ? "HIGH (Triggered)" : "LOW (Open)"}
              </span>
            ))}
          </div>
        </div>

        {/* Output Relay Contacts */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Physical Relay Contacts (Dry Contact Relays 1-4)
          </div>
          <div className="flex flex-wrap gap-2.5">
            {outputs.map((val, idx) => (
              <span
                key={idx}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                  val
                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                    : "bg-white/5 text-slate-400 border-white/5"
                }`}
              >
                RELAY {idx + 1}: {val ? "CLOSED (Active)" : "OPEN (Standby)"}
              </span>
            ))}
          </div>
        </div>

        {/* Quick Calibration Action Triggers */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={handleReboot}
            disabled={rebooting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${rebooting ? "animate-spin" : ""}`} />
            <span>{rebooting ? "Rebooting..." : "Reboot MCU"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenIoConfig(bollard);
              }}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10"
            >
              Configure I/O
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBarrierConfig(bollard);
              }}
              className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30"
            >
              Barrier Tuning
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
