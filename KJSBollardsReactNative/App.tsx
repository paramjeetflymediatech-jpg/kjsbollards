import React, { useState, useEffect } from "react";
import {
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { User, Site, Bollard, EventItem, ScreenType, Movement, AuthorizedUser, Session } from "./src/types";
import { Colors } from "./src/theme/colors";
import { responsiveFont } from "./src/theme/responsive";
import { api } from "./src/api/client";
import { bluetoothService } from "./src/services/bluetooth";
import { wifiProvisioningService } from "./src/services/wifiProvisioning";
import { LoginScreen } from "./src/screens/LoginScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { ControlScreen } from "./src/screens/ControlScreen";
import { SitesScreen } from "./src/screens/SitesScreen";
import { EventsScreen } from "./src/screens/EventsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { AddBollardModal } from "./src/components/AddBollardModal";
import { AccessSharingModal } from "./src/components/AccessSharingModal";

const STORAGE_KEY_SESSION = "@kjs_bollards_session";

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

  // Setup token refresh listener to keep AsyncStorage continuously updated
  useEffect(() => {
    api.onTokenRefreshed(async (newSession) => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newSession));
      } catch {
      }
    });
  }, []);

  // Restore authenticated session and configured API URL from persistent storage on app launch
  useEffect(() => {
    const restoreSession = async () => {
      try {
        await api.initBaseUrl();
        const json = await AsyncStorage.getItem(STORAGE_KEY_SESSION);
        if (json) {
          const session: Session = JSON.parse(json);
          if (session.accessToken && session.user) {
            api.setToken(session.accessToken);
            api.setRefreshToken(session.refreshToken || null);
            setUser(session.user);
            setAllowedBollardIds(null);

            // Register device in background
            api.registerDevice().catch(() => {});

            // Fetch fresh dynamic server telemetry
            const [remoteSites, remoteHistory, remoteAlerts] = await Promise.all([
              api.getSites().catch(() => []),
              api.getHistory().catch(() => []),
              api.getAlerts().catch(() => []),
            ]);
            setSites(remoteSites || []);
            setHistory(remoteHistory || []);
            setAlerts(remoteAlerts || []);
          }
        }
      } catch {}
    };
    restoreSession();
  }, []);

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
      api.setRefreshToken(session.refreshToken || null);
      setUser(session.user);
      setAllowedBollardIds(null);
      await AsyncStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      api.registerDevice().catch(() => {});
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
      api.setRefreshToken(session.refreshToken || null);
      setUser(session.user);
      setAllowedBollardIds(null);
      await AsyncStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      api.registerDevice().catch(() => {});
      setSuccessMessage(`Welcome, ${session.user.name}! Account and site registered.`);
      await fetchRemoteData();
    } catch (err: any) {
      setError(err.message || "Failed to register owner account with database.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    api.setToken(null);
    setUser(null);
    setAllowedBollardIds(null);
    setSites([]);
    setHistory([]);
    setAlerts([]);
    setScreen("dashboard");
    setSelectedBollard(null);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY_SESSION);
    } catch {}
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

    let bleResult: { success: boolean; latencyMs: number } | null = null;
    let wifiResult: { success: boolean; latencyMs: number } | null = null;
    let cloudSuccess = false;
    let cloudError = "";

    // 1. Direct BLE Hardware Command (instant offline relay trigger)
    const isBleConnected = bluetoothService.isDeviceConnected(selectedBollard.serial || selectedBollard.id);
    if (isBleConnected) {
      try {
        bleResult = await bluetoothService.sendBleCommand(action);
      } catch (bleErr: any) {
        console.warn("[HybridControl] BLE trigger error:", bleErr.message);
      }
    }

    // 2. Direct Local Wi-Fi Hardware Command (if on RC200 SoftAP / local network)
    if (!bleResult) {
      try {
        wifiResult = await wifiProvisioningService.sendLocalWifiCommand(action);
      } catch {
        // SoftAP/local probe fallback
      }
    }

    // 3. GateLink Cloud API Command
    try {
      await api.sendCommand(selectedBollard.id, action);
      cloudSuccess = true;
    } catch (apiErr: any) {
      cloudError = apiErr.message || "Cloud sync error";
    }

    // Update local bollard state immediately
    const newStatus = action === "raise" ? "RAISED" : action === "lower" ? "LOWERED" : "STOPPED";
    setSelectedBollard({ ...selectedBollard, status: newStatus });

    // Inform user of execution path
    if (bleResult) {
      setSuccessMessage(
        `⚡ Triggered [${action.toUpperCase()}] via BLE Direct (${bleResult.latencyMs}ms)${
          cloudSuccess ? " • GateLink Cloud Synced" : ""
        }`
      );
    } else if (wifiResult) {
      setSuccessMessage(
        `📶 Triggered [${action.toUpperCase()}] via Local Wi-Fi (${wifiResult.latencyMs}ms)${
          cloudSuccess ? " • GateLink Cloud Synced" : ""
        }`
      );
    } else if (cloudSuccess) {
      setSuccessMessage(`☁️ Dispatched [${action.toUpperCase()}] via GateLink Cloud`);
    } else {
      setError(`Hardware & Cloud Error: ${cloudError || "Command failed to reach device"}`);
    }

    try {
      await fetchRemoteData();
    } catch {}

    setIsMoving(false);
    setActiveMovement(null);
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
                style={[styles.navItem, screen === "dashboard" && styles.navItemActive]}
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
                style={[styles.navItem, screen === "sites" && styles.navItemActive]}
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
                style={[styles.navItem, screen === "events" && styles.navItemActive]}
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
                style={[styles.navItem, screen === "settings" && styles.navItemActive]}
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
    paddingVertical: 12,
    backgroundColor: Colors.SurfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.CardBorder,
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
    marginTop: 2,
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: Colors.SurfaceHighlight,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
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
    height: 64,
    backgroundColor: Colors.SurfaceCard,
    borderTopWidth: 1,
    borderTopColor: Colors.CardBorder,
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: "rgba(6, 182, 212, 0.12)",
  },
  navIcon: {
    fontSize: responsiveFont(17),
    opacity: 0.45,
    marginBottom: 2,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: responsiveFont(9),
    fontWeight: "800",
    letterSpacing: 0.8,
    color: Colors.TextMuted,
  },
  navLabelActive: {
    color: Colors.ElectricCyan,
    fontWeight: "900",
  },
});
