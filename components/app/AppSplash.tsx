import { Image } from "expo-image";
import { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { InventarioColors } from "@/constants/inventario-theme";

const LOGO = require("@/assets/images/icon.png");
const EXIT_MS = 520;
const SHUTTLE_WIDTH = 72;

type Props = {
  exiting: boolean;
};

export function AppSplash({ exiting }: Props) {
  const scheme = useColorScheme();
  const { width: screenWidth } = useWindowDimensions();
  const isDark = scheme === "dark";
  const bg = isDark ? InventarioColors.primaryDark : InventarioColors.primary;
  const barMaxWidth = screenWidth - 80;
  const exitStarted = useRef(false);

  const containerOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0.55);
  const logoOpacity = useSharedValue(0);
  const titleY = useSharedValue(18);
  const titleOpacity = useSharedValue(0);
  const tagY = useSharedValue(12);
  const tagOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.85);
  const ringOpacity = useSharedValue(0);
  const barSlide = useSharedValue(0);
  const glowOpacity = useSharedValue(0.35);

  useEffect(() => {
    logoScale.value = withSpring(1, { damping: 13, stiffness: 110 });
    logoOpacity.value = withTiming(1, { duration: 550 });
    ringOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.92, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 1800 }),
        withTiming(0.25, { duration: 1800 }),
      ),
      -1,
      true,
    );
    titleY.value = withDelay(
      280,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }),
    );
    titleOpacity.value = withDelay(280, withTiming(1, { duration: 450 }));
    tagY.value = withDelay(
      420,
      withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) }),
    );
    tagOpacity.value = withDelay(420, withTiming(1, { duration: 400 }));
    barSlide.value = withRepeat(
      withTiming(1, { duration: 1300, easing: Easing.linear }),
      -1,
      false,
    );
  }, [
    barSlide,
    glowOpacity,
    logoOpacity,
    logoScale,
    ringOpacity,
    ringScale,
    tagOpacity,
    tagY,
    titleOpacity,
    titleY,
  ]);

  useEffect(() => {
    if (!exiting || exitStarted.current) return;
    exitStarted.current = true;
    containerOpacity.value = withDelay(
      180,
      withTiming(0, { duration: EXIT_MS, easing: Easing.in(Easing.cubic) }),
    );
  }, [containerOpacity, exiting]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value * 0.45,
    transform: [{ scale: ringScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: ringScale.value * 1.08 }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const tagStyle = useAnimatedStyle(() => ({
    opacity: tagOpacity.value,
    transform: [{ translateY: tagY.value }],
  }));

  const shuttleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          barSlide.value,
          [0, 1],
          [-SHUTTLE_WIDTH, barMaxWidth],
        ),
      },
    ],
  }));

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: bg }, containerStyle]}
      pointerEvents={exiting ? "none" : "auto"}
    >
      <View style={styles.decorTop} />
      <View style={[styles.decorBottom, isDark && styles.decorBottomDark]} />

      <View style={styles.center}>
        <Animated.View style={[styles.glow, glowStyle]} />
        <Animated.View style={[styles.ring, ringStyle]} />
        <Animated.View style={logoStyle}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
        </Animated.View>

        <Animated.View style={titleStyle}>
          <Text style={styles.title}>Puyo-Motors</Text>
          <View style={styles.accentLine} />
        </Animated.View>

        <Animated.View style={tagStyle}>
          <Text style={styles.tagline}>Inventario y almacén</Text>
          <Text style={styles.sub}>Listo para el mostrador</Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View style={[styles.barTrack, { width: barMaxWidth }]}>
          <Animated.View style={[styles.barShuttle, shuttleStyle]} />
        </View>
        <Text style={styles.footerText}>
          {exiting ? "Entrando…" : "Preparando catálogo…"}
        </Text>
      </View>
    </Animated.View>
  );
}

export const APP_SPLASH_EXIT_MS = 180 + EXIT_MS;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  decorTop: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  decorBottom: {
    position: "absolute",
    bottom: -100,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  decorBottomDark: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  center: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: InventarioColors.accent,
  },
  ring: {
    position: "absolute",
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 26,
  },
  title: {
    marginTop: 22,
    color: InventarioColors.textOnPrimary,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  accentLine: {
    alignSelf: "center",
    marginTop: 10,
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: InventarioColors.accent,
  },
  tagline: {
    marginTop: 14,
    color: "rgba(255,255,255,0.95)",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  sub: {
    marginTop: 4,
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 48,
    left: 40,
    right: 40,
    alignItems: "center",
    gap: 10,
  },
  barTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  barShuttle: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SHUTTLE_WIDTH,
    borderRadius: 2,
    backgroundColor: InventarioColors.accent,
    shadowColor: InventarioColors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 6,
    elevation: 4,
  },
  footerText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
});
