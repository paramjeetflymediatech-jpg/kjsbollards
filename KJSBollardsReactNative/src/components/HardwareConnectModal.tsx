import React, { useState, useEffect, useCallback } from "react";
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
import { Colors } from "../theme/colors";
import { responsiveFont } from "../theme/responsive";
import { bluetoothService, BleDevice, BleConnectionState } from "../services/bluetooth";
import {
  wifiProvisioningService,
  SoftApHotspot,
  WifiNetwork,
  ProvisioningStatus,
} from "../services/wifiProvisioning";
import { Movement } from "../types";

interface Props {
  visible: boolean;
  onClose: () => void;
  onBollardPaired?: (serial: string, name: string) => void;
}

export const HardwareConnectModal: React.FC<Props> = ({
  visible,
  onClose,
  onBollardPaired,
}) => {
  const [activeTab, setActiveTab] = useState<"bluetooth" | "wifi">("bluetooth");

  // Bluetooth State
  const [bleDevices, setBleDevices] = useState<BleDevice[]>([]);
  const [bleState, setBleState] = useState<BleConnectionState>("disconnected");
  const [connectedBle, setConnectedBle] = useState<BleDevice | null>(null);
  const [bleLatency, setBleLatency] = useState<number | null>(null);
  const [bleOperating, setBleOperating] = useState(false);

  // Wi-Fi State
  const [softAps, setSoftAps] = useState<SoftApHotspot[]>([]);
  const [selectedAp, setSelectedAp] = useState<SoftApHotspot | null>(null);
  const [wifiNetworks, setWifiNetworks] = useState<WifiNetwork[]>([]);
  const [selectedSsid, setSelectedSsid] = useState("");
  const [customSsid, setCustomSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [bollardName, setBollardName] = useState("");
  const [provisioningStatus, setProvisioningStatus] = useState<ProvisioningStatus>({
    step: "idle",
    progress: 0,
    message: "",
  });
  const [isScanningAps, setIsScanningAps] = useState(false);

  // Handle Wi-Fi AP Scan
  const handleScanAps = useCallback(async () => {
    setIsScanningAps(true);
    try {
      const aps = await wifiProvisioningService.scanForGateLinkAps();
      setSoftAps(aps);
      if (aps.length > 0 && !selectedAp) {
        setSelectedAp(aps[0]);
      }
      const nets = await wifiProvisioningService.scanTargetWifiNetworks();
      setWifiNetworks(nets);
      if (nets.length > 0 && !selectedSsid) {
        setSelectedSsid(nets[0].ssid);
      }
    } catch (err: any) {
      Alert.alert("Scan Error", err.message);
    } finally {
      setIsScanningAps(false);
    }
  }, [selectedAp, selectedSsid]);

  // Subscribe to BLE & Wi-Fi services
  useEffect(() => {
    const unsubBle = bluetoothService.subscribe((devices, state) => {
      setBleDevices(devices);
      setBleState(state);
      setConnectedBle(bluetoothService.getConnectedDevice());
    });

    const unsubWifi = wifiProvisioningService.subscribe((status) => {
      setProvisioningStatus(status);
    });

    return () => {
      unsubBle();
      unsubWifi();
    };
  }, []);

  // When opening modal, start BLE scan automatically
  useEffect(() => {
    if (visible && activeTab === "bluetooth") {
      bluetoothService.startScanning();
    } else if (visible && activeTab === "wifi") {
      handleScanAps();
    } else {
      bluetoothService.stopScanning();
    }
  }, [visible, activeTab, handleScanAps]);

  // Handle BLE Connection
  const handleConnectBle = async (device: BleDevice) => {
    try {
      await bluetoothService.connectToDevice(device.id);
      Alert.alert("BLE Connected", `Direct offline Bluetooth link established with ${device.name}.`);
    } catch (err: any) {
      Alert.alert("Connection Error", err.message || "Failed to pair via Bluetooth.");
    }
  };

  // Handle BLE Direct Command
  const handleSendBleCommand = async (action: Movement) => {
    setBleOperating(true);
    try {
      const res = await bluetoothService.sendBleCommand(action);
      setBleLatency(res.latencyMs);
    } catch (err: any) {
      Alert.alert("BLE Command Failed", err.message);
    } finally {
      setBleOperating(false);
    }
  };

  // Handle Provisioning Submit
  const handleStartProvisioning = async () => {
    const targetSsid = selectedSsid || customSsid.trim();
    if (!selectedAp) {
      Alert.alert("Validation Error", "Please select a GateLink controller setup hotspot.");
      return;
    }
    if (!targetSsid) {
      Alert.alert("Validation Error", "Please select or type your facility Wi-Fi network SSID.");
      return;
    }

    try {
      const result = await wifiProvisioningService.provisionWifi(
        selectedAp,
        targetSsid,
        wifiPassword,
        bollardName || `Bollard (${selectedAp.serial})`
      );

      Alert.alert(
        "Provisioning Successful",
        `Controller (${result.serial}) is now connected to Wi-Fi (${targetSsid}) and reporting live MQTT telemetry!`,
        [
          {
            text: "Done",
            onPress: () => {
              if (onBollardPaired) {
                onBollardPaired(result.serial, bollardName || `Bollard ${result.serial}`);
              }
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Provisioning Failed", err.message || "Failed to configure hardware Wi-Fi.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>CONNECT HARDWARE</Text>
              <Text style={styles.subtitle}>Direct Bluetooth (BLE) & Wi-Fi Provisioning</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "bluetooth" && styles.tabBtnActive]}
              onPress={() => setActiveTab("bluetooth")}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, activeTab === "bluetooth" && styles.tabBtnTextActive]}>
                📡 BLUETOOTH (BLE)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "wifi" && styles.tabBtnActive]}
              onPress={() => setActiveTab("wifi")}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, activeTab === "wifi" && styles.tabBtnTextActive]}>
                📶 WI-FI PROVISIONING
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.contentScroll}>
            {/* -------------------- BLUETOOTH TAB -------------------- */}
            {activeTab === "bluetooth" && (
              <View style={styles.tabContent}>
                {/* Active Connected Banner */}
                {connectedBle ? (
                  <View style={styles.connectedCard}>
                    <View style={styles.connectedHeader}>
                      <View style={styles.flexRow}>
                        <View style={[styles.pulseDot, { backgroundColor: Colors.NeonEmerald }]} />
                        <Text style={styles.connectedTitle}>{connectedBle.name}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.disconnectBtn}
                        onPress={() => bluetoothService.disconnect()}
                      >
                        <Text style={styles.disconnectText}>Disconnect</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.connectedSerial}>HW Serial: {connectedBle.serial}</Text>

                    <View style={styles.metricsRow}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>SIGNAL</Text>
                        <Text style={[styles.metricValue, { color: Colors.ElectricCyan }]}>
                          {connectedBle.rssi} dBm
                        </Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>DISTANCE</Text>
                        <Text style={[styles.metricValue, { color: Colors.IceBlue }]}>
                          ~{connectedBle.distanceMeters}m
                        </Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>BLE LATENCY</Text>
                        <Text style={[styles.metricValue, { color: Colors.NeonEmerald }]}>
                          {bleLatency ? `${bleLatency}ms` : "< 200ms"}
                        </Text>
                      </View>
                    </View>

                    {/* Direct Offline Controls */}
                    <Text style={styles.offlineControlLabel}>DIRECT OFFLINE BLUETOOTH CONTROLS</Text>
                    <View style={styles.bleControlRow}>
                      <TouchableOpacity
                        style={[styles.bleActionBtn, styles.bleRaiseBtn]}
                        onPress={() => handleSendBleCommand("raise")}
                        disabled={bleOperating}
                      >
                        <Text style={[styles.bleActionText, { color: Colors.ElectricCyan }]}>▲ RAISE</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.bleActionBtn, styles.bleLowerBtn]}
                        onPress={() => handleSendBleCommand("lower")}
                        disabled={bleOperating}
                      >
                        <Text style={[styles.bleActionText, { color: Colors.CyberAmber }]}>▼ LOWER</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.bleActionBtn, styles.bleStopBtn]}
                        onPress={() => handleSendBleCommand("stop")}
                        disabled={bleOperating}
                      >
                        <Text style={[styles.bleActionText, { color: Colors.CrimsonRed }]}>■ STOP</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Quick Wi-Fi Setup Button */}
                    <TouchableOpacity
                      style={styles.bleWifiSetupBtn}
                      onPress={() => {
                        setActiveTab("wifi");
                        if (connectedBle) {
                          setBollardName(connectedBle.name);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.bleWifiSetupIcon}>📶</Text>
                      <View style={styles.bleWifiSetupTextCol}>
                        <Text style={styles.bleWifiSetupTitle}>Connect {connectedBle.name} to Wi-Fi</Text>
                        <Text style={styles.bleWifiSetupSubtitle}>Enable remote internet control from anywhere</Text>
                      </View>
                      <Text style={styles.bleWifiSetupArrow}>➔</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.scanningBanner}>
                    <View style={styles.scanInfo}>
                      <ActivityIndicator size="small" color={Colors.ElectricCyan} />
                      <Text style={styles.scanText}>Scanning for nearby GateLink BLE peripherals...</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.refreshScanBtn}
                      onPress={() => bluetoothService.startScanning()}
                    >
                      <Text style={styles.refreshScanText}>Rescan</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Discovered Peripherals List */}
                <Text style={styles.sectionTitle}>NEARBY DISCOVERED HARDWARE ({bleDevices.length})</Text>

                {bleDevices.length === 0 ? (
                  <View style={styles.emptyBleBox}>
                    <Text style={styles.emptyBleIcon}>📡</Text>
                    <Text style={styles.emptyBleText}>No GateLink BLE controllers in range.</Text>
                    <Text style={styles.emptyBleSubtext}>
                      Ensure the RC200 controller is powered and within 15 meters.
                    </Text>
                  </View>
                ) : (
                  bleDevices.map((dev) => {
                    const isConnected = connectedBle?.id === dev.id;
                    const signalBar = dev.rssi > -60 ? "●●●●" : dev.rssi > -75 ? "●●●○" : "●●○○";

                    return (
                      <View key={dev.id} style={[styles.bleCard, isConnected && styles.bleCardActive]}>
                        <View style={styles.bleCardLeft}>
                          <Text style={styles.bleDeviceName}>{dev.name}</Text>
                          <Text style={styles.bleDeviceSerial}>{dev.serial}</Text>
                          <View style={styles.bleMetaRow}>
                            <Text style={styles.bleRssiText}>
                              {signalBar} {dev.rssi} dBm (~{dev.distanceMeters}m)
                            </Text>
                            <Text style={[styles.bleStatusBadge, { color: Colors.NeonEmerald }]}>
                              {dev.status}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[styles.blePairBtn, isConnected && styles.blePairBtnConnected]}
                          onPress={() => handleConnectBle(dev)}
                          disabled={isConnected || bleState === "connecting"}
                        >
                          <Text style={styles.blePairBtnText}>
                            {isConnected ? "Linked ✓" : "Pair BLE"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* -------------------- WI-FI PROVISIONING TAB -------------------- */}
            {activeTab === "wifi" && (
              <View style={styles.tabContent}>
                {/* Step 1: Select Controller SoftAP */}
                <Text style={styles.sectionTitle}>STEP 1: SELECT GATELINK SETUP HOTSPOT (SOFTAP)</Text>
                {isScanningAps ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={Colors.ElectricCyan} />
                    <Text style={styles.loadingText}>Searching for SoftAP setup broadcasts...</Text>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    {softAps.map((ap) => {
                      const isSelected = selectedAp?.serial === ap.serial;
                      return (
                        <TouchableOpacity
                          key={ap.serial}
                          style={[styles.apChip, isSelected && styles.apChipActive]}
                          onPress={() => setSelectedAp(ap)}
                        >
                          <Text style={[styles.apChipSsid, isSelected && styles.apChipSsidActive]}>
                            {ap.ssid}
                          </Text>
                          <Text style={styles.apChipSerial}>{ap.serial}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Step 2: Target Wi-Fi Credentials */}
                <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
                  STEP 2: TARGET WI-FI NETWORK (2.4 GHz)
                </Text>

                {wifiNetworks.length > 0 && (
                  <>
                    <Text style={styles.inputLabel}>AVAILABLE WI-FI NETWORKS</Text>
                    <View style={styles.networksList}>
                      {wifiNetworks.map((net) => {
                        const isSelected = selectedSsid === net.ssid;
                        return (
                          <TouchableOpacity
                            key={net.ssid}
                            style={[styles.networkRow, isSelected && styles.networkRowActive]}
                            onPress={() => {
                              setSelectedSsid(net.ssid);
                              setCustomSsid("");
                            }}
                          >
                            <Text style={[styles.networkSsid, isSelected && styles.networkSsidActive]}>
                              📶 {net.ssid}
                            </Text>
                            <Text style={styles.networkSecurity}>{net.isSecured ? "🔒 WPA2/3" : "Open"}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* Custom SSID Input */}
                <Text style={styles.inputLabel}>
                  {wifiNetworks.length > 0 ? "OR ENTER MANUAL SSID" : "TARGET FACILITY WI-FI SSID"}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. MyHome-2.4G-WLAN"
                  placeholderTextColor={Colors.TextMuted}
                  value={customSsid}
                  onChangeText={(val) => {
                    setCustomSsid(val);
                    setSelectedSsid("");
                  }}
                />

                {/* Password Input */}
                <Text style={styles.inputLabel}>WI-FI PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Wi-Fi network password"
                  placeholderTextColor={Colors.TextMuted}
                  secureTextEntry
                  value={wifiPassword}
                  onChangeText={setWifiPassword}
                />

                {/* Bollard Friendly Name */}
                <Text style={styles.inputLabel}>BOLLARD IDENTIFIER NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. North Gate Barrier #1"
                  placeholderTextColor={Colors.TextMuted}
                  value={bollardName}
                  onChangeText={setBollardName}
                />

                {/* Provisioning Progress */}
                {provisioningStatus.step !== "idle" && (
                  <View style={styles.progressBox}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${provisioningStatus.progress}%` },
                          provisioningStatus.step === "error" && { backgroundColor: Colors.CrimsonRed },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressMessage}>{provisioningStatus.message}</Text>
                  </View>
                )}

                {/* Start Provisioning Button */}
                <TouchableOpacity
                  style={[
                    styles.provisionBtn,
                    provisioningStatus.step !== "idle" &&
                      provisioningStatus.step !== "completed" &&
                      provisioningStatus.step !== "error" &&
                      styles.provisionBtnDisabled,
                  ]}
                  onPress={handleStartProvisioning}
                  disabled={
                    provisioningStatus.step !== "idle" &&
                    provisioningStatus.step !== "completed" &&
                    provisioningStatus.step !== "error"
                  }
                  activeOpacity={0.8}
                >
                  <Text style={styles.provisionBtnText}>
                    {provisioningStatus.step !== "idle" &&
                    provisioningStatus.step !== "completed" &&
                    provisioningStatus.step !== "error"
                      ? "PROVISIONING CONTROLLER..."
                      : "⚡ SEND WI-FI CREDENTIALS"}
                  </Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.DarkBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: Colors.BorderGlow,
    maxHeight: "90%",
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.SurfaceHighlight,
  },
  title: {
    color: Colors.TextWhite,
    fontSize: responsiveFont(18),
    fontWeight: "800",
    letterSpacing: 1,
  },
  subtitle: {
    color: Colors.ElectricCyan,
    fontSize: responsiveFont(12),
    marginTop: 2,
    fontWeight: "600",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.SurfaceDark,
  },
  closeText: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(16),
    fontWeight: "700",
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: Colors.VoidBlack,
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 9,
    backgroundColor: "transparent",
  },
  tabBtnActive: {
    backgroundColor: Colors.ElectricCyan,
  },
  tabBtnText: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(11),
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tabBtnTextActive: {
    color: Colors.VoidBlack,
    fontWeight: "900",
  },
  contentScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tabContent: {
    paddingBottom: 30,
  },
  sectionTitle: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(11),
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 10,
  },
  scanningBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.3)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  scanInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  scanText: {
    color: Colors.TextWhite,
    fontSize: responsiveFont(12),
    fontWeight: "600",
  },
  refreshScanBtn: {
    backgroundColor: Colors.ElectricCyan,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshScanText: {
    color: Colors.VoidBlack,
    fontSize: responsiveFont(11),
    fontWeight: "800",
  },
  connectedCard: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  connectedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  flexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connectedTitle: {
    color: Colors.TextWhite,
    fontSize: responsiveFont(14),
    fontWeight: "700",
  },
  connectedSerial: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(12),
    marginTop: 4,
    fontFamily: "monospace",
  },
  disconnectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: 6,
  },
  disconnectText: {
    color: Colors.CrimsonRed,
    fontSize: responsiveFont(11),
    fontWeight: "700",
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  metricItem: {
    alignItems: "center",
  },
  metricLabel: {
    color: Colors.TextSubtle,
    fontSize: responsiveFont(9),
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: responsiveFont(13),
    fontWeight: "800",
    marginTop: 2,
  },
  offlineControlLabel: {
    color: Colors.NeonEmerald,
    fontSize: responsiveFont(10),
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 14,
    textAlign: "center",
  },
  bleControlRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  bleActionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  bleRaiseBtn: {
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    borderColor: Colors.ElectricCyan,
  },
  bleLowerBtn: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: Colors.CyberAmber,
  },
  bleStopBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: Colors.CrimsonRed,
  },
  bleActionText: {
    fontSize: responsiveFont(12),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  bleCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.SurfaceDark,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  bleCardActive: {
    borderColor: Colors.ElectricCyan,
    backgroundColor: "rgba(6, 182, 212, 0.08)",
  },
  bleCardLeft: {
    flex: 1,
  },
  bleDeviceName: {
    color: Colors.TextWhite,
    fontSize: responsiveFont(13),
    fontWeight: "700",
  },
  bleDeviceSerial: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(11),
    marginTop: 2,
    fontFamily: "monospace",
  },
  bleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  bleRssiText: {
    color: Colors.IceBlue,
    fontSize: responsiveFont(11),
    fontWeight: "600",
  },
  bleStatusBadge: {
    fontSize: responsiveFont(10),
    fontWeight: "800",
  },
  blePairBtn: {
    backgroundColor: Colors.SurfaceHighlight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  blePairBtnConnected: {
    backgroundColor: Colors.NeonEmerald,
  },
  blePairBtnText: {
    color: Colors.TextWhite,
    fontSize: responsiveFont(11),
    fontWeight: "700",
  },
  emptyBleBox: {
    alignItems: "center",
    padding: 24,
    backgroundColor: Colors.SurfaceDark,
    borderRadius: 14,
  },
  emptyBleIcon: {
    fontSize: responsiveFont(32),
    marginBottom: 8,
  },
  emptyBleText: {
    color: Colors.TextWhite,
    fontSize: responsiveFont(14),
    fontWeight: "700",
  },
  emptyBleSubtext: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(11),
    textAlign: "center",
    marginTop: 4,
  },
  chipScroll: {
    flexDirection: "row",
    marginBottom: 12,
  },
  apChip: {
    backgroundColor: Colors.SurfaceDark,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  apChipActive: {
    borderColor: Colors.ElectricCyan,
    backgroundColor: "rgba(6, 182, 212, 0.15)",
  },
  apChipSsid: {
    color: Colors.TextWhite,
    fontSize: responsiveFont(12),
    fontWeight: "700",
  },
  apChipSsidActive: {
    color: Colors.ElectricCyan,
  },
  apChipSerial: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(10),
    marginTop: 2,
    fontFamily: "monospace",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(12),
  },
  inputLabel: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(10),
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  networksList: {
    backgroundColor: Colors.SurfaceDark,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 8,
  },
  networkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  networkRowActive: {
    backgroundColor: "rgba(6, 182, 212, 0.15)",
  },
  networkSsid: {
    color: Colors.TextWhite,
    fontSize: responsiveFont(12),
    fontWeight: "600",
  },
  networkSsidActive: {
    color: Colors.ElectricCyan,
    fontWeight: "700",
  },
  networkSecurity: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(10),
  },
  input: {
    backgroundColor: Colors.SurfaceDark,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
    color: Colors.TextWhite,
    fontSize: responsiveFont(13),
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  progressBox: {
    marginTop: 14,
    backgroundColor: Colors.SurfaceDark,
    padding: 12,
    borderRadius: 10,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.NeonEmerald,
  },
  progressMessage: {
    color: Colors.TextWhite,
    fontSize: responsiveFont(11),
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
  provisionBtn: {
    backgroundColor: Colors.ElectricCyan,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  provisionBtnDisabled: {
    opacity: 0.6,
  },
  provisionBtnText: {
    color: Colors.VoidBlack,
    fontSize: responsiveFont(13),
    fontWeight: "800",
    letterSpacing: 1,
  },
  bleWifiSetupBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 229, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.3)",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  bleWifiSetupIcon: {
    fontSize: responsiveFont(20),
    marginRight: 10,
  },
  bleWifiSetupTextCol: {
    flex: 1,
  },
  bleWifiSetupTitle: {
    color: Colors.ElectricCyan,
    fontSize: responsiveFont(13),
    fontWeight: "700",
  },
  bleWifiSetupSubtitle: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(10.5),
    marginTop: 2,
  },
  bleWifiSetupArrow: {
    color: Colors.ElectricCyan,
    fontSize: responsiveFont(16),
    fontWeight: "bold",
    marginLeft: 8,
  },
});
