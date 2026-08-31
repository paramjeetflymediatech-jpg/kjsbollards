import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../theme/colors";
import { responsiveFont } from "../theme/responsive";

interface MetricBoxProps {
  title: string;
  value: string;
  color: string;
  subtitle?: string;
}

export const MetricBox: React.FC<MetricBoxProps> = ({ title, value, color, subtitle }) => {
  return (
    <View style={[styles.card, { borderColor: `${color}35` }]}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
        <View style={[styles.dot, { backgroundColor: color }]} />
      </View>
      <Text style={[styles.value, { color: Colors.TextWhite }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1} adjustsFontSizeToFit>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.SurfaceCard,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    minHeight: 74,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: responsiveFont(10),
    fontWeight: "800",
    color: Colors.TextMuted,
    letterSpacing: 0.8,
    flex: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },
  value: {
    fontSize: responsiveFont(14),
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: responsiveFont(9),
    color: Colors.TextSubtle,
    marginTop: 2,
    fontWeight: "600",
  },
});
