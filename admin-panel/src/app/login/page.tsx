"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ShieldCheck, Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { token, login, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("admin@kjsbollards.co.uk");
  const [password, setPassword] = useState("KjsSecure2026!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token && !authLoading) {
      router.push("/");
    }
  }, [token, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
      showToast("Authenticated as SuperAdmin", "success");
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
      showToast(err.message || "Authentication failed", "danger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#07090e] relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-3xl bg-[#0c101a]/80 border border-white/10 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.2)]">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black tracking-wider text-slate-100 uppercase mt-4">
            KJS BOLLARDS
          </h2>
          <div className="inline-block px-3 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono tracking-widest text-cyan-300 uppercase">
            Central Management Console
          </div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto pt-1">
            Authenticate with Administrator credentials to access database and hardware telemetry.
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium animate-in fade-in">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold font-mono tracking-wider text-slate-300 uppercase mb-1.5">
              Administrator Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kjsbollards.co.uk"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold font-mono tracking-wider text-slate-300 uppercase mb-1.5">
              Secure Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(0,240,255,0.35)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-2"
          >
            <span>{loading ? "Authenticating..." : "Initialize Admin Session"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 text-[10px] text-slate-500 font-mono">
          Protected by AES-256 JWT Authentication & Hardware Relays
        </div>
      </div>
    </div>
  );
}
