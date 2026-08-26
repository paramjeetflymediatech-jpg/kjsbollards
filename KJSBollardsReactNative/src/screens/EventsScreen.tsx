import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { EventItem } from "../types";
import { Colors } from "../theme/colors";
import { responsiveFont } from "../theme/responsive";

interface EventsScreenProps {
  title: string;
  events: EventItem[];
}

export const EventsScreen: React.FC<EventsScreenProps> = ({ title, events }) => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{title.toUpperCase()}</Text>
        <Text style={styles.countText}>{events.length} EVENTS</Text>
      </View>

      {events.map((event) => {
        const isHigh = event.severity === "high" || event.severity === "danger";
        const isWarn = event.severity === "warning";
        const severityColor = isHigh
          ? Colors.CrimsonRed
          : isWarn
          ? Colors.CyberAmber
          : Colors.ElectricCyan;

        return (
          <View
            key={event.id}
            style={[styles.eventCard, { borderColor: `${severityColor}40` }]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.eventTitle} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={styles.eventTimestamp}>{event.timestamp}</Text>
            </View>
            <Text style={styles.eventDetail}>{event.detail}</Text>
          </View>
        );
      })}
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: responsiveFont(11),
    fontWeight: "800",
    letterSpacing: 1.5,
    color: Colors.ElectricCyan,
    flex: 1,
  },
  countText: {
    fontSize: responsiveFont(10),
    color: Colors.TextMuted,
    marginLeft: 8,
  },
  eventCard: {
    backgroundColor: Colors.SurfaceDark,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  eventTitle: {
    fontSize: responsiveFont(13),
    fontWeight: "700",
    color: Colors.TextWhite,
    flex: 1,
  },
  eventTimestamp: {
    fontSize: responsiveFont(10),
    fontFamily: "Courier",
    color: Colors.TextMuted,
    marginLeft: 8,
  },
  eventDetail: {
    fontSize: responsiveFont(11),
    color: Colors.TextMuted,
    lineHeight: 16,
  },
});
