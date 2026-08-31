import { Dimensions, PixelRatio, Platform } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Baseline mobile dimensions (iPhone 14 / Pixel: 390 x 844)
const baseWidth = 390;
const baseHeight = 844;

export const scaleWidth = (size: number): number => {
  return (SCREEN_WIDTH / baseWidth) * size;
};

export const scaleHeight = (size: number): number => {
  return (SCREEN_HEIGHT / baseHeight) * size;
};

// Moderate responsive font scaling (prevents over-scaling on tablets and under-scaling on small phones)
export const responsiveFont = (size: number, factor = 0.4): number => {
  const scale = SCREEN_WIDTH / baseWidth;
  const newSize = size + (size * scale - size) * factor;
  // Clamp scaling between 0.85x and 1.35x
  const clampedSize = Math.max(size * 0.85, Math.min(size * 1.35, newSize));
  return Math.round(PixelRatio.roundToNearestPixel(clampedSize));
};

export const isSmallScreen = SCREEN_WIDTH < 375;
export const isTablet = SCREEN_WIDTH >= 768;
export const isIOS = Platform.OS === "ios";

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };
