"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { StatsOverview, BollardItem, AuditLog } from "@/types";
import {
  Zap,
  Building2,
  Users,
  Radio,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  ShieldCheck
} from "lucide-react";
import { TabKey } from "../layout/Sidebar";

interface OverviewTabProps {
  onNavigate: (tab: TabKey) => void;
  onOpenCommission: () => void;
}

export function OverviewTab({ onNavigate, onOpenCommission }: OverviewTabProps) {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [bollards, setBollards] = useState<BollardItem[]>([]);
  const [recentAudit, setRecentAudit] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [s, b, a] = await Promise.all([
        apiRequest<StatsOverview>("/v1/admin/stats"),
        apiRequest<{ data: BollardItem[] }>("/v1/admin/bollards?limit=5"),
        apiRequest<{ data: AuditLog[] }>("/v1/admin/audit?limit=5"),
      ]);
      setStats(s);
      setBollards(b.data || []);
      setRecentAudit(a.data || []);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const kpis = [
    {
      title: "HARDWARE FLEET",
      value: stats?.bollardCount ?? "--",
      label: "Commissioned Controllers",
      icon: Zap,
      color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/10",
      tab: "bollards" as TabKey,
    },
    {
      title: "ACTIVE SITES",
      value: stats?.siteCount ?? "--",
      label: "Secured Perimeters",
      icon: Building2,
      color: "text-blue-400 border-blue-500/20 bg-blue-500/10",
      tab: "sites" as TabKey,
    },
    {
      title: "AUTHENTICATED USERS",
      value: stats?.userCount ?? "--",
      label: "Clients & Operators",
      icon: Users,
      color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
      tab: "users" as TabKey,
    },
    {
      title: "24H ACTUATIONS",
      value: stats?.commandCount ?? "--",
      label: "Relay Cycles Dispatched",
      icon: Activity,
      color: "text-purple-400 border-purple-500/20 bg-purple-500/10",
      tab: "bollards" as TabKey,
    },
    {
      title: "SECURITY ALERTS",
      value: stats?.alertCount ?? 0,
      label: "Warnings & Tamper",
      icon: AlertTriangle,
      color: "text-amber-400 border-amber-500/20 bg-amber-500/10",
      tab: "audit" as TabKey,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigate(kpi.tab)}
              className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 group shadow-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold font-mono tracking-widest text-slate-400 uppercase">
                  {kpi.title}
                </span>
                <div className={`p-2 rounded-xl border ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold font-mono text-slate-100 group-hover:text-cyan-300 transition-colors">
                {kpi.value}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {kpi.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overview Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hardware Status Preview */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase">
                Active Bollards & Relays
              </h3>
            </div>
            <button
              onClick={() => onNavigate("bollards")}
              className="text-xs font-semibold text-cyan-400 hover:underline"
            >
              View All ({stats?.bollardCount ?? 0})
            </button>
          </div>

          <div className="space-y-2.5">
            {bollards.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No bollards registered yet.
              </div>
            ) : (
              bollards.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-mono text-xs font-bold">
                      {b.deviceCode.split("-").pop() || "RC"}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">
                        {b.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {b.deviceCode} • {b.site?.name || "Unbound"}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      b.status === "RAISED"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : b.status === "LOWERED"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Audit Feed */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase">
                Recent Security Audit Logs
              </h3>
            </div>
            <button
              onClick={() => onNavigate("audit")}
              className="text-xs font-semibold text-cyan-400 hover:underline"
            >
              View Audit Log
            </button>
          </div>

          <div className="space-y-2.5">
            {recentAudit.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No recent events logged.
              </div>
            ) : (
              recentAudit.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        a.severity === "high"
                          ? "bg-red-400"
                          : a.severity === "warning"
                          ? "bg-amber-400"
                          : "bg-cyan-400"
                      }`}
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        {a.eventType.replace(/_/g, " ").toUpperCase()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {a.user?.name || a.user?.email || "System"} • {new Date(a.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      a.severity === "high"
                        ? "text-red-400 bg-red-500/10"
                        : a.severity === "warning"
                        ? "text-amber-400 bg-amber-500/10"
                        : "text-cyan-400 bg-cyan-500/10"
                    }`}
                  >
                    {a.severity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
