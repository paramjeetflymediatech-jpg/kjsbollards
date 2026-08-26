import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Bollard, Movement, BollardDiagnostics } from "../types";
import { Colors } from "../theme/colors";
import { responsiveFont } from "../theme/responsive";
import { HydraulicBollard } from "../components/HydraulicBollard";
import { HardwareConfigModal } from "../components/HardwareConfigModal";
import { api } from "../api/client";

interface ControlScreenProps {
  bollard: Bollard;
  onBack: () => void;
  onCommand: (action: Movement) => void;
  isMoving: boolean;
  activeMovement: Movement | null;
  error: string | null;
  successMessage: string | null;
}

export const ControlScreen: React.FC<ControlScreenProps> = ({
  bollard,
  onBack,
  onCommand,
  isMoving,
  activeMovement,
  error,
  successMessage,
}) => {
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [diagnostics, setDiagnostics] = useState<BollardDiagnostics | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);

  const fetchDiagnostics = useCallback(async () => {
    try {
      setLoadingDiag(true);
      const data = await api.getDiagnostics(bollard.id);
      setDiagnostics(data);
    } catch {}
    finally {
      setLoadingDiag(false);
    }
  }, [bollard.id]);

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 4000);
    return () => clearInterval(interval);
  }, [fetchDiagnostics]);

  const inputs = diagnostics?.inputs || [false, false, false, false];
  const outputs = diagnostics?.outputs || [false, false, false, false];
  const signal = diagnostics?.signalStrength ?? bollard.signalStrength ?? 0;
  const cycles = diagnostics?.cycleCount ?? bollard.cycleCount ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {bollard.name}
          </Text>
          <Text style={styles.serial}>HW ID: {bollard.serial || "RC200"}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setConfigModalVisible(true)}
          style={styles.configBtn}
        >
          <Text style={styles.configIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Animated Hydraulic Bollard Visualizer */}
      <View style={styles.visualizerCard}>
        <HydraulicBollard
          status={bollard.status}
          isMoving={isMoving}
          targetMovement={activeMovement}
        />
      </View>

      {/* Real-Time Telemetry Summary Bar */}
      <View style={styles.telemetryCard}>
        <View style={styles.telemetryItem}>
          <Text style={styles.telemetryLabel}>SAFETY LOOP</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.dot,
                { backgroundColor: bollard.safetyOk ? Colors.NeonEmerald : Colors.CrimsonRed },
              ]}
            />
            <Text
              style={[
                styles.telemetryValue,
                { color: bollard.safetyOk ? Colors.NeonEmerald : Colors.CrimsonRed },
              ]}
            >
              {bollard.safetyOk ? "READY" : "FAULT"}
            </Text>
          </View>
        </View>

        <View style={styles.telemetryDivider} />

        <View style={styles.telemetryItem}>
          <Text style={styles.telemetryLabel}>SIGNAL / NET</Text>
          <Text style={[styles.telemetryValue, { color: Colors.ElectricCyan }]}>
            {signal > 0 ? `${signal}dB (${diagnostics?.netType || "WIFI"})` : "OFFLINE"}
          </Text>
        </View>

        <View style={styles.telemetryDivider} />

        <View style={styles.telemetryItem}>
          <Text style={styles.telemetryLabel}>CYCLE COUNT</Text>
          <Text style={[styles.telemetryValue, { color: Colors.CyberAmber }]}>
            {cycles.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* 4-Pin Digital Input & Relay Output Live Diagnostics Grid */}
      <View style={styles.hardwareDiagCard}>
        <View style={styles.diagHeader}>
          <Text style={styles.diagTitle}>LIVE I/O TERMINALS</Text>
          {loadingDiag && <ActivityIndicator size="small" color={Colors.ElectricCyan} />}
        </View>

        {/* Inputs */}
        <Text style={styles.pinSectionLabel}>INPUT TERMINALS (IN1 - IN4)</Text>
        <View style={styles.pinGrid}>
          {["IN1 (Loop)", "IN2 (Photocell)", "IN3 (Button)", "IN4 (Aux)"].map((name, i) => {
            const active = inputs[i];
            return (
              <View key={name} style={[styles.pinBadge, active && styles.pinBadgeActive]}>
                <View style={[styles.pinDot, { backgroundColor: active ? Colors.NeonEmerald : "#484f58" }]} />
                <Text style={[styles.pinText, active && styles.pinTextActive]}>{name}</Text>
              </View>
            );
          })}
        </View>

        {/* Outputs */}
        <Text style={[styles.pinSectionLabel, { marginTop: 10 }]}>OUTPUT RELAYS (OUT1 - OUT4)</Text>
        <View style={styles.pinGrid}>
          {["OUT1 (Raise)", "OUT2 (Lower)", "OUT3 (Stop)", "OUT4 (Aux)"].map((name, i) => {
            const active = outputs[i];
            return (
              <View key={name} style={[styles.pinBadge, active && styles.relayBadgeActive]}>
                <View style={[styles.pinDot, { backgroundColor: active ? Colors.CyberAmber : "#484f58" }]} />
                <Text style={[styles.pinText, active && styles.relayTextActive]}>{name}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Feedback Messages */}
      {error ? (
        <View style={styles.alertBox}>
          <Text style={styles.alertText}>{error}</Text>
        </View>
      ) : null}

      {successMessage ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      {/* Command Actions */}
      <View style={styles.actionsContainer}>
        <View style={styles.splitRow}>
          {/* RAISE Button */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.raiseBtn,
              (!bollard.online || !bollard.safetyOk || isMoving) && styles.disabledBtn,
            ]}
            onPress={() => onCommand("raise")}
            disabled={!bollard.online || !bollard.safetyOk || isMoving}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>▲</Text>
            <Text style={styles.actionText} numberOfLines={1} adjustsFontSizeToFit>
              RAISE BOLLARD
            </Text>
          </TouchableOpacity>

          {/* LOWER Button */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.lowerBtn,
              (!bollard.online || !bollard.safetyOk || isMoving) && styles.disabledBtn,
            ]}
            onPress={() => onCommand("lower")}
            disabled={!bollard.online || !bollard.safetyOk || isMoving}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>▼</Text>
            <Text style={styles.actionText} numberOfLines={1} adjustsFontSizeToFit>
              LOWER BOLLARD
            </Text>
          </TouchableOpacity>
        </View>

        {/* EMERGENCY STOP BUTTON */}
        <TouchableOpacity
          style={styles.stopBtn}
          onPress={() => onCommand("stop")}
          activeOpacity={0.85}
        >
          <Text style={styles.stopIcon}>⛔</Text>
          <Text style={styles.stopText} numberOfLines={1} adjustsFontSizeToFit>
            EMERGENCY STOP (PULSE RELAY)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Hardware Configuration Modal */}
      <HardwareConfigModal
        visible={configModalVisible}
        bollard={bollard}
        onClose={() => {
          setConfigModalVisible(false);
          fetchDiagnostics();
        }}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.SurfaceDark,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
  },
  configBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.SurfaceDark,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
  },
  configIcon: {
    fontSize: 16,
  },
  backIcon: {
    fontSize: responsiveFont(18),
    color: Colors.ElectricCyan,
    fontWeight: "bold",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  title: {
    fontSize: responsiveFont(16),
    fontWeight: "800",
    color: Colors.TextWhite,
  },
  serial: {
    fontSize: responsiveFont(10),
    fontFamily: "Courier",
    color: Colors.TextMuted,
    marginTop: 2,
  },
  visualizerCard: {
    backgroundColor: Colors.SurfaceDark,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.BorderGlow,
    overflow: "hidden",
    marginBottom: 14,
  },
  telemetryCard: {
    flexDirection: "row",
    backgroundColor: Colors.SurfaceDark,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
    marginBottom: 12,
  },
  telemetryItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 2,
  },
  telemetryDivider: {
    width: 1,
    height: "100%",
    backgroundColor: Colors.SurfaceHighlight,
  },
  telemetryLabel: {
    fontSize: responsiveFont(9),
    fontWeight: "800",
    color: Colors.TextMuted,
    marginBottom: 4,
    textAlign: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  telemetryValue: {
    fontSize: responsiveFont(11),
    fontWeight: "900",
  },
  hardwareDiagCard: {
    backgroundColor: Colors.SurfaceDark,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
    marginBottom: 14,
  },
  diagHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  diagTitle: {
    color: Colors.ElectricCyan,
    fontSize: responsiveFont(11),
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  pinSectionLabel: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(9),
    fontWeight: "700",
    marginBottom: 6,
  },
  pinGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pinBadge: {
    flex: 0.48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d1117",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#21262d",
  },
  pinBadgeActive: {
    borderColor: Colors.NeonEmerald,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  relayBadgeActive: {
    borderColor: Colors.CyberAmber,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  pinText: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(10),
    fontWeight: "600",
  },
  pinTextActive: {
    color: Colors.NeonEmerald,
    fontWeight: "700",
  },
  relayTextActive: {
    color: Colors.CyberAmber,
    fontWeight: "700",
  },
  actionsContainer: {
    marginTop: 6,
  },
  splitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  actionBtn: {
    flex: 0.48,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  raiseBtn: {
    backgroundColor: Colors.IceBlue,
  },
  lowerBtn: {
    backgroundColor: Colors.CyberAmber,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  actionIcon: {
    fontSize: responsiveFont(13),
    fontWeight: "900",
    color: Colors.VoidBlack,
    marginBottom: 2,
  },
  actionText: {
    fontSize: responsiveFont(12),
    fontWeight: "900",
    letterSpacing: 0.5,
    color: Colors.VoidBlack,
  },
  stopBtn: {
    height: 60,
    backgroundColor: Colors.CrimsonRed,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.CrimsonDark,
    paddingHorizontal: 12,
  },
  stopIcon: {
    fontSize: responsiveFont(16),
    marginRight: 6,
  },
  stopText: {
    color: Colors.TextWhite,
    fontSize: responsiveFont(13),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  alertBox: {
    padding: 10,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.CrimsonRed,
    marginBottom: 10,
  },
  alertText: {
    color: Colors.CrimsonRed,
    fontSize: responsiveFont(11),
    textAlign: "center",
    fontWeight: "600",
  },
  successBox: {
    padding: 10,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.NeonEmerald,
    marginBottom: 10,
  },
  successText: {
    color: Colors.NeonEmerald,
    fontSize: responsiveFont(11),
    textAlign: "center",
    fontWeight: "600",
  },
});
