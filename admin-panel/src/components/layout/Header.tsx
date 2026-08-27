"use client";

import React from "react";
import { RefreshCw, Trash2, ShieldAlert, Cpu } from "lucide-react";
import { TabKey } from "./Sidebar";

interface HeaderProps {
  activeTab: TabKey;
  onRefresh: () => void;
  onOpenPurge: () => void;
  loading: boolean;
}

const tabTitles: Record<TabKey, { title: string; subtitle: string }> = {
  overview: {
    title: "SYSTEM OVERVIEW & FLEET TELEMETRY",
    subtitle: "Real-time relay actuation status, perimeter health & 24h event velocity",
  },
  users: {
    title: "USER ACCOUNTS & ACCESS CONTROL",
    subtitle: "Manage operator roles, RBAC permissions, and multi-tenant privileges",
  },
  sites: {
    title: "PERIMETERS & SITE BOUNDARIES",
    subtitle: "Configure physical zones, site ownership, and assigned hardware groups",
  },
  bollards: {
    title: "BOLLARD HARDWARE & RELAY ACTUATORS",
    subtitle: "Live MQTT relay triggers, stroke sensors, and terminal calibrations",
  },
  gatelink: {
    title: "GATELINK CLOUD SYNCHRONIZATION",
    subtitle: "Comparison matrix between local database registrations and Open API devices",
  },
  mqtt: {
    title: "MQTT TELEMETRY DATA STREAM",
    subtitle: "Sub-second packets received from active 4G/WLAN microcontrollers",
  },
  audit: {
    title: "IMMUTABLE SECURITY AUDIT TRAIL",
    subtitle: "Cryptographically verified record of all operator actions and relay trips",
  },
};

export function Header({ activeTab, onRefresh, onOpenPurge, loading }: HeaderProps) {
  const current = tabTitles[activeTab] || { title: "ADMIN CONSOLE", subtitle: "" };

  return (
    <header className="h-16 px-6 border-b border-white/5 bg-[#0a0d14]/70 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-sm font-bold tracking-wider text-slate-100 uppercase flex items-center gap-2">
          {current.title}
        </h1>
        <p className="text-[11px] text-slate-400 hidden sm:block">
          {current.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* System Status Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>MQTT & CLOUD ONLINE</span>
        </div>

        {/* SuperAdmin Master Purge Data Modal Button */}
        <button
          onClick={onOpenPurge}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 text-xs font-semibold tracking-wide transition-all shadow-[0_0_10px_rgba(239,68,68,0.15)]"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Purge Data</span>
        </button>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-all disabled:opacity-50"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
        </button>
      </div>
    </header>
  );
}
