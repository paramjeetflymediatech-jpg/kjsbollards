import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Site, Bollard } from "../types";
import { Colors } from "../theme/colors";
import { responsiveFont } from "../theme/responsive";
import { BollardCard } from "../components/BollardCard";
import { HardwareConnectModal } from "../components/HardwareConnectModal";

interface SitesScreenProps {
  sites: Site[];
  onSelectBollard: (bollard: Bollard) => void;
  onOpenAddModal: () => void;
}

export const SitesScreen: React.FC<SitesScreenProps> = ({
  sites = [],
  onSelectBollard,
  onOpenAddModal,
}) => {
  const [connectModalVisible, setConnectModalVisible] = useState(false);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with Add Button */}
      <View style={styles.topHeaderRow}>
        <View style={styles.titleCol}>
          <Text style={styles.headerTitle}>PERIMETER SITES</Text>
          <Text style={styles.subText}>{sites.length} Active Security Zones</Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={onOpenAddModal}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.addBtnIcon}>＋</Text>
          <Text style={styles.addBtnText}>ADD BOLLARD</Text>
        </TouchableOpacity>
      </View>

      {/* Dedicated Hardware Discovery & Connectivity Banner */}
      <TouchableOpacity
        style={styles.hardwareBanner}
        onPress={() => setConnectModalVisible(true)}
        activeOpacity={0.85}
      >
        <View style={styles.bannerIconBox}>
          <Text style={styles.bannerIconEmoji}>📡</Text>
        </View>
        <View style={styles.bannerTextCol}>
          <View style={styles.bannerTitleRow}>
            <Text style={styles.bannerTitle}>BLUETOOTH & WI-FI HARDWARE</Text>
            <View style={styles.bannerScanBadge}>
              <Text style={styles.bannerScanBadgeText}>RADAR</Text>
            </View>
          </View>
          <Text style={styles.bannerSubtitle}>Scan nearby BLE controllers or configure 2.4 GHz Wi-Fi</Text>
        </View>
        <Text style={styles.bannerArrow}>›</Text>
      </TouchableOpacity>

      {sites.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No perimeter sites registered yet.</Text>
          <Text style={styles.emptySubtext}>
            Tap "+ ADD BOLLARD" above or "📡 BLE / WI-FI" to discover and commission hardware.
          </Text>
          <TouchableOpacity
            style={styles.emptyConnectBtn}
            onPress={() => setConnectModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyConnectBtnText}>📡 SCAN BLUETOOTH & WI-FI SETUP</Text>
          </TouchableOpacity>
        </View>
      ) : (
        sites.map((site) => (
          <View key={site.id} style={styles.siteCard}>
            <View style={styles.siteHeader}>
              <View style={styles.siteInfo}>
                <Text style={styles.siteName} numberOfLines={1}>
                  {site.name || "Site"}
                </Text>
                <Text style={styles.siteAddress} numberOfLines={1}>
                  {site.address || "Main Facility"}
                </Text>
              </View>
              <View style={styles.unitsBadge}>
                <Text style={styles.unitsBadgeText}>{(site.bollards || []).length} UNITS</Text>
              </View>
            </View>

            <View style={styles.bollardsContainer}>
              {(site.bollards || []).length === 0 ? (
                <Text style={styles.noBollardsText}>No bollards added to this site yet.</Text>
              ) : (
                (site.bollards || []).map((bollard) => (
                  <BollardCard
                    key={bollard.id}
                    bollard={bollard}
                    onPress={() => onSelectBollard(bollard)}
                  />
                ))
              )}
            </View>
          </View>
        ))
      )}

      {/* Hardware Connectivity Modal */}
      <HardwareConnectModal
        visible={connectModalVisible}
        onClose={() => setConnectModalVisible(false)}
      />
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
  topHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleCol: {
    flex: 1,
    paddingRight: 10,
  },
  headerTitle: {
    fontSize: responsiveFont(12),
    fontWeight: "900",
    letterSpacing: 1.2,
    color: Colors.TextWhite,
  },
  subText: {
    fontSize: responsiveFont(10),
    color: Colors.TextMuted,
    marginTop: 2,
    fontWeight: "600",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.ElectricCyan,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  addBtnIcon: {
    color: Colors.VoidBlack,
    fontSize: responsiveFont(13),
    fontWeight: "900",
  },
  addBtnText: {
    color: Colors.VoidBlack,
    fontSize: responsiveFont(10),
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  hardwareBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.SurfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.CardBorder,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  bannerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerIconEmoji: {
    fontSize: responsiveFont(16),
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bannerTitle: {
    color: Colors.ElectricCyan,
    fontSize: responsiveFont(11),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  bannerScanBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bannerScanBadgeText: {
    color: Colors.NeonEmerald,
    fontSize: responsiveFont(8),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(9),
    marginTop: 2,
  },
  bannerArrow: {
    color: Colors.ElectricCyan,
    fontSize: responsiveFont(18),
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: Colors.SurfaceDark,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    marginTop: 12,
  },
  emptyText: {
    color: Colors.TextWhite,
    fontSize: responsiveFont(14),
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtext: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(11),
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 14,
  },
  emptyConnectBtn: {
    backgroundColor: Colors.ElectricCyan,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyConnectBtnText: {
    color: Colors.VoidBlack,
    fontSize: responsiveFont(11),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  siteCard: {
    backgroundColor: Colors.SurfaceDark,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  siteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  siteInfo: {
    flex: 1,
    marginRight: 10,
  },
  siteName: {
    color: Colors.TextWhite,
    fontSize: responsiveFont(14),
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  siteAddress: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(10),
    marginTop: 2,
  },
  unitsBadge: {
    backgroundColor: Colors.SurfaceHighlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unitsBadgeText: {
    color: Colors.ElectricCyan,
    fontSize: responsiveFont(9),
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  bollardsContainer: {
    gap: 8,
  },
  noBollardsText: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(11),
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 10,
  },
});
