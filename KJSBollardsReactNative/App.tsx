import React, { useState, useEffect } from "react";
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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [allowedBollardIds, setAllowedBollardIds] = useState<string[] | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [history, setHistory] = useState<EventItem[]>([]);
  const [alerts, setAlerts] = useState<EventItem[]>([]);
  const [screen, setScreen] = useState<ScreenType>("dashboard");
  const [selectedBollard, setSelectedBollard] = useState<Bollard | null>(null);
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
        return s;
      }
      return {
        ...s,
        bollards: (s.bollards || []).filter((b) => allowedBollardIds.includes(b.id)),
      };
    })
    .filter((s) => (s.bollards || []).length > 0 || allowedBollardIds === null);

  const fetchRemoteData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [remoteSites, remoteHistory, remoteAlerts] = await Promise.all([
        api.getSites(),
        api.getHistory(),
        api.getAlerts(),
      ]);
      setSites(remoteSites || []);
      setHistory(remoteHistory || []);
      setAlerts(remoteAlerts || []);
    } catch (err: any) {
      setError(err.message || "Unable to sync telemetry from server.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const session = await api.login(email, pass);
      api.setToken(session.accessToken);
      setUser(session.user);
      setAllowedBollardIds(null);
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
      setSuccessMessage(`Welcome, ${session.user.name}! Account and site registered.`);
      await fetchRemoteData();
    } catch (err: any) {
      setError(err.message || "Failed to register owner account with database.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
    setAllowedBollardIds(null);
    setSites([]);
    setHistory([]);
    setAlerts([]);
    setScreen("dashboard");
    setSelectedBollard(null);
  };

  const handleAddBollard = async (siteId: string, newBollard: Bollard) => {
    setLoading(true);
    setError(null);
    try {
      await api.commissionBollard({
        siteId,
        name: newBollard.name,
        deviceCode: newBollard.serial || ("RC200-" + Date.now().toString(36).toUpperCase()),
        openDuration: newBollard.movementSeconds || 6,
      });
      setSuccessMessage(`Registered and commissioned ${newBollard.name}`);
      await fetchRemoteData();
    } catch (err: any) {
      setError(err.message || "Failed to commission bollard to cloud database.");
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async (siteId: string, newUser: AuthorizedUser) => {
    setLoading(true);
    setError(null);
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
  };

  const handleRevokeAccess = async (siteId: string, userId: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.revokeAccess(siteId, userId);
      setSuccessMessage("Access revoked and updated in database.");
      await fetchRemoteData();
    } catch (err: any) {
      setError(err.message || "Failed to revoke access in database.");
    } finally {
      setLoading(false);
    }
  };

  const handleCommand = async (action: Movement) => {
    if (!selectedBollard) return;

    if (allowedBollardIds !== null && !allowedBollardIds.includes(selectedBollard.id)) {
      setError("Access Denied: You do not have permission to control this specific gate.");
      return;
    }

    setActiveMovement(action);
    setIsMoving(true);
    setError(null);
    setSuccessMessage(`Command [${action.toUpperCase()}] dispatched via GateLink`);

    try {
      await api.sendCommand(selectedBollard.id, action);
      const newStatus = action === "raise" ? "RAISED" : action === "lower" ? "LOWERED" : "STOPPED";
      setSelectedBollard({ ...selectedBollard, status: newStatus });
      await fetchRemoteData();
    } catch (err: any) {
      setError(`GateLink Relay Error: ${err.message}`);
    } finally {
      setIsMoving(false);
      setActiveMovement(null);
    }
  };

  const isOwner = user?.role === "owner" || user?.role === "admin";

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />

        {!user ? (
          <LoginScreen
            onLogin={handleLogin}
            onRegisterOwner={handleRegisterOwner}
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
                    { backgroundColor: Colors.NeonEmerald },
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
                      ? `👑 ${user?.name || "Master Owner"} (Full Access)`
                      : `👤 ${user?.name || "Operator"} (Assigned Access)`}
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

              {screen === "events" && (
                <EventsScreen
                  history={history}
                  alerts={alerts}
                  onRefresh={fetchRemoteData}
                  refreshing={loading}
                />
              )}

              {screen === "settings" && (
                <SettingsScreen
                  user={user}
                  sites={sites}
                  onLogout={handleLogout}
                  onViewDiagnostics={() => {
                    const first = sites.flatMap((s) => s.bollards || [])[0];
                    if (first) {
                      setSelectedBollard(first);
                      setScreen("control");
                    }
                  }}
                  onOpenAddModal={() => setAddModalVisible(true)}
                  onOpenAccessModal={() => setAccessModalVisible(true)}
                />
              )}
            </View>

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => setScreen("dashboard")}
                activeOpacity={0.8}
              >
                <Text style={[styles.navIcon, screen === "dashboard" && styles.navIconActive]}>
                  📊
                </Text>
                <Text style={[styles.navLabel, screen === "dashboard" && styles.navLabelActive]}>
                  STATUS
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => setScreen("sites")}
                activeOpacity={0.8}
              >
                <Text style={[styles.navIcon, screen === "sites" && styles.navIconActive]}>
                  🏰
                </Text>
                <Text style={[styles.navLabel, screen === "sites" && styles.navLabelActive]}>
                  SITES
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => setScreen("events")}
                activeOpacity={0.8}
              >
                <Text style={[styles.navIcon, screen === "events" && styles.navIconActive]}>
                  📜
                </Text>
                <Text style={[styles.navLabel, screen === "events" && styles.navLabelActive]}>
                  EVENTS
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => setScreen("settings")}
                activeOpacity={0.8}
              >
                <Text style={[styles.navIcon, screen === "settings" && styles.navIconActive]}>
                  ⚙️
                </Text>
                <Text style={[styles.navLabel, screen === "settings" && styles.navLabelActive]}>
                  SYSTEM
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Add Bollard Modal */}
        <AddBollardModal
          visible={addModalVisible}
          sites={sites}
          onClose={() => setAddModalVisible(false)}
          onAdd={handleAddBollard}
        />

        {/* Access Sharing Modal */}
        <AccessSharingModal
          visible={accessModalVisible}
          sites={sites}
          onClose={() => setAccessModalVisible(false)}
          onGrantAccess={handleGrantAccess}
          onRevokeAccess={handleRevokeAccess}
        />
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
    alignItems: "center",
    justifyContent: "space-between",
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
    marginRight: 10,
  },
  beaconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  brandTextContainer: {
    flex: 1,
  },
  brandHeader: {
    fontSize: responsiveFont(13),
    fontWeight: "900",
    letterSpacing: 1.5,
    color: Colors.TextWhite,
  },
  brandSub: {
    fontSize: responsiveFont(9),
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 1,
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.SurfaceHighlight,
  },
  refreshIcon: {
    fontSize: responsiveFont(14),
  },
  body: {
    flex: 1,
    backgroundColor: Colors.VoidBlack,
  },
  bottomNav: {
    flexDirection: "row",
    height: 60,
    backgroundColor: Colors.SurfaceDark,
    borderTopWidth: 1,
    borderTopColor: Colors.SurfaceHighlight,
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  navIcon: {
    fontSize: responsiveFont(18),
    opacity: 0.5,
    marginBottom: 2,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: responsiveFont(9),
    fontWeight: "800",
    letterSpacing: 1,
    color: Colors.TextMuted,
  },
  navLabelActive: {
    color: Colors.ElectricCyan,
  },
});
