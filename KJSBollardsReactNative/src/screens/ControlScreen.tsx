import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Bollard, Movement, BollardDiagnostics } from "../types";
import { Colors } from "../theme/colors";
import { responsiveFont } from "../theme/responsive";
import { HydraulicBollard } from "../components/HydraulicBollard";
import { HardwareConfigModal } from "../components/HardwareConfigModal";
import { HardwareConnectModal } from "../components/HardwareConnectModal";
import { bluetoothService, BleDevice } from "../services/bluetooth";
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
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [bleDevice, setBleDevice] = useState<BleDevice | null>(null);
  const [diagnostics, setDiagnostics] = useState<BollardDiagnostics | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);

  useEffect(() => {
    const unsub = bluetoothService.subscribe(() => {
      setBleDevice(bluetoothService.getConnectedDevice());
    });
    return unsub;
  }, []);

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

      {/* Sleek Hardware Connectivity Segment */}
      <View style={styles.connPillContainer}>
        {/* Bluetooth Segment */}
        <TouchableOpacity
          style={[
            styles.connPillBtn,
            bleDevice ? styles.connPillBleActive : styles.connPillInactive,
          ]}
          onPress={() => setConnectModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.pillDot, { backgroundColor: bleDevice ? Colors.NeonEmerald : "#64748b" }]} />
          <Text style={styles.pillIcon}>📡</Text>
          <Text style={[styles.pillText, bleDevice ? styles.pillTextBleActive : null]} numberOfLines={1}>
            {bleDevice ? `BLE Linked (~${bleDevice.distanceMeters}m)` : "BLE Offline"}
          </Text>
        </TouchableOpacity>

        <View style={styles.pillDivider} />

        {/* Wi-Fi Segment */}
        <TouchableOpacity
          style={[
            styles.connPillBtn,
            signal > 0 ? styles.connPillWifiActive : styles.connPillInactive,
          ]}
          onPress={() => setConnectModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.pillDot, { backgroundColor: signal > 0 ? Colors.ElectricCyan : Colors.CyberAmber }]} />
          <Text style={styles.pillIcon}>📶</Text>
          <Text style={[styles.pillText, signal > 0 ? styles.pillTextWifiActive : null]} numberOfLines={1}>
            {signal > 0 ? `Wi-Fi Online` : "Setup Wi-Fi"}
          </Text>
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
              styles.raiseCardBtn,
              (!bollard.online || !bollard.safetyOk || isMoving) && styles.disabledBtn,
            ]}
            onPress={() => onCommand("raise")}
            disabled={!bollard.online || !bollard.safetyOk || isMoving}
            activeOpacity={0.8}
          >
            <View style={styles.raiseIconCircle}>
              <Text style={styles.raiseIconArrow}>▲</Text>
            </View>
            <Text style={styles.actionBtnTitle}>RAISE</Text>
            <Text style={styles.actionBtnSubtitle}>Extend Barrier</Text>
          </TouchableOpacity>

          {/* LOWER Button */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.lowerCardBtn,
              (!bollard.online || !bollard.safetyOk || isMoving) && styles.disabledBtn,
            ]}
            onPress={() => onCommand("lower")}
            disabled={!bollard.online || !bollard.safetyOk || isMoving}
            activeOpacity={0.8}
          >
            <View style={styles.lowerIconCircle}>
              <Text style={styles.lowerIconArrow}>▼</Text>
            </View>
            <Text style={styles.actionBtnTitle}>LOWER</Text>
            <Text style={styles.actionBtnSubtitle}>Retract Barrier</Text>
          </TouchableOpacity>
        </View>

        {/* EMERGENCY STOP BUTTON */}
        <TouchableOpacity
          style={styles.stopCardBtn}
          onPress={() => onCommand("stop")}
          activeOpacity={0.85}
        >
          <View style={styles.stopIconCircle}>
            <Text style={styles.stopIconText}>🛑</Text>
          </View>
          <View style={styles.stopTextCol}>
            <Text style={styles.stopMainTitle}>EMERGENCY STOP</Text>
            <Text style={styles.stopSubTitle}>Instant Hydraulic Safety Halt</Text>
          </View>
          <View style={styles.stopPulseBadge}>
            <Text style={styles.stopPulseText}>HALT</Text>
          </View>
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

      {/* Hardware Connectivity (BLE & Wi-Fi) Modal */}
      <HardwareConnectModal
        visible={connectModalVisible}
        onClose={() => {
          setConnectModalVisible(false);
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
  connPillContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.SurfaceCard,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: Colors.CardBorder,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  connPillBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 20,
    gap: 6,
  },
  connPillBleActive: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  connPillWifiActive: {
    backgroundColor: "rgba(6, 182, 212, 0.12)",
  },
  connPillInactive: {
    backgroundColor: "transparent",
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillIcon: {
    fontSize: responsiveFont(11),
  },
  pillText: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(10),
    fontWeight: "700",
  },
  pillTextBleActive: {
    color: Colors.NeonEmerald,
    fontWeight: "800",
  },
  pillTextWifiActive: {
    color: Colors.ElectricCyan,
    fontWeight: "800",
  },
  pillDivider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 2,
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
    backgroundColor: Colors.SurfaceCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.CardBorder,
    overflow: "hidden",
    marginBottom: 14,
  },
  telemetryCard: {
    flexDirection: "row",
    backgroundColor: Colors.SurfaceCard,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.CardBorder,
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
    backgroundColor: "rgba(255, 255, 255, 0.08)",
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
    backgroundColor: Colors.SurfaceCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.CardBorder,
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
    marginTop: 8,
  },
  splitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  actionBtn: {
    flex: 0.48,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  raiseCardBtn: {
    backgroundColor: "rgba(6, 182, 212, 0.12)",
    borderColor: Colors.ElectricCyan,
  },
  lowerCardBtn: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: Colors.CyberAmber,
  },
  disabledBtn: {
    opacity: 0.35,
  },
  raiseIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.ElectricCyan,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  lowerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.CyberAmber,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  raiseIconArrow: {
    color: Colors.VoidBlack,
    fontSize: responsiveFont(15),
    fontWeight: "900",
  },
  lowerIconArrow: {
    color: Colors.VoidBlack,
    fontSize: responsiveFont(15),
    fontWeight: "900",
  },
  actionBtnTitle: {
    fontSize: responsiveFont(14),
    fontWeight: "900",
    letterSpacing: 1,
    color: Colors.TextWhite,
  },
  actionBtnSubtitle: {
    fontSize: responsiveFont(9),
    fontWeight: "700",
    color: Colors.TextMuted,
    marginTop: 2,
  },
  stopCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.14)",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.CrimsonRed,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  stopIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(239, 68, 68, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stopIconText: {
    fontSize: responsiveFont(18),
  },
  stopTextCol: {
    flex: 1,
  },
  stopMainTitle: {
    color: Colors.CrimsonRed,
    fontSize: responsiveFont(13),
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  stopSubTitle: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(9),
    marginTop: 1,
    fontWeight: "600",
  },
  stopPulseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.CrimsonRed,
  },
  stopPulseText: {
    color: Colors.TextWhite,
    fontSize: responsiveFont(9),
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
