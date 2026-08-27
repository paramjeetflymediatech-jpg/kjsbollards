"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { AuditLog } from "@/types";
import {
  ScrollText,
  Search,
  Trash2,
  AlertTriangle,
  Info,
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export function AuditTab() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState(false);

  const loadAudit = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        severity,
        search,
      });

      const res = await apiRequest<{ data: AuditLog[]; total: number; totalPages: number }>(
        `/v1/admin/audit?${query.toString()}`
      );

      const items = res.data || (Array.isArray(res) ? (res as any) : []);
      setLogs(items);
      setTotal(res.total ?? items.length);
      setTotalPages(res.totalPages || Math.max(1, Math.ceil(items.length / limit)));
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, [page, limit, severity, search]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSet = new Set<string>();
      logs.forEach((l) => newSet.add(l.id));
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

  const handleBulkPurge = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${ids.length} selected audit record(s)?`)) return;

    setPurging(true);
    try {
      const res = await apiRequest("/v1/admin/audit/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      showToast(res.message || `${ids.length} log(s) purged`, "success");
      setSelectedIds(new Set());
      loadAudit();
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setPurging(false);
    }
  };

  const isAllSelected = logs.length > 0 && selectedIds.size === logs.length;

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search event or user..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-[#141b29] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="high">High Risk</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkPurge}
              disabled={purging}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold animate-in fade-in"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Selected ({selectedIds.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* Audit Logs Table */}
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
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Event Type</th>
                <th className="p-3.5">Severity</th>
                <th className="p-3.5">Actor / User</th>
                <th className="p-3.5">IP Address</th>
                <th className="p-3.5">Event Detail</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 text-xs text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    Retrieving immutable audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No audit records match your query.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isSelected = selectedIds.has(log.id);

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isSelected ? "bg-cyan-500/[0.04]" : ""
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(log.id)}
                          className="rounded border-white/20 text-cyan-500 focus:ring-0"
                        />
                      </td>

                      <td className="p-3.5 font-mono text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-slate-100 uppercase">
                        {log.eventType.replace(/_/g, " ")}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            log.severity === "high"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : log.severity === "warning"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                          }`}
                        >
                          {log.severity}
                        </span>
                      </td>

                      <td className="p-3.5 font-semibold text-slate-200">
                        {log.user?.name || log.user?.email || "System"}
                      </td>

                      <td className="p-3.5 font-mono text-slate-400">
                        {log.remoteIp || "127.0.0.1"}
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-slate-300 max-w-xs truncate">
                        {typeof log.detail === "object"
                          ? JSON.stringify(log.detail)
                          : String(log.detail || "")}
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
            Showing <span className="text-slate-200 font-mono">{logs.length}</span> of{" "}
            <span className="text-slate-200 font-mono">{total}</span> events
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
