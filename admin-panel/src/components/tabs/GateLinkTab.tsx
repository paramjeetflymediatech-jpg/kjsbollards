"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { GateLinkDevice } from "@/types";
import {
  Globe2,
  RefreshCw,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Search,
  CheckSquare,
  Square,
  Plus,
  X,
} from "lucide-react";

export function GateLinkTab() {
  const { showToast } = useToast();
  const [devices, setDevices] = useState<GateLinkDevice[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addingDevice, setAddingDevice] = useState(false);
  const [newDeviceCode, setNewDeviceCode] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [autoCreateLocal, setAutoCreateLocal] = useState(true);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ totalOnCloud: number; devices: GateLinkDevice[] }>(
        "/v1/admin/gatelink/devices"
      );
      setDevices(res.devices || []);
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSet = new Set<string>();
      devices.forEach((d) => newSet.add(d.deviceCode));
      setSelectedIds(newSet);
    } else {
      setSelectedIds(new Set());
    }
  };

  const setSelectedIds = (codes: Set<string>) => {
    setSelectedCodes(codes);
  };

  const toggleSelect = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleReleaseSingle = async (device: GateLinkDevice) => {
    if (!confirm(`Are you sure you want to release device "${device.deviceCode}" from GateLink Cloud account?`)) return;

    try {
      await apiRequest(`/v1/admin/gatelink/devices/${device.deviceCode}/release`, {
        method: "POST",
      });
      showToast(`Device ${device.deviceCode} released from Cloud`, "success");
      loadDevices();
    } catch (err: any) {
      showToast(err.message, "danger");
    }
  };

  const handleBulkRelease = async () => {
    const codes = Array.from(selectedCodes);
    if (codes.length === 0) return;

    if (!confirm(`Are you sure you want to release ${codes.length} selected device(s) from GateLink Cloud?`)) return;

    setReleasing(true);
    try {
      const res = await apiRequest("/v1/admin/gatelink/devices/bulk-release", {
        method: "POST",
        body: JSON.stringify({ deviceCodes: codes }),
      });
      showToast(res.message || `${codes.length} device(s) released`, "success");
      setSelectedCodes(new Set());
      loadDevices();
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setReleasing(false);
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceCode.trim()) {
      showToast("Please enter a device code / serial", "danger");
      return;
    }

    setAddingDevice(true);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>("/v1/admin/gatelink/devices", {
        method: "POST",
        body: JSON.stringify({
          deviceCode: newDeviceCode.trim().toUpperCase(),
          deviceName: newDeviceName.trim() || undefined,
          autoCreateLocalBollard: autoCreateLocal,
        }),
      });
      showToast(res.message || "Device added to GateLink Cloud", "success");
      setNewDeviceCode("");
      setNewDeviceName("");
      setIsAddModalOpen(false);
      loadDevices();
    } catch (err: any) {
      showToast(err.message || "Failed to add GateLink device", "danger");
    } finally {
      setAddingDevice(false);
    }
  };

  const isAllSelected = devices.length > 0 && selectedCodes.size === devices.length;

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div>
          <div className="text-xs font-bold text-slate-200 tracking-wider uppercase flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-cyan-400" />
            GateLink Open API Device Cloud ({devices.length})
          </div>
          <div className="text-[11px] text-slate-400">
            Real-time synchronization against external GateLink API cluster
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {selectedCodes.size > 0 && (
            <button
              onClick={handleBulkRelease}
              disabled={releasing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold animate-in fade-in"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Release Selected ({selectedCodes.size})</span>
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Cloud Device</span>
          </button>

          <button
            onClick={loadDevices}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span>Sync Cloud</span>
          </button>
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01] text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded border-white/20 text-cyan-500 focus:ring-0"
                  />
                </th>
                <th className="p-3.5">Device Code (Serial)</th>
                <th className="p-3.5">Cloud Device Name</th>
                <th className="p-3.5">Local Database Record</th>
                <th className="p-3.5">Cloud Socket</th>
                <th className="p-3.5 text-right">Account Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 text-xs text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    Querying GateLink Open API cluster...
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    No devices currently bound to the GateLink API account.
                  </td>
                </tr>
              ) : (
                devices.map((d) => {
                  const isSelected = selectedCodes.has(d.deviceCode);

                  return (
                    <tr
                      key={d.deviceCode}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isSelected ? "bg-cyan-500/[0.04]" : ""
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(d.deviceCode)}
                          className="rounded border-white/20 text-cyan-500 focus:ring-0"
                        />
                      </td>

                      <td className="p-3.5 font-mono font-bold text-cyan-400">
                        {d.deviceCode}
                      </td>

                      <td className="p-3.5 font-semibold text-slate-200">
                        {d.deviceName || "GateLink Controller"}
                      </td>

                      <td className="p-3.5">
                        {d.registeredInLocalDb ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Bound: {d.localName || "Local DB"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Unregistered on Server</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                            d.online
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              d.online ? "bg-emerald-400" : "bg-red-400"
                            }`}
                          />
                          {d.online ? "ONLINE" : "OFFLINE"}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleReleaseSingle(d)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold ml-auto"
                          title="Release device from account"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Release</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual GateLink Device Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Add GateLink Cloud Device
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDevice} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Device Code / Serial Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. RC200-A5B1-01"
                  value={newDeviceCode}
                  onChange={(e) => setNewDeviceCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors uppercase"
                  required
                  autoFocus
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Enter the hardware serial number printed on your RC200 / GateLink relay controller.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Friendly Device Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Entrance Gate #1"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoCreateLocal"
                  checked={autoCreateLocal}
                  onChange={(e) => setAutoCreateLocal(e.target.checked)}
                  className="rounded border-white/20 text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <label
                  htmlFor="autoCreateLocal"
                  className="text-xs text-slate-300 select-none cursor-pointer"
                >
                  Also register into local Bollards control fleet
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingDevice}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {addingDevice ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>{addingDevice ? "Adding..." : "Add Device"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
