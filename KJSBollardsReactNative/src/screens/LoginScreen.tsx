import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Colors } from "../theme/colors";
import { responsiveFont } from "../theme/responsive";

interface LoginScreenProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onRegisterOwner: (name: string, email: string, pass: string, siteName: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  onRegisterOwner,
  isLoading,
  error,
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState("");
  const [siteName, setSiteName] = useState("");
  const [email, setEmail] = useState("admin@kjsbollards.co.uk");
  const [password, setPassword] = useState("KjsSecure2026!");
  const [secure, setSecure] = useState(true);

  const handleSubmit = () => {
    if (isRegisterMode) {
      onRegisterOwner(name, email, password, siteName);
    } else {
      onLogin(email, password);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Brand Shield Visual */}
          <View style={styles.shieldWrapper}>
            <View style={styles.shieldIconCircle}>
              <Text style={styles.shieldSymbol}>🛡️</Text>
            </View>
          </View>

          {/* Brand Titles */}
          <View style={styles.brandContainer}>
            <Text style={styles.brandTitle} adjustsFontSizeToFit numberOfLines={1}>
              KJS BOLLARDS
            </Text>
            <Text style={styles.brandSubtitle} adjustsFontSizeToFit numberOfLines={1}>
              ACCESS & PERIMETER CONTROL SYSTEM
            </Text>
          </View>

          {/* Login / Register Card */}
          <View style={styles.card}>
            {/* Mode Switcher Tabs */}
            <View style={styles.tabSwitchRow}>
              <TouchableOpacity
                style={[styles.modeTab, !isRegisterMode && styles.modeTabActive]}
                onPress={() => setIsRegisterMode(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeTabText, !isRegisterMode && styles.modeTabTextActive]}>
                  SIGN IN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, isRegisterMode && styles.modeTabActive]}
                onPress={() => setIsRegisterMode(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeTabText, isRegisterMode && styles.modeTabTextActive]}>
                  REGISTER OWNER
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.cardHeader}>
              {isRegisterMode
                ? "Create New Master Owner Account"
                : "Sign in with Master or Authorized Credentials"}
            </Text>

            {/* Registration Fields */}
            {isRegisterMode && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name (e.g. John Doe)"
                    placeholderTextColor={Colors.TextMuted}
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>🏰</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Residence / Site (e.g. Surrey Estate)"
                    placeholderTextColor={Colors.TextMuted}
                    value={siteName}
                    onChangeText={setSiteName}
                  />
                </View>
              </>
            )}

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="Account Email Address"
                placeholderTextColor={Colors.TextMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Master Access Password"
                placeholderTextColor={Colors.TextMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secure}
              />
              <TouchableOpacity
                onPress={() => setSecure(!secure)}
                style={styles.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.eyeIcon}>{secure ? "👁️" : "🙈"}</Text>
              </TouchableOpacity>
            </View>

            {/* Action Submit Button */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!email || !password || isLoading || (isRegisterMode && !name)) && styles.disabledBtn,
              ]}
              onPress={handleSubmit}
              disabled={!email || !password || isLoading || (isRegisterMode && !name)}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.VoidBlack} />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {isRegisterMode ? "REGISTER & CLAIM SITE" : "INITIALIZE SESSION"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Error Alert */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: Colors.VoidBlack,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  shieldWrapper: {
    marginBottom: 12,
  },
  shieldIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(6, 182, 212, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  shieldSymbol: {
    fontSize: responsiveFont(32),
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  brandTitle: {
    fontSize: responsiveFont(24),
    fontWeight: "900",
    letterSpacing: 2,
    color: Colors.TextWhite,
    textAlign: "center",
  },
  brandSubtitle: {
    fontSize: responsiveFont(9),
    fontWeight: "700",
    letterSpacing: 1.5,
    color: Colors.ElectricCyan,
    marginTop: 4,
    textAlign: "center",
  },
  card: {
    width: "100%",
    backgroundColor: Colors.SurfaceDark,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.BorderGlow,
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
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  modeTabActive: {
    backgroundColor: Colors.ElectricCyan,
  },
  modeTabText: {
    fontSize: responsiveFont(10),
    fontWeight: "800",
    color: Colors.TextMuted,
    letterSpacing: 0.5,
  },
  modeTabTextActive: {
    color: Colors.VoidBlack,
  },
  cardHeader: {
    fontSize: responsiveFont(11),
    fontWeight: "600",
    color: Colors.TextMuted,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131C2E",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.SurfaceHighlight,
  },
  inputIcon: {
    fontSize: responsiveFont(14),
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Colors.TextWhite,
    fontSize: responsiveFont(12),
    height: "100%",
  },
  eyeBtn: {
    padding: 6,
  },
  eyeIcon: {
    fontSize: responsiveFont(13),
  },
  primaryBtn: {
    height: 48,
    backgroundColor: Colors.ElectricCyan,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 14,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: Colors.VoidBlack,
    fontSize: responsiveFont(12),
    fontWeight: "900",
    letterSpacing: 1,
  },
  demoSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.SurfaceHighlight,
    paddingTop: 12,
  },
  demoSectionLabel: {
    fontSize: responsiveFont(9),
    fontWeight: "800",
    color: Colors.TextMuted,
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: "center",
  },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.CyberAmber,
    padding: 10,
    marginBottom: 8,
  },
  demoBtnIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  demoBtnTextCol: {
    flex: 1,
  },
  demoBtnTitle: {
    color: Colors.CyberAmber,
    fontSize: responsiveFont(11),
    fontWeight: "800",
  },
  demoBtnDesc: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(9),
    marginTop: 1,
  },
  demoSpouseBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.NeonEmerald,
    padding: 10,
  },
  demoSpouseTitle: {
    color: Colors.NeonEmerald,
    fontSize: responsiveFont(11),
    fontWeight: "800",
  },
  demoSpouseDesc: {
    color: Colors.TextMuted,
    fontSize: responsiveFont(9),
    marginTop: 1,
  },
  errorBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.CrimsonRed,
    width: "100%",
  },
  errorText: {
    color: Colors.CrimsonRed,
    fontSize: responsiveFont(11),
    textAlign: "center",
  },
});
