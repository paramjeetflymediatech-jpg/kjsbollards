import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Site, Bollard } from "../types";
import { Colors } from "../theme/colors";
import { responsiveFont } from "../theme/responsive";
import { BollardCard } from "../components/BollardCard";

interface SitesScreenProps {
  sites: Site[];
  onSelectBollard: (bollard: Bollard) => void;
  onOpenAddModal: () => void;
}

export const SitesScreen: React.FC<SitesScreenProps> = ({
  sites,
  onSelectBollard,
  onOpenAddModal,
}) => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with Add Button */}
      <View style={styles.topHeaderRow}>
        <View>
          <Text style={styles.headerTitle}>PERIMETER SITES & HARDWARE</Text>
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

      {sites.map((site) => (
        <View key={site.id} style={styles.siteCard}>
          <View style={styles.siteHeader}>
            <View style={styles.siteInfo}>
              <Text style={styles.siteName} numberOfLines={1}>
                {site.name}
              </Text>
              <Text style={styles.siteAddress} numberOfLines={1}>
                {site.address}
              </Text>
            </View>
            <View style={styles.unitsBadge}>
              <Text style={styles.unitsBadgeText}>{site.bollards.length} UNITS</Text>
            </View>
          </View>

          <View style={styles.bollardsContainer}>
            {site.bollards.map((bollard) => (
              <BollardCard
                key={bollard.id}
                bollard={bollard}
                onPress={() => onSelectBollard(bollard)}
              />
            ))}
          </View>
        </View>
      ))}
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
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: responsiveFont(11),
    fontWeight: "800",
    letterSpacing: 1.5,
    color: Colors.ElectricCyan,
  },
  subText: {
    fontSize: responsiveFont(10),
    color: Colors.TextMuted,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    borderWidth: 1,
    borderColor: Colors.ElectricCyan,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnIcon: {
    color: Colors.ElectricCyan,
    fontWeight: "bold",
    fontSize: responsiveFont(12),
    marginRight: 4,
  },
  addBtnText: {
    color: Colors.ElectricCyan,
    fontSize: responsiveFont(10),
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  siteCard: {
    backgroundColor: Colors.SurfaceDark,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
    marginBottom: 14,
  },
  siteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  siteInfo: {
    flex: 1,
    paddingRight: 8,
  },
  siteName: {
    fontSize: responsiveFont(15),
    fontWeight: "800",
    color: Colors.TextWhite,
  },
  siteAddress: {
    fontSize: responsiveFont(11),
    color: Colors.TextMuted,
    marginTop: 2,
  },
  unitsBadge: {
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unitsBadgeText: {
    fontSize: responsiveFont(9),
    fontWeight: "800",
    color: Colors.ElectricCyan,
  },
  bollardsContainer: {
    marginTop: 4,
  },
});
