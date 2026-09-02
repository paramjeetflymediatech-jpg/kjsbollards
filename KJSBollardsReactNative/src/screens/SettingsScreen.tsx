import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { User, Site } from "../types";
import { Colors } from "../theme/colors";
import { responsiveFont } from "../theme/responsive";
import { api, PRODUCTION_API_URL, DEFAULT_LOCAL_URL } from "../api/client";

interface SettingsScreenProps {
  user: User | null;
  sites: Site[];
  onLogout: () => void;
  onViewDiagnostics: () => void;
  onOpenAddModal: () => void;
  onOpenAccessModal: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  sites,
  onLogout,
  onViewDiagnostics,
  onOpenAddModal,
  onOpenAccessModal,
}) => {
  const totalAuthorized = sites.reduce((acc, s) => acc + (s.authorizedUsers?.length || 0), 0);

  // Backend URL configuration state
  const [activeUrl, setActiveUrl] = useState<string>(api.getBaseUrl());
  const [modalVisible, setModalVisible] = useState(false);
  const [inputUrl, setInputUrl] = useState<string>(api.getBaseUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleOpenConfig = () => {
    setInputUrl(activeUrl);
    setTestResult(null);
    setModalVisible(true);
  };

  const handleTestConnection = async (targetUrl?: string) => {
    const urlToTest = (targetUrl || inputUrl).trim().replace(/\/$/, "");
    if (!urlToTest) return;

    setTesting(true);
    setTestResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${urlToTest}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        setTestResult({
          success: true,
          message: `Online (${json.service || "HTTP 200 OK"})`,
        });
      } else {
        setTestResult({
          success: false,
          message: `Server responded with HTTP ${res.status}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.name === "AbortError" ? "Connection timed out" : (err.message || "Failed to reach host"),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveUrl = async () => {
    const clean = inputUrl.trim().replace(/\/$/, "");
    if (!clean) {
      Alert.alert("Error", "Server URL cannot be empty");
      return;
    }
    await api.setBaseUrl(clean, true);
    setActiveUrl(clean);
    setModalVisible(false);
    Alert.alert("Server Updated", `App backend endpoint set to:\n${clean}`);
  };

  const isProduction = activeUrl === PRODUCTION_API_URL;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionHeader}>SYSTEM CONFIGURATION & SECURITY</Text>

      {/* Operator & Owner Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>PRIMARY OWNER ACCOUNT</Text>
        <Text style={styles.operatorName}>{user?.name || "Primary Owner"}</Text>
        <Text style={styles.operatorEmail}>{user?.email || "owner@kjsbollards.co.uk"}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>MASTER OWNER</Text>
        </View>

        {/* Claim / Add Bollard Button */}
        <TouchableOpacity style={styles.addHardwareBtn} onPress={onOpenAddModal} activeOpacity={0.8}>
          <Text style={styles.addHardwareIcon}>＋</Text>
          <Text style={styles.addHardwareText}>CLAIM NEW BOLLARD (OWNER LOCK)</Text>
        </TouchableOpacity>
      </View>

      {/* Family & Authorized Sharing Card */}
      <View style={styles.cardHighlight}>
        <View style={styles.sharingHeaderRow}>
          <View>
            <Text style={styles.sharingTitle}>AUTHORIZED ACCESS SHARING</Text>
            <Text style={styles.sharingSubtitle}>Family (Spouse) & Staff Access Delegation</Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{totalAuthorized} ACTIVE</Text>
          </View>
        </View>

        <Text style={styles.sharingDesc}>
          Invite family members (e.g. your wife) or security staff by their email. They can download the
          app and operate your gates securely without seeing your secret hardware serial keys.
        </Text>

        <TouchableOpacity style={styles.sharingBtn} onPress={onOpenAccessModal} activeOpacity={0.85}>
          <Text style={styles.sharingBtnIcon}>👥</Text>
          <Text style={styles.sharingBtnText}>MANAGE AUTHORIZED PERSONS</Text>
        </TouchableOpacity>
      </View>

      {/* Backend Server Endpoint Card */}
      <View style={styles.card}>
        <View style={styles.serverHeaderRow}>
          <Text style={styles.cardHeader}>BACKEND API ENDPOINT</Text>
          <View style={[styles.serverModeBadge, { backgroundColor: isProduction ? Colors.CyberAmber + "22" : Colors.ElectricCyan + "22" }]}>
            <Text style={[styles.serverModeText, { color: isProduction ? Colors.CyberAmber : Colors.ElectricCyan }]}>
              {isProduction ? "PRODUCTION CLOUD" : "CUSTOM / LOCAL"}
            </Text>
          </View>
        </View>

        <Text style={styles.serverUrlText} numberOfLines={1}>
          {activeUrl}
        </Text>

        <TouchableOpacity style={styles.serverConfigBtn} onPress={handleOpenConfig} activeOpacity={0.8}>
          <Text style={styles.serverConfigBtnText}>CONFIGURE SERVER / SWITCH ENDPOINT</Text>
        </TouchableOpacity>
      </View>

      {/* Gateway Info */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>GATEWAY & AUTH TELEMETRY</Text>
        <Text style={styles.gatewayLabel}>GateLink Cloud: https://gatelink.jutaicloud.com</Text>
        <Text style={styles.gatewayLabel}>Controller Architecture: GateLink RC200 OpenAPI</Text>
        <Text style={styles.gatewayLabel}>Security Interlock: Device Serial Anti-Theft Lock Active</Text>
        <TouchableOpacity style={styles.diagBtn} onPress={onViewDiagnostics} activeOpacity={0.8}>
          <Text style={styles.diagBtnText}>VIEW EXTENDED DIAGNOSTICS</Text>
        </TouchableOpacity>
      </View>

      {/* Compliance Box */}
      <View style={styles.complianceCard}>
        <Text style={styles.complianceHeader}>GATELINK SECURITY PROTOCOL</Text>
        <Text style={styles.complianceItem}>• Single-Owner Hardware Binding: ENFORCED</Text>
        <Text style={styles.complianceItem}>• Serial Hijacking Protection: ACTIVE</Text>
        <Text style={styles.complianceItem}>• Multi-User Granular Authorization: ACTIVE</Text>
        <Text style={styles.complianceItem}>• Instant Revocation Mechanism: ACTIVE</Text>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
        <Text style={styles.logoutBtnText}>TERMINATE SESSION</Text>
      </TouchableOpacity>

      {/* Server URL Configuration Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configure API Server</Text>
            <Text style={styles.modalSubtitle}>
              Select a preset or enter the HTTP/HTTPS address of your KJS Bollards backend server.
            </Text>

            <TextInput
              style={styles.modalInput}
              value={inputUrl}
              onChangeText={(text) => {
                setInputUrl(text);
                setTestResult(null);
              }}
              placeholder="https://api.kjsbollards.co.uk"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Quick Presets */}
            <Text style={styles.presetLabel}>QUICK PRESETS:</Text>
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={[styles.presetChip, inputUrl === PRODUCTION_API_URL && styles.presetChipActive]}
                onPress={() => {
                  setInputUrl(PRODUCTION_API_URL);
                  setTestResult(null);
                }}
              >
                <Text style={styles.presetChipText}>Production Cloud</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetChip, inputUrl === DEFAULT_LOCAL_URL && styles.presetChipActive]}
                onPress={() => {
                  setInputUrl(DEFAULT_LOCAL_URL);
                  setTestResult(null);
                }}
              >
                <Text style={styles.presetChipText}>Localhost / Emulator</Text>
              </TouchableOpacity>
            </View>

            {/* Test Connection Button */}
            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => handleTestConnection()}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color={Colors.ElectricCyan} />
              ) : (
                <Text style={styles.testBtnText}>⚡ TEST SERVER CONNECTIVITY</Text>
              )}
            </TouchableOpacity>

            {testResult && (
              <View
                style={[
                  styles.testResultBox,
                  { backgroundColor: testResult.success ? "#052e16" : "#450a0a" },
                ]}
              >
                <Text
                  style={[
                    styles.testResultText,
                    { color: testResult.success ? Colors.NeonEmerald : Colors.CrimsonRed },
                  ]}
                >
                  {testResult.success ? "✓ " : "✗ "}
                  {testResult.message}
                </Text>
              </View>
            )}

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveUrl}>
                <Text style={styles.modalSaveText}>SAVE & APPLY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.VoidBlack,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  sectionHeader: {
    fontSize: responsiveFont(11),
    fontWeight: "800",
    color: Colors.TextMuted,
    letterSpacing: 1.5,
    marginBottom: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: Colors.SurfaceDark,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.BorderGlow,
    marginBottom: 16,
  },
  cardHighlight: {
    backgroundColor: "#0d1b2a",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.ElectricCyan + "44",
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: responsiveFont(11),
    fontWeight: "800",
    color: Colors.CyberAmber,
    letterSpacing: 1,
    marginBottom: 8,
  },
  operatorName: {
    fontSize: responsiveFont(16),
    fontWeight: "700",
    color: Colors.TextWhite,
    marginBottom: 2,
  },
  operatorEmail: {
    fontSize: responsiveFont(13),
    color: Colors.TextMuted,
    marginBottom: 12,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.CyberAmber + "22",
    borderWidth: 1,
    borderColor: Colors.CyberAmber,
    marginBottom: 16,
  },
  roleText: {
    fontSize: responsiveFont(10),
    fontWeight: "800",
    color: Colors.CyberAmber,
    letterSpacing: 0.5,
  },
  addHardwareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.ElectricCyan,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  addHardwareIcon: {
    fontSize: responsiveFont(16),
    fontWeight: "800",
    color: Colors.VoidBlack,
    marginRight: 6,
  },
  addHardwareText: {
    fontSize: responsiveFont(11),
    fontWeight: "800",
    color: Colors.VoidBlack,
    letterSpacing: 0.5,
  },
  sharingHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sharingTitle: {
    fontSize: responsiveFont(13),
    fontWeight: "800",
    color: Colors.ElectricCyan,
    letterSpacing: 0.5,
  },
  sharingSubtitle: {
    fontSize: responsiveFont(11),
    color: Colors.TextMuted,
  },
  countPill: {
    backgroundColor: Colors.ElectricCyan + "22",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.ElectricCyan,
  },
  countPillText: {
    fontSize: responsiveFont(10),
    fontWeight: "800",
    color: Colors.ElectricCyan,
  },
  sharingDesc: {
    fontSize: responsiveFont(12),
    color: "#94a3b8",
    lineHeight: 18,
    marginBottom: 14,
  },
  sharingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.SurfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.ElectricCyan,
    borderRadius: 10,
    paddingVertical: 10,
  },
  sharingBtnIcon: {
    fontSize: responsiveFont(14),
    marginRight: 8,
  },
  sharingBtnText: {
    fontSize: responsiveFont(11),
    fontWeight: "800",
    color: Colors.ElectricCyan,
    letterSpacing: 0.5,
  },
  serverHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  serverModeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  serverModeText: {
    fontSize: responsiveFont(9),
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  serverUrlText: {
    fontSize: responsiveFont(13),
    fontWeight: "600",
    color: Colors.TextWhite,
    fontFamily: "monospace",
    backgroundColor: "#090d16",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 10,
  },
  serverConfigBtn: {
    paddingVertical: 9,
    backgroundColor: Colors.SurfaceHighlight,
    borderRadius: 8,
    alignItems: "center",
  },
  serverConfigBtnText: {
    fontSize: responsiveFont(10),
    fontWeight: "800",
    color: Colors.CyberAmber,
    letterSpacing: 0.5,
  },
  gatewayLabel: {
    fontSize: responsiveFont(12),
    color: Colors.TextWhite,
    marginBottom: 4,
  },
  diagBtn: {
    marginTop: 8,
    paddingVertical: 8,
    backgroundColor: Colors.SurfaceHighlight,
    borderRadius: 8,
    alignItems: "center",
  },
  diagBtnText: {
    fontSize: responsiveFont(10),
    fontWeight: "800",
    color: Colors.ElectricCyan,
    letterSpacing: 0.5,
  },
  complianceCard: {
    backgroundColor: Colors.SurfaceDark,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.BorderGlow,
    marginBottom: 20,
  },
  complianceHeader: {
    fontSize: responsiveFont(11),
    fontWeight: "800",
    color: Colors.ElectricCyan,
    marginBottom: 8,
  },
  complianceItem: {
    fontSize: responsiveFont(11),
    color: Colors.TextMuted,
    marginBottom: 4,
  },
  logoutBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.CrimsonRed,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutBtnText: {
    color: Colors.CrimsonRed,
    fontSize: responsiveFont(12),
    fontWeight: "800",
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderColor: Colors.BorderGlow,
  },
  modalTitle: {
    fontSize: responsiveFont(16),
    fontWeight: "800",
    color: Colors.TextWhite,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: responsiveFont(11),
    color: Colors.TextMuted,
    marginBottom: 16,
    lineHeight: 16,
  },
  modalInput: {
    backgroundColor: "#020617",
    color: Colors.TextWhite,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: responsiveFont(13),
    fontFamily: "monospace",
    marginBottom: 12,
  },
  presetLabel: {
    fontSize: responsiveFont(10),
    fontWeight: "800",
    color: Colors.TextMuted,
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  presetChip: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  presetChipActive: {
    backgroundColor: Colors.ElectricCyan + "22",
    borderColor: Colors.ElectricCyan,
  },
  presetChipText: {
    fontSize: responsiveFont(11),
    color: Colors.TextWhite,
    fontWeight: "600",
  },
  testBtn: {
    backgroundColor: "#1e293b",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.ElectricCyan,
    marginBottom: 10,
  },
  testBtnText: {
    color: Colors.ElectricCyan,
    fontWeight: "800",
    fontSize: responsiveFont(10),
    letterSpacing: 0.5,
  },
  testResultBox: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 14,
  },
  testResultText: {
    fontSize: responsiveFont(11),
    fontWeight: "700",
  },
  modalActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalCancelText: {
    color: Colors.TextMuted,
    fontWeight: "700",
    fontSize: responsiveFont(12),
  },
  modalSaveBtn: {
    backgroundColor: Colors.CyberAmber,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSaveText: {
    color: Colors.VoidBlack,
    fontWeight: "800",
    fontSize: responsiveFont(12),
  },
});
