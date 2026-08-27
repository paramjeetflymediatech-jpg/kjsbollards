"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { AdminUser } from "@/types";
import {
  UserPlus,
  Trash2,
  Edit2,
  Search,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface UsersTabProps {
  onOpenAddUser: () => void;
  onOpenEditUser: (user: AdminUser) => void;
}

export function UsersTab({ onOpenAddUser, onOpenEditUser }: UsersTabProps) {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        role,
        search,
      });

      const res = await apiRequest<{ data: AdminUser[]; total: number; totalPages: number }>(
        `/v1/admin/users?${query.toString()}`
      );

      const allUsers = res.data || [];
      // Filter out currently logged-in admin user
      const filtered = allUsers.filter(
        (u) => u.id !== currentUser?.id && u.email?.toLowerCase() !== currentUser?.email?.toLowerCase()
      );

      setUsers(filtered);
      setTotal(res.total != null ? (filtered.length < allUsers.length ? Math.max(0, res.total - 1) : res.total) : filtered.length);
      setTotalPages(res.totalPages || Math.max(1, Math.ceil(filtered.length / limit)));
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, limit, role, search]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSet = new Set<string>();
      users.forEach((u) => newSet.add(u.id));
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

  const handleDeleteSingle = async (user: AdminUser) => {
    if (!confirm(`Are you sure you want to delete user account: ${user.email}?`)) return;

    try {
      await apiRequest(`/v1/admin/users/${user.id}`, { method: "DELETE" });
      showToast(`User ${user.email} deleted`, "success");
      loadUsers();
    } catch (err: any) {
      showToast(err.message, "danger");
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${ids.length} selected user account(s)?`)) return;

    setBulkDeleting(true);
    try {
      const res = await apiRequest("/v1/admin/users/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      showToast(res.message || `${ids.length} user(s) deleted`, "success");
      setSelectedIds(new Set());
      loadUsers();
    } catch (err: any) {
      showToast(err.message, "danger");
    } finally {
      setBulkDeleting(false);
    }
  };

  const isAllSelected = users.length > 0 && selectedIds.size === users.length;

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name or email..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          {/* Role Filter */}
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-[#141b29] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="operator">Operator</option>
            <option value="admin">Admin</option>
            <option value="family">Family</option>
            <option value="staff">Staff</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Bulk Delete Button */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold animate-in fade-in"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          )}

          {/* Add User Button */}
          <button
            onClick={onOpenAddUser}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
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
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Registered</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 text-xs text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    Loading user accounts...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelected = selectedIds.has(u.id);
                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isSelected ? "bg-cyan-500/[0.04]" : ""
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(u.id)}
                          className="rounded border-white/20 text-cyan-500 focus:ring-0"
                        />
                      </td>
                      <td className="p-3.5 font-bold text-slate-100">{u.name}</td>
                      <td className="p-3.5 font-mono text-cyan-300/90">{u.email}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            u.role === "admin"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : u.role === "owner"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            u.enabled
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.enabled ? "bg-emerald-400" : "bg-red-400"
                            }`}
                          />
                          {u.enabled ? "ACTIVE" : "DISABLED"}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenEditUser(u)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-400 transition-colors"
                            title="Edit User"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSingle(u)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete User"
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
            Showing <span className="text-slate-200 font-mono">{users.length}</span> of{" "}
            <span className="text-slate-200 font-mono">{total}</span> total users
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
