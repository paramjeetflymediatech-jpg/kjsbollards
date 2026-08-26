import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { colors } from "../theme/colors";
import { api } from "../api/client";
import { Bollard } from "../types";

interface Props {
  visible: boolean;
  bollard: Bollard | null;
  onClose: () => void;
}

export const HardwareConfigModal: React.FC<Props> = ({
  visible,
  bollard,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"io" | "barrier" | "system">("io");
  
  // IO NO/NC configs (0=NO, 1=NC)
  const [inModes, setInModes] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [outModes, setOutModes] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  
  // Barrier configs
  const [openSpeed, setOpenSpeed] = useState("85");
  const [closeSpeed, setCloseSpeed] = useState("80");
  const [decelAngle, setDecelAngle] = useState("35");
  const [obstacleSensitivity, setObstacleSensitivity] = useState("50");

  const [saving, setSaving] = useState(false);

  if (!bollard) return null;

  const toggleInMode = (index: number) => {
    const next = [...inModes] as [number, number, number, number];
    next[index] = next[index] === 0 ? 1 : 0;
    setInModes(next);
  };

  const toggleOutMode = (index: number) => {
    const next = [...outModes] as [number, number, number, number];
    next[index] = next[index] === 0 ? 1 : 0;
    setOutModes(next);
  };

  const handleSaveIo = async () => {
    setSaving(true);
    try {
      await api.setIoConfig(bollard.id, { in: inModes, out: outModes });
      Alert.alert("Success", "I/O Terminal NO/NC configuration applied to controller.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update I/O configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBarrier = async () => {
    setSaving(true);
    try {
      await api.setBarrierConfig(bollard.id, {
        barrierType: "zmt",
        funCode: "P-00",
        funVal: parseInt(openSpeed, 10) || 80,
      });
      await api.setBarrierConfig(bollard.id, {
        barrierType: "zmt",
        funCode: "P-01",
        funVal: parseInt(closeSpeed, 10) || 80,
      });
      Alert.alert("Success", "Barrier movement speed & dynamics written to controller.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to calibrate barrier.");
    } finally {
      setSaving(false);
    }
  };

  const handleReboot = async () => {
    Alert.alert(
      "Confirm Restart",
      `Are you sure you want to reboot the RC200 controller (${bollard.serial})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reboot Now",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            try {
              await api.rebootBollard(bollard.id);
              Alert.alert("Reboot Dispatched", "The controller is now restarting.");
              onClose();
            } catch (err: any) {
              Alert.alert("Reboot Failed", err.message);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Hardware & Protocol Config</Text>
              <Text style={styles.subtitle}>{bollard.name} ({bollard.serial})</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "io" && styles.tabActive]}
              onPress={() => setActiveTab("io")}
            >
              <Text style={[styles.tabText, activeTab === "io" && styles.tabTextActive]}>I/O Terminals</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "barrier" && styles.tabActive]}
              onPress={() => setActiveTab("barrier")}
            >
              <Text style={[styles.tabText, activeTab === "barrier" && styles.tabTextActive]}>Barrier Tuning</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "system" && styles.tabActive]}
              onPress={() => setActiveTab("system")}
            >
              <Text style={[styles.tabText, activeTab === "system" && styles.tabTextActive]}>System & OTA</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {activeTab === "io" && (
              <View>
                <Text style={styles.sectionHeading}>Digital Input Terminals (NO / NC)</Text>
                {["IN1 (Safety Loop)", "IN2 (Photocell Beam)", "IN3 (Push Button)", "IN4 (Aux Input)"].map((label, idx) => (
                  <View key={label} style={styles.terminalRow}>
                    <Text style={styles.terminalLabel}>{label}</Text>
                    <TouchableOpacity
                      style={[styles.modeToggle, inModes[idx] === 1 ? styles.modeNC : styles.modeNO]}
                      onPress={() => toggleInMode(idx)}
                    >
                      <Text style={styles.modeText}>{inModes[idx] === 1 ? "NC (Closed)" : "NO (Open)"}</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <Text style={[styles.sectionHeading, { marginTop: 20 }]}>Output Relays Logic</Text>
                {["Relay 1 (Raise)", "Relay 2 (Lower)", "Relay 3 (Stop)", "Relay 4 (Aux)"].map((label, idx) => (
                  <View key={label} style={styles.terminalRow}>
                    <Text style={styles.terminalLabel}>{label}</Text>
                    <TouchableOpacity
                      style={[styles.modeToggle, outModes[idx] === 1 ? styles.modeNC : styles.modeNO]}
                      onPress={() => toggleOutMode(idx)}
                    >
                      <Text style={styles.modeText}>{outModes[idx] === 1 ? "NC (Closed)" : "NO (Open)"}</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleSaveIo}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save I/O Logic</Text>}
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "barrier" && (
              <View>
                <Text style={styles.sectionHeading}>RS485 Barrier Control Dynamics</Text>
                
                <Text style={styles.inputLabel}>Open Speed (10 - 200)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={openSpeed}
                  onChangeText={setOpenSpeed}
                />

                <Text style={styles.inputLabel}>Close Speed (10 - 200)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={closeSpeed}
                  onChangeText={setCloseSpeed}
                />

                <Text style={styles.inputLabel}>Deceleration Angle (10 - 90 deg)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={decelAngle}
                  onChangeText={setDecelAngle}
                />

                <Text style={styles.inputLabel}>Obstacle Rebound Sensitivity (1 - 100)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={obstacleSensitivity}
                  onChangeText={setObstacleSensitivity}
                />

                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleSaveBarrier}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Write Barrier Parameters</Text>}
                </TouchableOpacity>
              </View>
            )}

            {activeTab === "system" && (
              <View>
                <Text style={styles.sectionHeading}>Device Operations & Maintenance</Text>
                
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Firmware Status</Text>
                  <Text style={styles.infoValue}>Up to date (v{bollard.fwVersion || "1.01"})</Text>
                  <Text style={[styles.infoLabel, { marginTop: 8 }]}>Hardware Platform</Text>
                  <Text style={styles.infoValue}>RC200 Wireless (v{bollard.hwVersion || "1.11"})</Text>
                </View>

                <TouchableOpacity
                  style={styles.rebootBtn}
                  onPress={handleReboot}
                  disabled={saving}
                >
                  <Text style={styles.rebootBtnText}>🔄 Restart Controller</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#161b22",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "#30363d",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: "700",
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#0d1117",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "#21262d",
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
  },
  body: {
    marginBottom: 20,
  },
  sectionHeading: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  terminalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0d1117",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#21262d",
  },
  terminalLabel: {
    color: "#c9d1d9",
    fontSize: 14,
    fontWeight: "500",
  },
  modeToggle: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  modeNO: {
    backgroundColor: "#238636",
  },
  modeNC: {
    backgroundColor: "#8957e5",
  },
  modeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    backgroundColor: "#0d1117",
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    fontSize: 14,
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: "#0d1117",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#30363d",
    marginBottom: 20,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: "uppercase",
  },
  infoValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  rebootBtn: {
    backgroundColor: "#da3633",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  rebootBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
