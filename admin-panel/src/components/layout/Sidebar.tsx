"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Building2,
  Zap,
  Globe2,
  Radio,
  ScrollText,
  LogOut,
  ShieldCheck,
  UserCheck
} from "lucide-react";

export type TabKey = "overview" | "users" | "sites" | "bollards" | "gatelink" | "mqtt" | "audit";

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onOpenProfile: () => void;
}

const navItems: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "Overview & Fleet", icon: LayoutDashboard },
  { key: "users", label: "Users & Roles", icon: Users },
  { key: "sites", label: "Sites & Perimeters", icon: Building2 },
  { key: "bollards", label: "Bollards & Relays", icon: Zap },
  { key: "gatelink", label: "GateLink Cloud", icon: Globe2 },
  { key: "mqtt", label: "MQTT Telemetry", icon: Radio },
  { key: "audit", label: "Security Audit", icon: ScrollText },
];

export function Sidebar({ activeTab, onTabChange, onOpenProfile }: SidebarProps) {
  const { user, logout } = useAuth();

  const initials = (user?.name || user?.email || "AD")
    .substring(0, 2)
    .toUpperCase();

  return (
    <aside className="w-64 bg-[#0a0d14]/90 border-r border-white/5 flex flex-col justify-between h-screen sticky top-0 backdrop-blur-xl z-20">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-wider text-slate-100 uppercase">
              KJS BOLLARDS
            </div>
            <div className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">
              SECURITY CONTROL
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/20 to-cyan-500/5 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Admin Profile Footer */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5">
          <div
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0 mr-2"
            title="Click to view & edit your profile"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {user?.name || user?.email || "Administrator"}
              </div>
              <div className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                SUPER ADMIN
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
