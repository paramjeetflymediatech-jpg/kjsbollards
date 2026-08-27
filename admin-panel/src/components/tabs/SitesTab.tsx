"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { SiteItem } from "@/types";
import {
  Building2,
  PlusCircle,
  MapPin,
  User,
  Zap,
  Trash2,
  Edit3
} from "lucide-react";

interface SitesTabProps {
  onOpenAddSite: () => void;
  onOpenEditSite: (site: SiteItem) => void;
}

export function SitesTab({ onOpenAddSite, onOpenEditSite }: SitesTabProps) {
  const { showToast } = useToast();
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSites = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<SiteItem[]>("/v1/admin/sites");
      setSites(res || []);
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  const handleDeleteSite = async (site: SiteItem) => {
    if (!confirm(`Are you sure you want to delete and unbind site: "${site.name}"? Attached bollards will become unassigned.`)) return;

    try {
      await apiRequest(`/v1/admin/sites/${site.id}`, { method: "DELETE" });
      showToast(`Site ${site.name} removed successfully`, "success");
      loadSites();
    } catch (err: any) {
      showToast(err.message, "danger");
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div>
          <div className="text-xs font-bold text-slate-200 tracking-wider uppercase">
            Perimeter Security Sites ({sites.length})
          </div>
          <div className="text-[11px] text-slate-400">
            Physical installations with allocated relay groups and customer delegations
          </div>
        </div>

        <button
          onClick={onOpenAddSite}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Add Site</span>
        </button>
      </div>

      {/* Sites Grid */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-500">
          Loading site perimeters...
        </div>
      ) : sites.length === 0 ? (
        <div className="text-center py-12 text-xs text-slate-500">
          No security sites found. Click "Add Site" to create your first perimeter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => {
            const bollardCount = site.bollards?.length || 0;
            const usersCount = site.authorizedUsers?.length || 0;

            return (
              <div
                key={site.id}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all duration-300 flex flex-col justify-between group shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                          {site.name}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span className="truncate max-w-[200px]">{site.address || "Location Unspecified"}</span>
                        </div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                      ACTIVE
                    </span>
                  </div>

                  {/* Owner Card */}
                  <div className="my-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block font-mono uppercase">Primary Owner</span>
                      <span className="text-slate-200 font-semibold truncate block">
                        {site.owner ? `${site.owner.name} (${site.owner.email})` : "System Managed (No Owner)"}
                      </span>
                    </div>
                  </div>

                  {/* Hardware & User Counters */}
                  <div className="grid grid-cols-2 gap-2 my-3">
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <div className="text-[10px] text-slate-400 font-mono uppercase">Bollards</div>
                      <div className="text-base font-bold font-mono text-cyan-300">
                        {bollardCount} Units
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <div className="text-[10px] text-slate-400 font-mono uppercase">Delegates</div>
                      <div className="text-base font-bold font-mono text-slate-200">
                        {usersCount} Users
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-2">
                  <button
                    onClick={() => onOpenEditSite(site)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Site</span>
                  </button>

                  <button
                    onClick={() => handleDeleteSite(site)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Unbind / Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
