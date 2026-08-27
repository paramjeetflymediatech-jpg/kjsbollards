"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { BollardItem } from "@/types";
import {
  Zap,
  PlusCircle,
  Wrench,
  Trash2,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  StopCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface BollardsTabProps {
  onOpenCommission: () => void;
  onOpenDiagnostics: (bollard: BollardItem) => void;
}

export function BollardsTab({ onOpenCommission, onOpenDiagnostics }: BollardsTabProps) {
  const { showToast } = useToast();
  const [bollards, setBollards] = useState<BollardItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadBollards = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
      });

      const res = await apiRequest<{ data: BollardItem[]; total: number; totalPages: number }>(
        `/v1/admin/bollards?${query.toString()}`
      );

      setBollards(res.data || []);
      setTotal(res.total ?? (res.data || []).length);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBollards();
  }, [page, limit, search]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSet = new Set<string>();
      bollards.forEach((b) => newSet.add(b.id));
      setSelectedIds(newSet);
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCommand = async (bollard: BollardItem, action: "raise" | "lower" | "stop") => {
    setActingId(bollard.id);
    try {
      await apiRequest(`/v1/bollards/${bollard.id}/commands`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      showToast(`Command "${action.toUpperCase()}" dispatched to ${bollard.name}`, "success");
      loadBollards();
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setActingId(null);
    }
  };

  const handleDeleteSingle = async (bollard: BollardItem) => {
    if (!confirm(`Are you sure you want to decommission and remove bollard "${bollard.name}" (${bollard.deviceCode})?`)) return;

    try {
      await apiRequest(`/v1/bollards/${bollard.id}`, { method: "DELETE" });
      showToast(`Bollard ${bollard.name} decommissioned`, "success");
      loadBollards();
    } catch (err: any) {
      showToast(err.message, "danger");
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (!confirm(`Are you sure you want to decommission ${ids.length} selected bollard(s)?`)) return;

    setBulkDeleting(true);
    try {
      const res = await apiRequest("/v1/admin/bollards/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      showToast(res.message || `${ids.length} bollard(s) decommissioned`, "success");
      setSelectedIds(new Set());
      loadBollards();
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setBulkDeleting(false);
    }
  };

  const isAllSelected = bollards.length > 0 && selectedIds.size === bollards.length;

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="relative flex-1 sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search serial, name, or site..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold animate-in fade-in"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Decommission Selected ({selectedIds.size})</span>
            </button>
          )}

          <button
            onClick={onOpenCommission}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Commission Bollard</span>
          </button>
        </div>
      </div>

      {/* Fleet Table */}
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
                <th className="p-3.5">Device Code (SN)</th>
                <th className="p-3.5">Display Name</th>
                <th className="p-3.5">Assigned Site</th>
                <th className="p-3.5">Live Status</th>
                <th className="p-3.5">Cycle Count</th>
                <th className="p-3.5 text-center">Movement Control</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 text-xs text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    Querying bollard hardware fleet...
                  </td>
                </tr>
              ) : bollards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    No hardware bollards commissioned yet.
                  </td>
                </tr>
              ) : (
                bollards.map((b) => {
                  const isSelected = selectedIds.has(b.id);
                  const isActing = actingId === b.id;

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isSelected ? "bg-cyan-500/[0.04]" : ""
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(b.id)}
                          className="rounded border-white/20 text-cyan-500 focus:ring-0"
                        />
                      </td>

                      <td className="p-3.5 font-mono font-bold text-cyan-400">
                        {b.deviceCode}
                      </td>

                      <td className="p-3.5 font-semibold text-slate-100">
                        {b.name}
                      </td>

                      <td className="p-3.5 text-slate-400 font-mono">
                        {b.site?.name || "Unbound / Standby"}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                            b.status === "RAISED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : b.status === "LOWERED"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              b.status === "RAISED" ? "bg-emerald-400" : "bg-blue-400"
                            }`}
                          />
                          {b.status}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-cyan-300">
                        {b.cycleCount ?? 0} cycles
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleCommand(b, "raise")}
                            disabled={isActing}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold transition-all disabled:opacity-50"
                            title="Raise Barrier"
                          >
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                            <span>Raise</span>
                          </button>

                          <button
                            onClick={() => handleCommand(b, "lower")}
                            disabled={isActing}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-[11px] font-bold transition-all disabled:opacity-50"
                            title="Lower Barrier"
                          >
                            <ArrowDownCircle className="w-3.5 h-3.5" />
                            <span>Lower</span>
                          </button>

                          <button
                            onClick={() => handleCommand(b, "stop")}
                            disabled={isActing}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-[11px] font-bold transition-all disabled:opacity-50"
                            title="Emergency Stop"
                          >
                            <StopCircle className="w-3.5 h-3.5" />
                            <span>Stop</span>
                          </button>
                        </div>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenDiagnostics(b)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-400 border border-white/10 hover:border-cyan-500/30 transition-all text-xs font-semibold"
                            title="Diagnostics & Calibration"
                          >
                            <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Diag</span>
                          </button>

                          <button
                            onClick={() => handleDeleteSingle(b)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                            title="Decommission Bollard"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 border-t border-white/5 bg-white/[0.01] flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="text-slate-200 font-mono">{bollards.length}</span> of{" "}
            <span className="text-slate-200 font-mono">{total}</span> bollards
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono text-slate-200">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
