import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { EventItem } from "../types";
import { Colors } from "../theme/colors";
import { responsiveFont } from "../theme/responsive";

interface EventsScreenProps {
  title?: string;
  events?: EventItem[];
  history?: EventItem[];
  alerts?: EventItem[];
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const EventsScreen: React.FC<EventsScreenProps> = ({
  title,
  events,
  history = [],
  alerts = [],
  onRefresh,
  refreshing = false,
}) => {
  const [activeTab, setActiveTab] = useState<"history" | "alerts">("history");

  const displayList: EventItem[] =
    events && events.length > 0
      ? events
      : activeTab === "alerts"
      ? alerts
      : history;

  const headerLabel =
    title || (activeTab === "alerts" ? "ACTIVE SECURITY ALERTS" : "SYSTEM EVENT AUDIT TRAIL");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.ElectricCyan}
          />
        ) : undefined
      }
    >
      {/* Tab Switcher if both history and alerts are provided */}
      {!events && (
        <View style={styles.tabSwitchRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "history" && styles.tabBtnActive]}
            onPress={() => setActiveTab("history")}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === "history" && styles.tabBtnTextActive]}>
              HISTORY ({history.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "alerts" && styles.tabBtnActive]}
            onPress={() => setActiveTab("alerts")}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, activeTab === "alerts" && styles.tabBtnTextActive]}>
              ALERTS ({alerts.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{(headerLabel || "EVENT LOG").toUpperCase()}</Text>
        <Text style={styles.countText}>{displayList.length} EVENTS</Text>
      </View>

      {displayList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No event records logged yet.</Text>
        </View>
      ) : (
        displayList.map((event) => {
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
              style={[styles.eventCard, { borderColor: `${severityColor}50` }]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {event.title || "Event Log"}
                </Text>
                <Text style={styles.eventTimestamp}>{event.timestamp || ""}</Text>
              </View>
              <Text style={styles.eventDetail}>{event.detail || "No details provided"}</Text>
            </View>
          );
        })
      )}
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
  tabSwitchRow: {
    flexDirection: "row",
    backgroundColor: "#131C2E",
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: Colors.ElectricCyan,
  },
  tabBtnText: {
    fontSize: responsiveFont(10),
    fontWeight: "800",
    color: Colors.TextMuted,
    letterSpacing: 0.5,
  },
  tabBtnTextActive: {
    color: Colors.VoidBlack,
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
  emptyCard: {
    backgroundColor: Colors.SurfaceDark,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
    borderStyle: "dashed",
    marginTop: 10,
  },
  emptyText: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(11),
  },
});
