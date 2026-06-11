import "react-native-reanimated";

import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider, type SQLiteDatabase } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { APP_SPLASH_EXIT_MS, AppSplash } from "@/components/app/AppSplash";
import { InventarioColors } from "@/constants/inventario-theme";
import { markDbInitFinished, waitForDbInit } from "@/lib/app-bootstrap";
import {
  beginStartupUpdateCheck,
  promptStartupUpdateIfAvailable,
} from "@/lib/app-updates";
import { onDbInit } from "@/lib/db/on-init";

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 400, fade: true });

const MIN_SPLASH_MS = 3000;
const MAX_SPLASH_MS = 8000;

const inventarioTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: InventarioColors.bg,
    card: InventarioColors.surface,
    primary: InventarioColors.primary,
    border: InventarioColors.border,
    text: InventarioColors.text,
  },
};

function beginSplashExit(
  setSplashPhase: Dispatch<SetStateAction<"show" | "exit" | "done">>,
): ReturnType<typeof setTimeout> {
  setSplashPhase("exit");
  return setTimeout(() => setSplashPhase("done"), APP_SPLASH_EXIT_MS);
}

function AppShell() {
  const [splashPhase, setSplashPhase] = useState<"show" | "exit" | "done">("show");

  useEffect(() => {
    beginStartupUpdateCheck();
  }, []);

  useEffect(() => {
    if (splashPhase !== "done") return;
    void promptStartupUpdateIfAvailable();
  }, [splashPhase]);

  useEffect(() => {
    let cancelled = false;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;

    SplashScreen.hideAsync().catch(() => undefined);

    const finish = () => {
      if (cancelled) return;
      if (exitTimer) return;
      exitTimer = beginSplashExit(setSplashPhase);
    };

    void Promise.all([
      waitForDbInit(6000),
      new Promise<void>((resolve) => setTimeout(resolve, MIN_SPLASH_MS)),
    ]).then(finish);

    const safety = setTimeout(finish, MAX_SPLASH_MS);

    return () => {
      cancelled = true;
      clearTimeout(safety);
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, []);

  const showSplash = splashPhase !== "done";

  return (
    <ThemeProvider value={inventarioTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: InventarioColors.surface },
          headerTintColor: InventarioColors.text,
          contentStyle: { backgroundColor: InventarioColors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="conteo/[codpro]"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen
          name="producto/nuevo"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen
          name="producto/editar"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen
          name="venta-rapida"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen
          name="inventario-en-curso"
          options={{ headerShown: false, presentation: "modal" }}
        />
      </Stack>
      <StatusBar style={showSplash ? "light" : "dark"} />
      {showSplash ? <AppSplash exiting={splashPhase === "exit"} /> : null}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const handleDbInit = useCallback(async (db: SQLiteDatabase) => {
    try {
      await onDbInit(db);
    } catch (error) {
      console.warn("[db] Error al inicializar:", error);
    } finally {
      markDbInitFinished();
    }
  }, []);

  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="inventario.db" onInit={handleDbInit}>
        <AppShell />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
