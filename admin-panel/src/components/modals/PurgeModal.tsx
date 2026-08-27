"use client";

import React, { useState } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { X, AlertOctagon, Trash2, Bomb, Radio } from "lucide-react";

interface PurgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PurgeModal({ isOpen, onClose, onSuccess }: PurgeModalProps) {
  const { showToast } = useToast();
  const [factoryConfirm, setFactoryConfirm] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePurgeAudit = async () => {
    if (!confirm("Are you sure you want to permanently delete ALL audit log events?")) return;
    setLoadingAction("audit");
    try {
      const res = await apiRequest("/v1/admin/audit/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ all: true }),
      });
      showToast(res.message || "All audit logs wiped", "success");
      onSuccess();
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDecommissionAllBollards = async () => {
    if (!confirm("Are you sure you want to DECOMMISSION AND REMOVE ALL BOLLARDS from the system?")) return;
    setLoadingAction("bollards");
    try {
      const res = await apiRequest("/v1/admin/bollards/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ all: true }),
      });
      showToast(res.message || "All bollards decommissioned", "success");
      onSuccess();
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteAllSites = async () => {
    if (!confirm("Are you sure you want to delete ALL sites and perimeters? Attached hardware will be unlinked.")) return;
    setLoadingAction("sites");
    try {
      const res = await apiRequest("/v1/admin/sites/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ all: true }),
      });
      showToast(res.message || "All sites removed", "success");
      onSuccess();
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteAllUsers = async () => {
    if (!confirm("Are you sure you want to delete ALL non-admin users from the database? This cannot be undone.")) return;
    setLoadingAction("users");
    try {
      const res = await apiRequest("/v1/admin/users/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ all: true }),
      });
      showToast(res.message || "All non-admin users removed", "success");
      onSuccess();
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleClearMqttTelemetry = async () => {
    if (!confirm("Are you sure you want to clear all active MQTT telemetry streams?")) return;
    setLoadingAction("mqtt");
    try {
      const res = await apiRequest("/v1/admin/mqtt/telemetry?all=true", {
        method: "DELETE",
      });
      showToast(res.message || "All MQTT telemetry streams cleared", "success");
      onSuccess();
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleMasterFactoryReset = async () => {
    if (factoryConfirm.trim().toUpperCase() !== "PURGE ALL") {
      showToast('Please type "PURGE ALL" to confirm full system factory reset.', "warning");
      return;
    }

    if (!confirm("FINAL CONFIRMATION: This will erase all sites, bollards, users, and logs. Proceed?")) return;

    setLoadingAction("factory");
    try {
      const res = await apiRequest("/v1/admin/system/factory-reset", {
        method: "POST",
        body: JSON.stringify({ confirmation: "PURGE ALL" }),
      });
      showToast(res.message || "System factory reset completed", "success");
      setFactoryConfirm("");
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-[#0f141f] border border-red-500/30 p-6 shadow-[0_0_30px_rgba(239,68,68,0.2)] space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-red-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-red-400">
                SuperAdmin Master Data Management & Purge Console
              </h3>
              <p className="text-[11px] text-slate-400">
                Execute category purges or trigger a complete system database wipe
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

        {/* Category Purge Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                Security Audit Logs
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Wipe all event records from the audit trail history.
              </p>
            </div>
            <button
              type="button"
              onClick={handlePurgeAudit}
              disabled={!!loadingAction}
              className="mt-3 w-full py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold"
            >
              {loadingAction === "audit" ? "Purging..." : "Purge All Audit Logs"}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-red-400" />
                MQTT Telemetry Streams
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Clear all active microcontroller sensor stream cards.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearMqttTelemetry}
              disabled={!!loadingAction}
              className="mt-3 w-full py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold"
            >
              {loadingAction === "mqtt" ? "Clearing..." : "Clear Telemetry Streams"}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                Bollards & Controllers
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Decommission and delete all hardware records.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDecommissionAllBollards}
              disabled={!!loadingAction}
              className="mt-3 w-full py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold"
            >
              {loadingAction === "bollards" ? "Decommissioning..." : "Decommission All Bollards"}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                Customer Accounts
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Delete all non-admin customer & operator users.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDeleteAllUsers}
              disabled={!!loadingAction}
              className="mt-3 w-full py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold"
            >
              {loadingAction === "users" ? "Deleting..." : "Delete Non-Admin Users"}
            </button>
          </div>
        </div>

        {/* Master Factory Reset Zone */}
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30">
          <div className="flex items-center gap-2 text-sm font-bold text-red-400">
            <Bomb className="w-4 h-4" />
            <span>Master System Factory Reset (Wipe Everything)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Permanently purges all customer sites, hardware bollards, delegations, and audit logs. The current SuperAdmin account is preserved.
          </p>

          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={factoryConfirm}
              onChange={(e) => setFactoryConfirm(e.target.value)}
              placeholder='Type "PURGE ALL" to confirm'
              className="w-full sm:w-64 px-3.5 py-2 rounded-xl bg-black/40 border border-red-500/40 text-xs font-mono text-red-200 focus:outline-none focus:border-red-400 uppercase"
            />
            <button
              type="button"
              onClick={handleMasterFactoryReset}
              disabled={loadingAction === "factory"}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(239,68,68,0.4)] disabled:opacity-50"
            >
              {loadingAction === "factory" ? "Resetting..." : "💥 Execute Factory Reset"}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
}
