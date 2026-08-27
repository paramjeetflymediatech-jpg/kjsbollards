"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar, TabKey } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

// Tab Components
import { OverviewTab } from "@/components/tabs/OverviewTab";
import { UsersTab } from "@/components/tabs/UsersTab";
import { SitesTab } from "@/components/tabs/SitesTab";
import { BollardsTab } from "@/components/tabs/BollardsTab";
import { GateLinkTab } from "@/components/tabs/GateLinkTab";
import { MqttTab } from "@/components/tabs/MqttTab";
import { AuditTab } from "@/components/tabs/AuditTab";

// Modals
import { UserModal } from "@/components/modals/UserModal";
import { SiteModal } from "@/components/modals/SiteModal";
import { CommissionModal } from "@/components/modals/CommissionModal";
import { DiagnosticsModal } from "@/components/modals/DiagnosticsModal";
import { IoConfigModal } from "@/components/modals/IoConfigModal";
import { BarrierConfigModal } from "@/components/modals/BarrierConfigModal";
import { ProfileModal } from "@/components/modals/ProfileModal";
import { PurgeModal } from "@/components/modals/PurgeModal";

import { AdminUser, SiteItem, BollardItem } from "@/types";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { token, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal States
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<AdminUser | null>(null);

  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const [siteToEdit, setSiteToEdit] = useState<SiteItem | null>(null);

  const [commissionModalOpen, setCommissionModalOpen] = useState(false);

  const [diagModalOpen, setDiagModalOpen] = useState(false);
  const [selectedBollard, setSelectedBollard] = useState<BollardItem | null>(null);

  const [ioModalOpen, setIoModalOpen] = useState(false);
  const [barrierModalOpen, setBarrierModalOpen] = useState(false);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);

  // Authentication Guard
  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
    }
  }, [token, authLoading, router]);

  // Sync tab with URL hash if present
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as TabKey;
    if (["overview", "users", "sites", "bollards", "gatelink", "mqtt", "audit"].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (authLoading || !token) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-xs font-mono text-cyan-400">
        INITIALIZING SECURITY CONSOLE...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#07090e]">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenProfile={() => setProfileModalOpen(true)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activeTab={activeTab}
          onRefresh={handleRefresh}
          onOpenPurge={() => setPurgeModalOpen(true)}
          loading={false}
        />

        <main className="flex-1 p-6 overflow-y-auto">
          {activeTab === "overview" && (
            <OverviewTab
              key={`overview-${refreshTrigger}`}
              onNavigate={handleTabChange}
              onOpenCommission={() => setCommissionModalOpen(true)}
            />
          )}

          {activeTab === "users" && (
            <UsersTab
              key={`users-${refreshTrigger}`}
              onOpenAddUser={() => {
                setUserToEdit(null);
                setUserModalOpen(true);
              }}
              onOpenEditUser={(user) => {
                setUserToEdit(user);
                setUserModalOpen(true);
              }}
            />
          )}

          {activeTab === "sites" && (
            <SitesTab
              key={`sites-${refreshTrigger}`}
              onOpenAddSite={() => {
                setSiteToEdit(null);
                setSiteModalOpen(true);
              }}
              onOpenEditSite={(site) => {
                setSiteToEdit(site);
                setSiteModalOpen(true);
              }}
            />
          )}

          {activeTab === "bollards" && (
            <BollardsTab
              key={`bollards-${refreshTrigger}`}
              onOpenCommission={() => setCommissionModalOpen(true)}
              onOpenDiagnostics={(bollard) => {
                setSelectedBollard(bollard);
                setDiagModalOpen(true);
              }}
            />
          )}

          {activeTab === "gatelink" && (
            <GateLinkTab key={`gatelink-${refreshTrigger}`} />
          )}

          {activeTab === "mqtt" && (
            <MqttTab key={`mqtt-${refreshTrigger}`} />
          )}

          {activeTab === "audit" && (
            <AuditTab key={`audit-${refreshTrigger}`} />
          )}
        </main>
      </div>

      {/* Modals Container */}
      <UserModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        onSuccess={handleRefresh}
        userToEdit={userToEdit}
      />

      <SiteModal
        isOpen={siteModalOpen}
        onClose={() => setSiteModalOpen(false)}
        onSuccess={handleRefresh}
        siteToEdit={siteToEdit}
      />

      <CommissionModal
        isOpen={commissionModalOpen}
        onClose={() => setCommissionModalOpen(false)}
        onSuccess={handleRefresh}
      />

      <DiagnosticsModal
        isOpen={diagModalOpen}
        onClose={() => setDiagModalOpen(false)}
        bollard={selectedBollard}
        onOpenIoConfig={(b) => {
          setSelectedBollard(b);
          setIoModalOpen(true);
        }}
        onOpenBarrierConfig={(b) => {
          setSelectedBollard(b);
          setBarrierModalOpen(true);
        }}
      />

      <IoConfigModal
        isOpen={ioModalOpen}
        onClose={() => setIoModalOpen(false)}
        bollard={selectedBollard}
      />

      <BarrierConfigModal
        isOpen={barrierModalOpen}
        onClose={() => setBarrierModalOpen(false)}
        bollard={selectedBollard}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      <PurgeModal
        isOpen={purgeModalOpen}
        onClose={() => setPurgeModalOpen(false)}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
