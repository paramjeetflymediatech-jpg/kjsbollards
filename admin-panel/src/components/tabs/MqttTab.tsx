"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { MqttTelemetry } from "@/types";
import {
  Radio,
  Wifi,
  Activity,
  Cpu,
  RefreshCw,
  Trash2,
  Sliders,
  CheckCircle2,
  Clock
} from "lucide-react";

export function MqttTab() {
  const { showToast } = useToast();
  const [telemetry, setTelemetry] = useState<MqttTelemetry[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const loadTelemetry = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<MqttTelemetry[]>("/v1/admin/mqtt/telemetry");
      setTelemetry(res || []);
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetry();
    const interval = setInterval(loadTelemetry, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleRemoveStream = async (sn: string) => {
    if (!confirm(`Remove live telemetry stream for microcontroller "${sn}"?`)) return;

    try {
      await apiRequest(`/v1/admin/mqtt/telemetry?sn=${encodeURIComponent(sn)}`, {
        method: "DELETE",
      });
      showToast(`Telemetry stream for ${sn} removed`, "success");
      loadTelemetry();
    } catch (err: any) {
      showToast(err.message, "danger");
    }
  };

  const handleClearAllStreams = async () => {
    if (!confirm("Are you sure you want to clear all active telemetry streams?")) return;

    setClearing(true);
    try {
      await apiRequest("/v1/admin/mqtt/telemetry?all=true", {
        method: "DELETE",
      });
      showToast("All active MQTT telemetry streams cleared", "success");
      loadTelemetry();
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div>
          <div className="text-xs font-bold text-slate-200 tracking-wider uppercase flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            Active Microcontroller Telemetry Stream ({telemetry.length})
          </div>
          <div className="text-[11px] text-slate-400">
            Auto-polling sub-second status packets from field hardware MQTT brokers
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {telemetry.length > 0 && (
            <button
              onClick={handleClearAllStreams}
              disabled={clearing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Streams</span>
            </button>
          )}

          <button
            onClick={loadTelemetry}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* Telemetry Stream Cards Grid */}
      {loading && telemetry.length === 0 ? (
        <div className="text-center py-12 text-xs text-slate-500">
          Connecting to live MQTT broker...
        </div>
      ) : telemetry.length === 0 ? (
        <div className="text-center py-12 text-xs text-slate-500 p-8 rounded-2xl bg-white/[0.01] border border-dashed border-white/10">
          No hardware telemetry packets currently streaming.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {telemetry.map((t) => {
            const inputs = t.inputs || [false, false, false];
            const outputs = t.outputs || [false, false, false, false];
            const signal = t.signalStrength ?? 0;

            return (
              <div
                key={t.sn}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all duration-300 flex flex-col justify-between shadow-lg relative group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold">
                        DEVICE SN
                      </div>
                      <h4 className="text-sm font-bold text-slate-100 font-mono">
                        {t.sn}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          t.online
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            t.online ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                          }`}
                        />
                        {t.online ? "ONLINE" : "OFFLINE"}
                      </span>

                      <button
                        onClick={() => handleRemoveStream(t.sn)}
                        className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove stream"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Telemetry Stats */}
                  <div className="grid grid-cols-2 gap-2 my-3">
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 uppercase">
                        <Wifi className="w-3 h-3 text-cyan-400" />
                        4G Signal
                      </div>
                      <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
                        {signal}% RSSI
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 uppercase">
                        <Activity className="w-3 h-3 text-cyan-400" />
                        Movements
                      </div>
                      <div className="text-sm font-bold font-mono text-cyan-300 mt-0.5">
                        {t.cycleCount ?? 0} cycles
                      </div>
                    </div>
                  </div>

                  {/* Input Terminals */}
                  <div className="my-2.5">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase mb-1.5">
                      Sensor Inputs
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {inputs.map((v, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            v
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-white/5 text-slate-400"
                          }`}
                        >
                          IN{i + 1}: {v ? "1" : "0"}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Output Relays */}
                  <div className="my-2.5">
                    <div className="text-[10px] font-bold text-slate-400 font-mono uppercase mb-1.5">
                      Output Relays
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {outputs.map((v, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            v
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                              : "bg-white/5 text-slate-400"
                          }`}
                        >
                          R{i + 1}: {v ? "ON" : "OFF"}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-3 text-[10px] text-slate-400 font-mono">
                  <div className="flex items-center gap-1 truncate max-w-[170px]">
                    <Cpu className="w-3 h-3 text-slate-500" />
                    <span>HW {t.hardwareVersion || "1.11"} / FW {t.softwareVersion || "1.01"}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{new Date(t.lastSeen).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
