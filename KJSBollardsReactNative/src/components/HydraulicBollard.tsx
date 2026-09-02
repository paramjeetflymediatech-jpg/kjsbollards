import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { Colors } from "../theme/colors";

interface HydraulicBollardProps {
  status: string;
  isMoving: boolean;
  targetMovement: "raise" | "lower" | "stop" | null;
}

export const HydraulicBollard: React.FC<HydraulicBollardProps> = ({
  status,
  isMoving,
  targetMovement,
}) => {
  const heightAnim = useRef(new Animated.Value(status === "RAISED" ? 140 : 35)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  // LED Glow loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Height elevation animation
  useEffect(() => {
    let targetHeight = 35;
    if (targetMovement === "raise" || (!isMoving && status === "RAISED")) {
      targetHeight = 140;
    } else if (targetMovement === "lower" || (!isMoving && status === "LOWERED")) {
      targetHeight = 35;
    } else if (status === "STOPPED") {
      targetHeight = 85;
    }

    Animated.timing(heightAnim, {
      toValue: targetHeight,
      duration: isMoving ? 2500 : 400,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();
  }, [status, isMoving, targetMovement, heightAnim]);

  const ledColor =
    status === "RAISED" ? Colors.NeonEmerald : status === "LOWERED" ? Colors.CyberAmber : Colors.CrimsonRed;

  return (
    <View style={styles.container}>
      {/* Ground Road Surface & Hazard Markings */}
      <View style={styles.hazardLineContainer}>
        {[...Array(9)].map((_, i) => (
          <View key={i} style={styles.hazardDash} />
        ))}
      </View>

      {/* Hydraulic Pit Housing */}
      <View style={styles.pit}>
        {/* Stainless Steel Cylinder */}
        <Animated.View style={[styles.cylinder, { height: heightAnim }]}>
          {/* Cylinder Top Cap */}
          <View style={styles.topCap}>
            <View style={styles.topCapHighlight} />
          </View>

          {/* Neon Flashing LED Safety Ring */}
          <Animated.View
            style={[
              styles.ledRing,
              {
                backgroundColor: ledColor,
                opacity: pulseAnim,
                shadowColor: ledColor,
              },
            ]}
          />

          {/* Retro-Reflective Danger Band */}
          <View style={styles.hazardBand}>
            <View style={styles.hazardBandStripe} />
          </View>

          {/* Polished Steel Body Highlights */}
          <View style={styles.steelReflection}>
            <View style={styles.steelGleam} />
          </View>
        </Animated.View>

        {/* Ground Collar Ring */}
        <View style={styles.pitCollar} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 220,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 15,
  },
  hazardLineContainer: {
    position: "absolute",
    bottom: 25,
    flexDirection: "row",
    width: "90%",
    justifyContent: "space-between",
  },
  hazardDash: {
    width: 20,
    height: 4,
    backgroundColor: Colors.CyberAmber,
    borderRadius: 2,
    opacity: 0.6,
  },
  pit: {
    width: 130,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  pitCollar: {
    width: 140,
    height: 12,
    backgroundColor: "#0F172A",
    borderWidth: 2,
    borderColor: "#334155",
    borderRadius: 6,
    zIndex: 10,
  },
  cylinder: {
    width: 96,
    backgroundColor: "#64748B",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  topCap: {
    width: "100%",
    height: 12,
    backgroundColor: "#CBD5E1",
    borderBottomWidth: 1,
    borderBottomColor: "#475569",
    alignItems: "center",
  },
  topCapHighlight: {
    width: "70%",
    height: 3,
    backgroundColor: "#FFFFFF",
    marginTop: 2,
    borderRadius: 2,
  },
  ledRing: {
    width: "86%",
    height: 8,
    borderRadius: 4,
    marginTop: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
  },
  hazardBand: {
    width: "92%",
    height: 14,
    backgroundColor: Colors.CrimsonRed,
    marginTop: 8,
    borderRadius: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  hazardBandStripe: {
    width: "60%",
    height: 2,
    backgroundColor: "#FFFFFF",
    opacity: 0.8,
  },
  steelReflection: {
    position: "absolute",
    left: 12,
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  steelGleam: {
    position: "absolute",
    left: 3,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
});
