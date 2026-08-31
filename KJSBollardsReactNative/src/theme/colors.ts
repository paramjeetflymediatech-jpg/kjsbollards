export const Colors = {
  // Deep Backgrounds
  VoidBlack: "#080C14",
  DarkBg: "#0D1424",
  SurfaceDark: "#131E32",
  SurfaceCard: "rgba(19, 30, 50, 0.92)",
  SurfaceHighlight: "#1F2E4A",
  CardBorder: "rgba(56, 189, 248, 0.18)",
  BorderGlow: "rgba(6, 182, 212, 0.35)",

  // Vibrant Accents
  NeonEmerald: "#10B981",
  NeonEmeraldGlow: "#34D399",
  NeonEmeraldBg: "rgba(16, 185, 129, 0.12)",
  
  CyberAmber: "#F59E0B",
  CyberAmberBg: "rgba(245, 158, 11, 0.12)",

  CrimsonRed: "#EF4444",
  CrimsonDark: "#991B1B",
  CrimsonBg: "rgba(239, 68, 68, 0.12)",

  ElectricCyan: "#06B6D4",
  ElectricCyanBg: "rgba(6, 182, 212, 0.14)",
  IceBlue: "#38BDF8",

  // Typography
  TextWhite: "#F8FAFC",
  TextDim: "#CBD5E1",
  TextMuted: "#94A3B8",
  TextSubtle: "#64748B",
};

export const colors = {
  ...Colors,
  primary: Colors.ElectricCyan,
  textSecondary: Colors.TextMuted,
  background: Colors.VoidBlack,
  surface: Colors.SurfaceDark,
};
