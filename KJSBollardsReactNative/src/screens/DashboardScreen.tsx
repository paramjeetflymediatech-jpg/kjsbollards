import React from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { Site, Bollard } from "../types";
import { Colors } from "../theme/colors";
import { responsiveFont } from "../theme/responsive";
import { MetricBox } from "../components/MetricBox";
import { BollardCard } from "../components/BollardCard";

interface DashboardScreenProps {
  sites: Site[];
  alertsCount: number;
  onSelectBollard: (bollard: Bollard) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  sites,
  alertsCount,
  onSelectBollard,
  onRefresh,
  refreshing,
}) => {
  const allBollards = sites.flatMap((s) => s.bollards);
  const totalCount = allBollards.length;
  const onlineCount = allBollards.filter((b) => b.online).length;
  const raisedCount = allBollards.filter((b) => b.status === "RAISED").length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.ElectricCyan} />
      }
    >
      {/* Metric Tiles Header */}
      <Text style={styles.sectionHeader}>SYSTEM STATUS</Text>
      <View style={styles.metricsRow}>
        <MetricBox
          title="ONLINE"
          value={`${onlineCount} / ${totalCount}`}
          color={Colors.NeonEmerald}
          subtitle="Hardware Links"
        />
        <View style={styles.spacer} />
        <MetricBox
          title="SECURED"
          value={`${raisedCount} UNITS`}
          color={Colors.IceBlue}
          subtitle="Perimeter Active"
        />
        <View style={styles.spacer} />
        <MetricBox
          title="ALERTS"
          value={`${alertsCount} ACTIVE`}
          color={alertsCount > 0 ? Colors.CyberAmber : Colors.NeonEmerald}
          subtitle="Safety Sensors"
        />
      </View>

      {/* Sites & Controllers List */}
      <View style={styles.sitesHeaderRow}>
        <Text style={styles.sectionHeader}>PERIMETER CONTROLLERS</Text>
        <Text style={styles.sitesCount}>{sites.length} SITES ACTIVE</Text>
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

          <View style={styles.bollardsList}>
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
  sectionHeader: {
    fontSize: responsiveFont(11),
    fontWeight: "800",
    letterSpacing: 1.5,
    color: Colors.ElectricCyan,
    marginBottom: 8,
  },
  metricsRow: {
    flexDirection: "row",
    marginBottom: 18,
  },
  spacer: {
    width: 6,
  },
  sitesHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sitesCount: {
    fontSize: responsiveFont(10),
    color: Colors.TextMuted,
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
  bollardsList: {
    marginTop: 2,
  },
});
