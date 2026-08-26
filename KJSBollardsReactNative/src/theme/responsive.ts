import { Dimensions, PixelRatio } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Base guideline dimensions based on standard mobile (iPhone 14 / Pixel 7: 390 x 844)
const baseWidth = 390;
const baseHeight = 844;

export const scaleWidth = (size: number): number => {
  return (SCREEN_WIDTH / baseWidth) * size;
};

export const scaleHeight = (size: number): number => {
  return (SCREEN_HEIGHT / baseHeight) * size;
};

export const responsiveFont = (size: number): number => {
  const scale = SCREEN_WIDTH / baseWidth;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const isSmallScreen = SCREEN_WIDTH < 375;
export { SCREEN_WIDTH, SCREEN_HEIGHT };
