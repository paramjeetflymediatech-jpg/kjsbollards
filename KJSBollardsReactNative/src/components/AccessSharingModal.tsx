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
import { Site, AuthorizedUser } from "../types";
import { Colors } from "../theme/colors";
import { responsiveFont } from "../theme/responsive";

interface AccessSharingModalProps {
  visible: boolean;
  sites: Site[];
  onClose: () => void;
  onGrantAccess: (siteId: string, user: AuthorizedUser) => void;
  onRevokeAccess: (siteId: string, userId: string) => void;
}

export const AccessSharingModal: React.FC<AccessSharingModalProps> = ({
  visible,
  sites,
  onClose,
  onGrantAccess,
  onRevokeAccess,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(sites[0]?.id || "1");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"family" | "staff" | "viewer">("family");
  const [selectedBollardIds, setSelectedBollardIds] = useState<string[]>([]);
  const [allGates, setAllGates] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSite = sites.find((s) => s.id === selectedSiteId) || sites[0];
  const authorizedList = selectedSite?.authorizedUsers || [];
  const siteBollards = selectedSite?.bollards || [];

  const toggleBollardSelection = (bId: string) => {
    if (selectedBollardIds.includes(bId)) {
      setSelectedBollardIds(selectedBollardIds.filter((id) => id !== bId));
    } else {
      setSelectedBollardIds([...selectedBollardIds, bId]);
    }
  };

  const handleAdd = () => {
    if (!name.trim()) {
      setError("Please enter the person's name (e.g. Sarah / Jane).");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!allGates && selectedBollardIds.length === 0) {
      setError("Please select at least one specific gate (e.g. Main Entrance).");
      return;
    }

    const newUser: AuthorizedUser = {
      id: "auth-" + Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      addedAt: "Just now",
      bollardIds: allGates ? [] : selectedBollardIds,
    };

    onGrantAccess(selectedSiteId, newUser);
    setName("");
    setEmail("");
    setSelectedBollardIds([]);
    setAllGates(false);
    setError(null);
    setShowAddForm(false);
  };

  const getBollardNames = (bIds: string[], site: Site) => {
    if (!bIds || bIds.length === 0) return "All Site Gates";
    return bIds
      .map((id) => site.bollards.find((b) => b.id === id)?.name || id)
      .join(", ");
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
              <Text style={styles.title}>GRANULAR ACCESS SHARING</Text>
              <Text style={styles.subtitle}>Authorize specific gates & areas per person</Text>
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
            <Text style={styles.shieldIcon}>🔒</Text>
            <Text style={styles.securityText}>
              <Text style={styles.boldText}>Area-Restricted Access:</Text> Authorized persons will
              ONLY see and control the gates you specifically check below (e.g. Main Entrance only).
            </Text>
          </View>

          {/* Site Selector Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.siteTabsScroll}>
            {sites.map((s) => {
              const isSelected = s.id === selectedSiteId;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.siteTab, isSelected && styles.siteTabSelected]}
                  onPress={() => {
                    setSelectedSiteId(s.id);
                    setSelectedBollardIds([]);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.siteTabText, isSelected && styles.siteTabTextSelected]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.listScroll}>
            {/* List of Authorized Users */}
            <View style={styles.listHeaderRow}>
              <Text style={styles.sectionHeader}>AUTHORIZED PERSONS ({authorizedList.length})</Text>
              {!showAddForm && (
                <TouchableOpacity
                  style={styles.addTriggerBtn}
                  onPress={() => setShowAddForm(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addTriggerText}>＋ GRANT GATE ACCESS</Text>
                </TouchableOpacity>
              )}
            </View>

            {authorizedList.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No additional users authorized for this site yet.</Text>
                <Text style={styles.emptySubtext}>
                  Tap "GRANT GATE ACCESS" to assign specific gates (e.g. Main Entrance) to family or staff.
                </Text>
              </View>
            ) : (
              authorizedList.map((u) => (
                <View key={u.id} style={styles.userCard}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.avatarLetter}>{u.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{u.name}</Text>
                    <Text style={styles.userEmail}>{u.email}</Text>
                    
                    {/* Specific Gates Assigned Badge */}
                    <View style={styles.gateScopeBadge}>
                      <Text style={styles.gateScopeLabel}>PERMITTED GATES:</Text>
                      <Text style={styles.gateScopeNames} numberOfLines={2}>
                        {getBollardNames(u.bollardIds, selectedSite)}
                      </Text>
                    </View>

                    <View style={styles.roleTag}>
                      <Text style={styles.roleTagText}>
                        {u.role === "family" ? "FAMILY / SPOUSE" : u.role.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.revokeBtn}
                    onPress={() => onRevokeAccess(selectedSiteId, u.id)}
                    activeOpacity={0.8}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.revokeText}>REVOKE</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Add User Form Drawer */}
            {showAddForm && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>AUTHORIZE PERSON FOR SPECIFIC GATES</Text>
                <Text style={styles.formSubtitle}>
                  Choose which entrance/gate areas this person is allowed to operate.
                </Text>

                <Text style={styles.label}>FULL NAME / RELATION</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Sarah (Wife) or Driver / Visitor"
                  placeholderTextColor={Colors.TextMuted}
                  value={name}
                  onChangeText={setName}
                />

                <Text style={styles.label}>THEIR EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. sarah@example.com"
                  placeholderTextColor={Colors.TextMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                {/* Specific Gate Selection Checkboxes */}
                <Text style={styles.label}>PERMITTED AREAS / GATES</Text>
                
                <TouchableOpacity
                  style={[styles.gateCheckboxRow, allGates && styles.gateCheckboxRowSelected]}
                  onPress={() => setAllGates(!allGates)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, allGates && styles.checkboxChecked]}>
                    {allGates && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <View style={styles.gateTextCol}>
                    <Text style={[styles.gateTitle, allGates && styles.gateTitleSelected]}>
                      All Gates in {selectedSite.name}
                    </Text>
                  </View>
                </TouchableOpacity>

                {!allGates &&
                  siteBollards.map((b) => {
                    const isChecked = selectedBollardIds.includes(b.id);
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[styles.gateCheckboxRow, isChecked && styles.gateCheckboxRowSelected]}
                        onPress={() => toggleBollardSelection(b.id)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                          {isChecked && <Text style={styles.checkMark}>✓</Text>}
                        </View>
                        <View style={styles.gateTextCol}>
                          <Text style={[styles.gateTitle, isChecked && styles.gateTitleSelected]}>
                            {b.name}
                          </Text>
                          <Text style={styles.gateSub}>{b.serial || "RC200"}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                <Text style={styles.label}>ACCESS ROLE</Text>
                <View style={styles.roleSelector}>
                  {(["family", "staff", "viewer"] as const).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleOption, role === r && styles.roleOptionSelected]}
                      onPress={() => setRole(r)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.roleText, role === r && styles.roleTextSelected]}>
                        {r === "family" ? "Family (Raise/Lower)" : r === "staff" ? "Staff Operator" : "View Only"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity style={styles.submitBtn} onPress={handleAdd} activeOpacity={0.85}>
                  <Text style={styles.submitBtnText}>CONFIRM & GRANT AREA ACCESS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowAddForm(false);
                    setError(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.SurfaceDark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "88%",
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
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.3)",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  shieldIcon: {
    fontSize: 16,
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
    color: Colors.ElectricCyan,
  },
  siteTabsScroll: {
    marginBottom: 12,
    maxHeight: 38,
  },
  siteTab: {
    backgroundColor: "#131C2E",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
  },
  siteTabSelected: {
    borderColor: Colors.ElectricCyan,
    backgroundColor: "rgba(6, 182, 212, 0.2)",
  },
  siteTabText: {
    fontSize: responsiveFont(11),
    color: Colors.TextMuted,
    fontWeight: "700",
  },
  siteTabTextSelected: {
    color: Colors.TextWhite,
  },
  listScroll: {
    marginBottom: 10,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: responsiveFont(10),
    fontWeight: "800",
    color: Colors.TextMuted,
    letterSpacing: 0.5,
  },
  addTriggerBtn: {
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    borderWidth: 1,
    borderColor: Colors.ElectricCyan,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addTriggerText: {
    color: Colors.ElectricCyan,
    fontSize: responsiveFont(10),
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: "#131C2E",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
  },
  emptyText: {
    fontSize: responsiveFont(12),
    fontWeight: "700",
    color: Colors.TextWhite,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: responsiveFont(10),
    color: Colors.TextMuted,
    textAlign: "center",
    marginTop: 4,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#131C2E",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
    marginBottom: 8,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(6, 182, 212, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 2,
  },
  avatarLetter: {
    fontSize: responsiveFont(14),
    fontWeight: "900",
    color: Colors.ElectricCyan,
  },
  userInfo: {
    flex: 1,
    paddingRight: 6,
  },
  userName: {
    fontSize: responsiveFont(13),
    fontWeight: "800",
    color: Colors.TextWhite,
  },
  userEmail: {
    fontSize: responsiveFont(10),
    color: Colors.TextMuted,
    marginTop: 1,
  },
  gateScopeBadge: {
    backgroundColor: "rgba(6, 182, 212, 0.12)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: "rgba(6, 182, 212, 0.4)",
  },
  gateScopeLabel: {
    fontSize: responsiveFont(8),
    fontWeight: "900",
    color: Colors.ElectricCyan,
    letterSpacing: 0.5,
  },
  gateScopeNames: {
    fontSize: responsiveFont(10),
    color: Colors.TextWhite,
    fontWeight: "700",
    marginTop: 2,
  },
  roleTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  roleTagText: {
    fontSize: responsiveFont(8),
    fontWeight: "800",
    color: Colors.NeonEmerald,
  },
  revokeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.CrimsonRed,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    marginTop: 2,
  },
  revokeText: {
    color: Colors.CrimsonRed,
    fontSize: responsiveFont(9),
    fontWeight: "900",
  },
  formCard: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.ElectricCyan,
    marginTop: 10,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: responsiveFont(12),
    fontWeight: "900",
    color: Colors.TextWhite,
  },
  formSubtitle: {
    fontSize: responsiveFont(10),
    color: Colors.TextMuted,
    marginTop: 2,
    marginBottom: 12,
  },
  label: {
    fontSize: responsiveFont(9),
    fontWeight: "800",
    color: Colors.TextMuted,
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: "#131C2E",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: Colors.TextWhite,
    fontSize: responsiveFont(12),
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
    marginBottom: 8,
  },
  gateCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131C2E",
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
  },
  gateCheckboxRowSelected: {
    borderColor: Colors.ElectricCyan,
    backgroundColor: "rgba(6, 182, 212, 0.12)",
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
    backgroundColor: Colors.ElectricCyan,
    borderColor: Colors.ElectricCyan,
  },
  checkMark: {
    color: Colors.VoidBlack,
    fontSize: 12,
    fontWeight: "900",
  },
  gateTextCol: {
    flex: 1,
  },
  gateTitle: {
    fontSize: responsiveFont(11),
    fontWeight: "700",
    color: Colors.TextMuted,
  },
  gateTitleSelected: {
    color: Colors.TextWhite,
    fontWeight: "800",
  },
  gateSub: {
    fontSize: responsiveFont(9),
    fontFamily: "Courier",
    color: Colors.TextSubtle,
    marginTop: 1,
  },
  roleSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 4,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: "#131C2E",
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
  },
  roleOptionSelected: {
    borderColor: Colors.ElectricCyan,
    backgroundColor: "rgba(6, 182, 212, 0.2)",
  },
  roleText: {
    fontSize: responsiveFont(9),
    color: Colors.TextMuted,
    fontWeight: "700",
  },
  roleTextSelected: {
    color: Colors.TextWhite,
    fontWeight: "800",
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.CrimsonRed,
    marginBottom: 10,
  },
  errorText: {
    color: Colors.CrimsonRed,
    fontSize: responsiveFont(10),
    textAlign: "center",
  },
  submitBtn: {
    backgroundColor: Colors.NeonEmerald,
    height: 46,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnText: {
    color: Colors.VoidBlack,
    fontSize: responsiveFont(11),
    fontWeight: "900",
  },
  cancelBtn: {
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  cancelBtnText: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(11),
    fontWeight: "700",
  },
});
