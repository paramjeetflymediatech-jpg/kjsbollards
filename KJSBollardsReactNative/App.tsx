import React, { useState } from "react";
import {
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { User, Site, Bollard, EventItem, ScreenType, Movement, AuthorizedUser } from "./src/types";
import { Colors } from "./src/theme/colors";
import { responsiveFont } from "./src/theme/responsive";
import { api } from "./src/api/client";
import { LoginScreen } from "./src/screens/LoginScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { ControlScreen } from "./src/screens/ControlScreen";
import { SitesScreen } from "./src/screens/SitesScreen";
import { EventsScreen } from "./src/screens/EventsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { AddBollardModal } from "./src/components/AddBollardModal";
import { AccessSharingModal } from "./src/components/AccessSharingModal";

const allSitesMaster: Site[] = [
  {
    id: "1",
    name: "KJS Central Headquarters",
    address: "Feltham Gateway, London TW13",
    ownerId: "owner-1",
    authorizedUsers: [
      {
        id: "auth-1",
        name: "Sarah (Wife / Family)",
        email: "sarah@kjsbollards.co.uk",
        role: "family",
        addedAt: "Yesterday",
        bollardIds: ["b1"], // Only Main Entry Bollard #1
      },
      {
        id: "auth-2",
        name: "David (Security Lead)",
        email: "david.sec@kjsbollards.co.uk",
        role: "staff",
        addedAt: "3 days ago",
        bollardIds: [],
      },
    ],
    bollards: [
      { id: "b1", name: "Main Entry Bollard #1", status: "RAISED", online: true, safetyOk: true, lastSeen: "Just now", serial: "RC200-A5B1-01", isClaimed: true },
      { id: "b2", name: "Heavy Goods Exit #2", status: "LOWERED", online: true, safetyOk: true, lastSeen: "10s ago", serial: "RC200-A5B1-02", isClaimed: true },
      { id: "b3", name: "VIP North Perimeter", status: "RAISED", online: true, safetyOk: true, lastSeen: "1m ago", serial: "RC200-A5B1-03", isClaimed: true },
    ],
  },
  {
    id: "2",
    name: "Riverside Commerce Park",
    address: "Thames Logistics Zone, Unit 4B",
    ownerId: "owner-1",
    authorizedUsers: [
      {
        id: "auth-1",
        name: "Sarah (Wife / Family)",
        email: "sarah@kjsbollards.co.uk",
        role: "family",
        addedAt: "Yesterday",
        bollardIds: ["b4"], // Only Visitor Gate Access
      },
    ],
    bollards: [
      { id: "b4", name: "Visitor Gate Access", status: "LOWERED", online: true, safetyOk: true, lastSeen: "2m ago", serial: "RC200-C788-01", isClaimed: true },
      { id: "b5", name: "Emergency Service Barrier", status: "OFFLINE", online: false, safetyOk: false, lastSeen: "15m ago", serial: "RC200-C788-02", isClaimed: true },
    ],
  },
];

const demoEvents: EventItem[] = [
  { id: "e1", title: "Access Authorized", detail: "Owner granted area-specific gate access to Sarah (Main Entrance & Visitor Gate)", timestamp: "11:00:00", severity: "info" },
  { id: "e2", title: "Command Executed: RAISE", detail: "Controller RC200-A5B1-01 confirmed upper limit active", timestamp: "10:42:15", severity: "info" },
  { id: "e3", title: "Safety Loop Triggered", detail: "Ground inductive loop #1 detected vehicle presence", timestamp: "10:38:00", severity: "warning" },
  { id: "e4", title: "Serial Registration Locked", detail: "Hardware master serial RC200-A5B1-01 locked to Owner account", timestamp: "09:30:12", severity: "info" },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [allowedBollardIds, setAllowedBollardIds] = useState<string[] | null>(null);
  const [sites, setSites] = useState<Site[]>(allSitesMaster);
  const [history, setHistory] = useState<EventItem[]>(demoEvents);
  const [alerts, setAlerts] = useState<EventItem[]>(demoEvents.filter((e) => e.severity === "warning" || e.severity === "high"));
  const [screen, setScreen] = useState<ScreenType>("dashboard");
  const [selectedBollard, setSelectedBollard] = useState<Bollard | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeMovement, setActiveMovement] = useState<Movement | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [accessModalVisible, setAccessModalVisible] = useState(false);

  // Filter sites and bollards based on user authorization scope
  const visibleSites: Site[] = sites
    .map((s) => {
      if (allowedBollardIds === null) {
        // Owner: full view
        return s;
      }
      // Authorized person: only show permitted bollards
      return {
        ...s,
        bollards: s.bollards.filter((b) => allowedBollardIds.includes(b.id)),
      };
    })
    .filter((s) => s.bollards.length > 0);

  const handleLogin = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const session = await api.login(email, pass);
      api.setToken(session.accessToken);
      setUser(session.user);
      setAllowedBollardIds(null);
      setIsLive(true);
      setSuccessMessage("GateLink Cloud Connected");
      await fetchRemoteData();
    } catch (err: any) {
      setError(err.message || "Failed to authenticate with GateLink server.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterOwner = async (name: string, email: string, pass: string, siteName: string) => {
    setLoading(true);
    setError(null);
    try {
      const session = await api.register(name, email, pass, siteName);
      api.setToken(session.accessToken);
      setUser(session.user);
      setAllowedBollardIds(null);
      setIsLive(true);
      setSuccessMessage(`Welcome, ${session.user.name}! Account and site registered in Cloud.`);
      await fetchRemoteData();
    } catch (err: any) {
      setError(err.message || "Failed to register owner account with database.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoOwner = () => {
    setUser({
      id: "owner-1",
      name: "Primary Owner (Security Director)",
      email: "owner@kjsbollards.co.uk",
      role: "owner",
    });
    setAllowedBollardIds(null); // Full access to all gates
    setIsLive(false);
    setSuccessMessage("Logged in as Primary Owner (All Gates)");
  };

  const handleDemoSpouse = () => {
    setUser({
      id: "auth-1",
      name: "Sarah (Spouse / Family)",
      email: "sarah@kjsbollards.co.uk",
      role: "family",
    });
    // Specific permitted gate IDs: b1 (Main Entry) and b4 (Visitor Gate)
    setAllowedBollardIds(["b1", "b4"]);
    setIsLive(false);
    setSuccessMessage("Logged in as Sarah (Main Entrance & Visitor Gate Only)");
  };

  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
    setAllowedBollardIds(null);
    setScreen("dashboard");
    setSelectedBollard(null);
    setIsLive(false);
  };

  const fetchRemoteData = async () => {
    if (!isLive) return;
    setLoading(true);
    try {
      const [remoteSites, remoteHistory, remoteAlerts] = await Promise.all([
        api.getSites(),
        api.getHistory(),
        api.getAlerts(),
      ]);
      setSites(remoteSites);
      setHistory(remoteHistory);
      setAlerts(remoteAlerts);
    } catch (err) {
      setError("Unable to sync telemetry from GateLink Cloud.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBollard = async (siteId: string, newBollard: Bollard) => {
    if (isLive) {
      setLoading(true);
      try {
        await api.commissionBollard({
          siteId,
          name: newBollard.name,
          deviceCode: newBollard.serial || ("device-" + Date.now()),
          movementSeconds: newBollard.movementSeconds || 4.5,
        });
        setSuccessMessage(`Registered and commissioned ${newBollard.name}`);
        await fetchRemoteData();
      } catch (err: any) {
        setError(err.message || "Failed to commission bollard to cloud database.");
      } finally {
        setLoading(false);
      }
    } else {
      setSites((prev) =>
        prev.map((s) => (s.id === siteId ? { ...s, bollards: [...s.bollards, newBollard] } : s))
      );
      setHistory((prev) => [
        {
          id: "e-" + Date.now(),
          title: "Hardware Serial Locked",
          detail: `Registered and locked serial ${newBollard.serial} to your owner account.`,
          timestamp: new Date().toLocaleTimeString(),
          severity: "info",
        },
        ...prev,
      ]);
      setSuccessMessage(`Registered and locked ${newBollard.name}`);
    }
  };

  const handleGrantAccess = async (siteId: string, newUser: AuthorizedUser) => {
    if (isLive) {
      setLoading(true);
      try {
        await api.grantAccess(siteId, {
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          bollardIds: newUser.bollardIds || [],
        });
        setSuccessMessage(`Access granted to ${newUser.name} (${newUser.email})`);
        await fetchRemoteData();
      } catch (err: any) {
        setError(err.message || "Failed to save user access to database.");
      } finally {
        setLoading(false);
      }
    } else {
      setSites((prev) =>
        prev.map((s) =>
          s.id === siteId
            ? { ...s, authorizedUsers: [...(s.authorizedUsers || []), newUser] }
            : s
        )
      );
      setHistory((prev) => [
        {
          id: "e-" + Date.now(),
          title: "Gate Access Granted",
          detail: `Granted access to ${newUser.name} (${newUser.email}).`,
          timestamp: new Date().toLocaleTimeString(),
          severity: "info",
        },
        ...prev,
      ]);
      setSuccessMessage(`Access granted to ${newUser.name} (${newUser.email})`);
    }
  };

  const handleRevokeAccess = async (siteId: string, userId: string) => {
    if (isLive) {
      setLoading(true);
      try {
        await api.revokeAccess(siteId, userId);
        setSuccessMessage("Access revoked and updated in database.");
        await fetchRemoteData();
      } catch (err: any) {
        setError(err.message || "Failed to revoke access in database.");
      } finally {
        setLoading(false);
      }
    } else {
      let revokedName = "User";
      setSites((prev) =>
        prev.map((s) => {
          if (s.id === siteId) {
            const target = (s.authorizedUsers || []).find((u) => u.id === userId);
            if (target) revokedName = target.name;
            return {
              ...s,
              authorizedUsers: (s.authorizedUsers || []).filter((u) => u.id !== userId),
            };
          }
          return s;
        })
      );
      setHistory((prev) => [
        {
          id: "e-" + Date.now(),
          title: "Access Revoked",
          detail: `Revoked access for ${revokedName}.`,
          timestamp: new Date().toLocaleTimeString(),
          severity: "warning",
        },
        ...prev,
      ]);
      setSuccessMessage(`Revoked access for ${revokedName}`);
    }
  };

  const handleCommand = (action: Movement) => {
    if (!selectedBollard) return;

    // Security Check: verify user is authorized for this specific bollard
    if (allowedBollardIds !== null && !allowedBollardIds.includes(selectedBollard.id)) {
      setError("Access Denied: You do not have permission to control this specific gate.");
      return;
    }

    if (action !== "stop" && (!selectedBollard.online || !selectedBollard.safetyOk)) {
      setError("Interlock Active: Safety chain or controller not verified.");
      return;
    }

    setActiveMovement(action);
    setIsMoving(true);
    setError(null);
    setSuccessMessage(`Command [${action.toUpperCase()}] dispatched via GateLink`);

    setTimeout(() => {
      setIsMoving(false);
      const newStatus = action === "raise" ? "RAISED" : action === "lower" ? "LOWERED" : "STOPPED";
      const updatedBollard = { ...selectedBollard, status: newStatus };
      setSelectedBollard(updatedBollard);
      setActiveMovement(null);

      setSites((prev) =>
        prev.map((s) => ({
          ...s,
          bollards: s.bollards.map((b) => (b.id === selectedBollard.id ? updatedBollard : b)),
        }))
      );
    }, 3000);

    if (isLive) {
      api.sendCommand(selectedBollard.id, action).catch((err) => {
        setError(`GateLink Relay Error: ${err.message}`);
      });
    }
  };

  const isOwner = user?.role === "owner";

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />

        {!user ? (
          <LoginScreen
            onLogin={handleLogin}
            onRegisterOwner={handleRegisterOwner}
            onDemoOwner={handleDemoOwner}
            onDemoSpouse={handleDemoSpouse}
            isLoading={loading}
            error={error}
          />
        ) : (
          <>
            {/* Top Connection Bar */}
            <View style={styles.topBar}>
              <View style={styles.brandRow}>
                <View
                  style={[
                    styles.beaconDot,
                    { backgroundColor: isLive ? Colors.NeonEmerald : Colors.CyberAmber },
                  ]}
                />
                <View style={styles.brandTextContainer}>
                  <Text style={styles.brandHeader} numberOfLines={1}>
                    KJS BOLLARDS
                  </Text>
                  <Text
                    style={[
                      styles.brandSub,
                      { color: isOwner ? Colors.CyberAmber : Colors.NeonEmerald },
                    ]}
                    numberOfLines={1}
                  >
                    {isOwner
                      ? "👑 Master Owner (All Gates)"
                      : "👩 Sarah (Spouse - Specific Gates Only)"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={fetchRemoteData}
                style={styles.refreshBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.refreshIcon}>🔄</Text>
              </TouchableOpacity>
            </View>

            {/* Main Screen Body */}
            <View style={styles.body}>
              {screen === "dashboard" && (
                <DashboardScreen
                  sites={visibleSites}
                  alertsCount={alerts.length}
                  onSelectBollard={(b) => {
                    setSelectedBollard(b);
                    setScreen("control");
                  }}
                  onRefresh={fetchRemoteData}
                  refreshing={loading}
                />
              )}

              {screen === "control" && selectedBollard && (
                <ControlScreen
                  bollard={selectedBollard}
                  onBack={() => setScreen("dashboard")}
                  onCommand={handleCommand}
                  isMoving={isMoving}
                  activeMovement={activeMovement}
                  error={error}
                  successMessage={successMessage}
                />
              )}

              {screen === "sites" && (
                <SitesScreen
                  sites={visibleSites}
                  onSelectBollard={(b) => {
                    setSelectedBollard(b);
                    setScreen("control");
                  }}
                  onOpenAddModal={() => setAddModalVisible(true)}
                />
              )}

              {screen === "alerts" && (
                <EventsScreen title="Active Telemetry Alerts" events={alerts} />
              )}

              {screen === "history" && (
                <EventsScreen title="Audit Trail & Operation History" events={history} />
              )}

              {screen === "settings" && (
                <SettingsScreen
                  user={user}
                  sites={sites}
                  onLogout={handleLogout}
                  onViewDiagnostics={() => setScreen("settings")}
                  onOpenAddModal={() => setAddModalVisible(true)}
                  onOpenAccessModal={() => setAccessModalVisible(true)}
                />
              )}
            </View>

            {/* Add Bollard Modal (Owner Only Registration) */}
            <AddBollardModal
              visible={addModalVisible}
              sites={sites}
              onClose={() => setAddModalVisible(false)}
              onAddBollard={handleAddBollard}
            />

            {/* Granular Access Sharing Modal (Family & Staff) */}
            <AccessSharingModal
              visible={accessModalVisible}
              sites={sites}
              onClose={() => setAccessModalVisible(false)}
              onGrantAccess={handleGrantAccess}
              onRevokeAccess={handleRevokeAccess}
            />

            {/* Bottom Navigation Tabs */}
            <View style={styles.bottomNav}>
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => setScreen("dashboard")}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.navIcon, screen === "dashboard" && styles.navIconActive]}>
                  ▦
                </Text>
                <Text
                  style={[styles.navLabel, screen === "dashboard" && styles.navLabelActive]}
                  numberOfLines={1}
                >
                  Overview
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => setScreen("sites")}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.navIcon, screen === "sites" && styles.navIconActive]}>
                  🏢
                </Text>
                <Text
                  style={[styles.navLabel, screen === "sites" && styles.navLabelActive]}
                  numberOfLines={1}
                >
                  Sites
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => setScreen("alerts")}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <View style={styles.badgeWrapper}>
                  <Text style={[styles.navIcon, screen === "alerts" && styles.navIconActive]}>
                    🔔
                  </Text>
                  {alerts.length > 0 && <View style={styles.badgeDot} />}
                </View>
                <Text
                  style={[styles.navLabel, screen === "alerts" && styles.navLabelActive]}
                  numberOfLines={1}
                >
                  Alerts
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => setScreen("settings")}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.navIcon, screen === "settings" && styles.navIconActive]}>
                  ⚙️
                </Text>
                <Text
                  style={[styles.navLabel, screen === "settings" && styles.navLabelActive]}
                  numberOfLines={1}
                >
                  Config
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.VoidBlack,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.SurfaceDark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.SurfaceHighlight,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  brandTextContainer: {
    flex: 1,
  },
  beaconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  brandHeader: {
    fontSize: responsiveFont(14),
    fontWeight: "900",
    letterSpacing: 1,
    color: Colors.TextWhite,
  },
  brandSub: {
    fontSize: responsiveFont(9),
    fontWeight: "600",
  },
  refreshBtn: {
    padding: 6,
  },
  refreshIcon: {
    fontSize: responsiveFont(15),
  },
  body: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: "row",
    height: 58,
    backgroundColor: Colors.SurfaceDark,
    borderTopWidth: 1,
    borderTopColor: Colors.SurfaceHighlight,
    alignItems: "center",
  },
  navItem: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  navIcon: {
    fontSize: responsiveFont(16),
    color: Colors.TextMuted,
    marginBottom: 2,
  },
  navIconActive: {
    color: Colors.ElectricCyan,
  },
  navLabel: {
    fontSize: responsiveFont(9),
    fontWeight: "600",
    color: Colors.TextMuted,
  },
  navLabelActive: {
    color: Colors.ElectricCyan,
    fontWeight: "800",
  },
  badgeWrapper: {
    position: "relative",
  },
  badgeDot: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.CrimsonRed,
  },
});
