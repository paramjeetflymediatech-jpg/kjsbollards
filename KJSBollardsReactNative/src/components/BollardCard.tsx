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
      style={[styles.container, { borderColor: `${statusColor}35` }]}
      onPress={onPress}
      activeOpacity={0.75}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {/* Icon visual block */}
      <View style={[styles.iconBlock, { backgroundColor: `${statusColor}18` }]}>
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
          { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}60` },
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
    backgroundColor: Colors.SurfaceCard,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  iconBlock: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: responsiveFont(15),
    fontWeight: "900",
  },
  info: {
    flex: 1,
    paddingRight: 8,
  },
  name: {
    fontSize: responsiveFont(13),
    fontWeight: "800",
    color: Colors.TextWhite,
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  serial: {
    fontSize: responsiveFont(10),
    color: Colors.TextMuted,
    fontFamily: "monospace",
  },
  separator: {
    fontSize: responsiveFont(10),
    color: Colors.TextSubtle,
    marginHorizontal: 6,
  },
  safetyStatus: {
    fontSize: responsiveFont(10),
    fontWeight: "700",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: responsiveFont(9),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
