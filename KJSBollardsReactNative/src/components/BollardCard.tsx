import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Bollard } from "../types";
import { Colors } from "../theme/colors";
import { responsiveFont } from "../theme/responsive";

interface BollardCardProps {
  bollard: Bollard;
  onPress: () => void;
}

export const BollardCard: React.FC<BollardCardProps> = ({ bollard, onPress }) => {
  const isRaised = bollard.status === "RAISED";
  const isLowered = bollard.status === "LOWERED";
  const statusColor = isRaised
    ? Colors.NeonEmerald
    : isLowered
    ? Colors.CyberAmber
    : Colors.CrimsonRed;

  return (
    <TouchableOpacity
      style={[styles.container, { borderColor: `${statusColor}40` }]}
      onPress={onPress}
      activeOpacity={0.75}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {/* Icon visual block */}
      <View style={[styles.iconBlock, { backgroundColor: `${statusColor}20` }]}>
        <Text style={[styles.iconText, { color: statusColor }]}>
          {isRaised ? "▲" : isLowered ? "▼" : "■"}
        </Text>
      </View>

      {/* Details */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {bollard.name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.serial}>SN: {bollard.serial || "RC200"}</Text>
          <Text style={styles.separator}>•</Text>
          <Text
            style={[
              styles.safetyStatus,
              { color: bollard.safetyOk ? Colors.NeonEmerald : Colors.CrimsonRed },
            ]}
            numberOfLines={1}
          >
            {bollard.safetyOk ? "Safety OK" : "Safety Alert"}
          </Text>
        </View>
      </View>

      {/* Status Badge */}
      <View
        style={[
          styles.badge,
          { backgroundColor: `${statusColor}25`, borderColor: `${statusColor}80` },
        ]}
      >
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text
          style={[styles.badgeText, { color: statusColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {bollard.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.SurfaceDark,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconBlock: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  iconText: {
    fontSize: responsiveFont(16),
    fontWeight: "bold",
  },
  info: {
    flex: 1,
    paddingRight: 6,
  },
  name: {
    fontSize: responsiveFont(14),
    fontWeight: "700",
    color: Colors.TextWhite,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    flexWrap: "nowrap",
  },
  serial: {
    fontSize: responsiveFont(10),
    fontFamily: "Courier",
    color: Colors.TextSubtle,
  },
  separator: {
    color: Colors.TextSubtle,
    marginHorizontal: 4,
    fontSize: responsiveFont(10),
  },
  safetyStatus: {
    fontSize: responsiveFont(10),
    fontWeight: "600",
    flexShrink: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 70,
    justifyContent: "center",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  badgeText: {
    fontSize: responsiveFont(10),
    fontWeight: "900",
  },
});
