import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Site, Bollard } from "../types";
import { Colors } from "../theme/colors";
import { responsiveFont } from "../theme/responsive";
import { HardwareConnectModal } from "./HardwareConnectModal";

interface AddBollardModalProps {
  visible: boolean;
  sites: Site[];
  onClose: () => void;
  onAddBollard?: (siteId: string, bollard: Bollard) => void;
  onAdd?: (siteId: string, bollard: Bollard) => void;
}

export const AddBollardModal: React.FC<AddBollardModalProps> = ({
  visible,
  sites = [],
  onClose,
  onAddBollard,
  onAdd,
}) => {
  const [name, setName] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>(sites[0]?.id || "");
  const [safetyLoop, setSafetyLoop] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectModalVisible, setConnectModalVisible] = useState(false);

  // Check if serial already registered across any site
  const isSerialTaken = (serial: string): boolean => {
    const formatted = serial.trim().toUpperCase();
    return (sites || []).some((s) =>
      (s.bollards || []).some((b) => (b.serial || "").toUpperCase() === formatted)
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError("Please enter a bollard name / identifier.");
      return;
    }
    if (!deviceCode.trim()) {
      setError("Please enter the GateLink Hardware Device Code / Serial.");
      return;
    }

    const formattedSerial = deviceCode.trim().toUpperCase();

    // Security interlock: prevent unauthorized 3rd party re-claiming
    if (isSerialTaken(formattedSerial)) {
      setError(
        "Security Error: This GateLink Serial is already claimed by another owner. Ask the owner to add your email in 'Authorized Access Sharing'."
      );
      return;
    }

    const targetSiteId = selectedSiteId || sites[0]?.id || "site-1";

    const newBollard: Bollard = {
      id: "b-" + Date.now(),
      name: name.trim(),
      serial: formattedSerial,
      status: "RAISED",
      online: true,
      safetyOk: safetyLoop,
      lastSeen: "Just now",
      isClaimed: true,
    };

    const callback = onAddBollard || onAdd;
    if (callback) {
      callback(targetSiteId, newBollard);
    }

    // Reset fields
    setName("");
    setDeviceCode("");
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>CLAIM & PAIR NEW BOLLARD</Text>
              <Text style={styles.subtitle}>Registers hardware master serial to your account</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Security Notice */}
          <View style={styles.securityBox}>
            <Text style={styles.shieldIcon}>🛡️</Text>
            <Text style={styles.securityText}>
              <Text style={styles.boldText}>Anti-Theft Master Lock:</Text> Once claimed, no third party can
              control this device even if they know the serial number. To give access to family/staff, use
              the "Authorized Persons" tab.
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.formScroll}>
            {/* Bollard Name Input */}
            <Text style={styles.label}>BOLLARD NAME / LOCATION</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. North Gate Entry Barrier #3"
              placeholderTextColor={Colors.TextMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Device Serial / GateLink Code */}
            <Text style={styles.label}>GATELINK DEVICE SERIAL (HW ID)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. RC200-B7D4-09"
              placeholderTextColor={Colors.TextMuted}
              value={deviceCode}
              onChangeText={setDeviceCode}
              autoCapitalize="characters"
            />

            {/* Quick Auto-Detect via BLE / Wi-Fi button */}
            <TouchableOpacity
              style={styles.scanBleWifiBtn}
              onPress={() => setConnectModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.scanIconBadge}>
                <Text style={styles.scanIconEmoji}>📡</Text>
              </View>
              <View style={styles.scanTextWrap}>
                <Text style={styles.scanBleWifiTitle}>Auto-Detect Hardware</Text>
                <Text style={styles.scanBleWifiSubtitle}>Scan nearby Bluetooth & Wi-Fi controllers</Text>
              </View>
              <Text style={styles.scanArrow}>›</Text>
            </TouchableOpacity>

            {/* Target Site Selection */}
            <Text style={styles.label}>ASSIGN TO PERIMETER SITE</Text>
            <View style={styles.sitesPicker}>
              {sites.map((s) => {
                const isSelected = s.id === selectedSiteId;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.siteOption, isSelected && styles.siteOptionSelected]}
                    onPress={() => setSelectedSiteId(s.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.siteOptionText, isSelected && styles.siteOptionTextSelected]}
                      numberOfLines={1}
                    >
                      {s.name}
                    </Text>
                    {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Safety Interlock Check */}
            <TouchableOpacity
              style={styles.safetyRow}
              onPress={() => setSafetyLoop(!safetyLoop)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, safetyLoop && styles.checkboxChecked]}>
                {safetyLoop && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <View style={styles.safetyTextWrapper}>
                <Text style={styles.safetyTitle}>Safety Loop Interlock Enabled</Text>
                <Text style={styles.safetyDesc}>
                  Prevents raising if ground inductive loop detects a vehicle.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Error message */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>LOCK & REGISTER BOLLARD</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Hardware Connection (BLE & Wi-Fi) Modal */}
      <HardwareConnectModal
        visible={connectModalVisible}
        onClose={() => setConnectModalVisible(false)}
        onBollardPaired={(serial, autoName) => {
          setDeviceCode(serial);
          if (autoName && !name) setName(autoName);
          setConnectModalVisible(false);
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.SurfaceDark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: Colors.BorderGlow,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.SurfaceHighlight,
    paddingBottom: 10,
  },
  title: {
    fontSize: responsiveFont(13),
    fontWeight: "900",
    color: Colors.TextWhite,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: responsiveFont(10),
    color: Colors.ElectricCyan,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.SurfaceHighlight,
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(13),
    fontWeight: "bold",
  },
  securityBox: {
    flexDirection: "row",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    marginBottom: 10,
    alignItems: "flex-start",
  },
  shieldIcon: {
    fontSize: 15,
    marginRight: 8,
    marginTop: 1,
  },
  securityText: {
    fontSize: responsiveFont(10),
    color: Colors.TextWhite,
    flex: 1,
    lineHeight: 14,
  },
  boldText: {
    fontWeight: "800",
    color: Colors.NeonEmerald,
  },
  formScroll: {
    marginBottom: 10,
  },
  label: {
    fontSize: responsiveFont(10),
    fontWeight: "800",
    color: Colors.TextMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#131C2E",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    color: Colors.TextWhite,
    fontSize: responsiveFont(12),
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
    marginBottom: 6,
  },
  sitesPicker: {
    marginBottom: 8,
  },
  siteOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#131C2E",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
    marginBottom: 6,
  },
  siteOptionSelected: {
    borderColor: Colors.ElectricCyan,
    backgroundColor: "rgba(6, 182, 212, 0.1)",
  },
  siteOptionText: {
    fontSize: responsiveFont(11),
    color: Colors.TextMuted,
    fontWeight: "600",
    flex: 1,
  },
  siteOptionTextSelected: {
    color: Colors.TextWhite,
    fontWeight: "800",
  },
  checkIcon: {
    color: Colors.ElectricCyan,
    fontWeight: "900",
    fontSize: responsiveFont(12),
  },
  safetyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131C2E",
    padding: 10,
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.TextMuted,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: Colors.NeonEmerald,
    borderColor: Colors.NeonEmerald,
  },
  checkMark: {
    color: Colors.VoidBlack,
    fontSize: 12,
    fontWeight: "900",
  },
  safetyTextWrapper: {
    flex: 1,
  },
  safetyTitle: {
    fontSize: responsiveFont(11),
    fontWeight: "700",
    color: Colors.TextWhite,
  },
  safetyDesc: {
    fontSize: responsiveFont(9),
    color: Colors.TextMuted,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.CrimsonRed,
    marginBottom: 8,
  },
  errorText: {
    color: Colors.CrimsonRed,
    fontSize: responsiveFont(10),
    textAlign: "center",
    lineHeight: 14,
  },
  saveBtn: {
    backgroundColor: Colors.ElectricCyan,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: {
    color: Colors.VoidBlack,
    fontSize: responsiveFont(12),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  cancelBtn: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  cancelBtnText: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(11),
    fontWeight: "700",
  },
  scanBleWifiBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(6, 182, 212, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.35)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 14,
    gap: 10,
  },
  scanIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(6, 182, 212, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanIconEmoji: {
    fontSize: responsiveFont(14),
  },
  scanTextWrap: {
    flex: 1,
  },
  scanBleWifiTitle: {
    color: Colors.ElectricCyan,
    fontSize: responsiveFont(11),
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  scanBleWifiSubtitle: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(9),
    marginTop: 2,
  },
  scanArrow: {
    color: Colors.ElectricCyan,
    fontSize: responsiveFont(18),
    fontWeight: "700",
  },
});
