import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { User, Site } from "../types";
import { Colors } from "../theme/colors";
import { responsiveFont } from "../theme/responsive";

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

      {/* Gateway Info */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>GATEWAY & AUTH TELEMETRY</Text>
        <Text style={styles.gatewayLabel}>GateLink Cloud: https://gatelink.jutaicloud.com</Text>
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
    letterSpacing: 1.5,
    color: Colors.ElectricCyan,
    marginBottom: 14,
  },
  card: {
    backgroundColor: Colors.SurfaceDark,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
    marginBottom: 14,
  },
  cardHighlight: {
    backgroundColor: "#131C2E",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.ElectricCyan,
    marginBottom: 14,
  },
  sharingHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  sharingTitle: {
    fontSize: responsiveFont(12),
    fontWeight: "900",
    color: Colors.TextWhite,
    letterSpacing: 0.5,
  },
  sharingSubtitle: {
    fontSize: responsiveFont(10),
    color: Colors.ElectricCyan,
    marginTop: 1,
  },
  countPill: {
    backgroundColor: "rgba(6, 182, 212, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  countPillText: {
    fontSize: responsiveFont(9),
    fontWeight: "900",
    color: Colors.ElectricCyan,
  },
  sharingDesc: {
    fontSize: responsiveFont(11),
    color: Colors.TextMuted,
    lineHeight: 16,
    marginBottom: 12,
  },
  sharingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.ElectricCyan,
    paddingVertical: 12,
    borderRadius: 10,
  },
  sharingBtnIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  sharingBtnText: {
    color: Colors.VoidBlack,
    fontSize: responsiveFont(11),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  cardHeader: {
    fontSize: responsiveFont(9),
    fontWeight: "800",
    color: Colors.TextMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  operatorName: {
    fontSize: responsiveFont(15),
    fontWeight: "800",
    color: Colors.TextWhite,
  },
  operatorEmail: {
    fontSize: responsiveFont(11),
    color: Colors.TextMuted,
    marginTop: 2,
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 12,
  },
  roleText: {
    fontSize: responsiveFont(9),
    fontWeight: "800",
    color: Colors.NeonEmerald,
  },
  addHardwareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.SurfaceHighlight,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.ElectricCyan,
  },
  addHardwareIcon: {
    color: Colors.ElectricCyan,
    fontSize: responsiveFont(14),
    fontWeight: "900",
    marginRight: 6,
  },
  addHardwareText: {
    color: Colors.ElectricCyan,
    fontSize: responsiveFont(10),
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  gatewayLabel: {
    fontSize: responsiveFont(10),
    fontFamily: "Courier",
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
});
