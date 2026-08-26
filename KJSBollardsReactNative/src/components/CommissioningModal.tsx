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
import { Site } from "../types";

interface Props {
  visible: boolean;
  sites: Site[];
  onClose: () => void;
  onSuccess: () => void;
}

export const CommissioningModal: React.FC<Props> = ({
  visible,
  sites,
  onClose,
  onSuccess,
}) => {
  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id || "");
  const [name, setName] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [movementSeconds, setMovementSeconds] = useState("4.5");
  const [safetyInput, setSafetyInput] = useState("1");
  const [requireSafety, setRequireSafety] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleCommission = async () => {
    if (!name.trim() || !deviceCode.trim() || !selectedSiteId) {
      Alert.alert("Validation Error", "Please fill in site, name and device serial number.");
      return;
    }

    setLoading(true);
    try {
      // Clean serial if pasted from QR code e.g. "DCE:RC8FF976FA-C7880B64"
      const cleanSerial = deviceCode.replace(/^DCE:/i, "").trim();

      await api.commissionBollard({
        siteId: selectedSiteId,
        name: name.trim(),
        deviceCode: cleanSerial,
        movementSeconds: parseFloat(movementSeconds) || 4.5,
        raiseRelay: 1,
        lowerRelay: 2,
        stopRelay: 3,
        safetyInput: parseInt(safetyInput, 10) || 1,
        requireSafetyInput: requireSafety,
      });

      Alert.alert("Success", `Bollard "${name}" commissioned successfully!`);
      setName("");
      setDeviceCode("");
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert("Commissioning Failed", err.message || "Could not register bollard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Commission GateLink Bollard</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Select Target Site</Text>
            <View style={styles.siteSelector}>
              {sites.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.siteChip, selectedSiteId === s.id && styles.siteChipActive]}
                  onPress={() => setSelectedSiteId(s.id)}
                >
                  <Text style={[styles.siteChipText, selectedSiteId === s.id && styles.siteChipTextActive]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Bollard Name / Position</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. North Gate Main Entry"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>RC200 Serial Number (DCE: Code)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. RCA5B1A41C-DAD0B7E7"
              placeholderTextColor={colors.textSecondary}
              value={deviceCode}
              onChangeText={setDeviceCode}
              autoCapitalize="characters"
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Movement Duration (s)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={movementSeconds}
                  onChangeText={setMovementSeconds}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Safety Input Pin</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={safetyInput}
                  onChangeText={setSafetyInput}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setRequireSafety(!requireSafety)}
            >
              <View style={[styles.checkbox, requireSafety && styles.checkboxActive]}>
                {requireSafety && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.toggleLabel}>Enforce Safety Interlock Loop</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleCommission}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Register & Commission Device</Text>
              )}
            </TouchableOpacity>
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
    marginBottom: 20,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: "700",
  },
  body: {
    marginBottom: 20,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#0d1117",
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 15,
    marginBottom: 16,
  },
  siteSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  siteChip: {
    backgroundColor: "#21262d",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  siteChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  siteChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  siteChipTextActive: {
    color: "#fff",
  },
  row: {
    flexDirection: "row",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#484f58",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  toggleLabel: {
    color: "#c9d1d9",
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
