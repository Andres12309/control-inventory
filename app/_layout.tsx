import "react-native-reanimated";

import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { InventarioColors } from "@/constants/inventario-theme";
import { onDbInit } from "@/lib/db/on-init";

export const unstable_settings = {
  anchor: "(tabs)",
};

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

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="inventario.db" onInit={onDbInit}>
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
          <StatusBar style="dark" />
        </ThemeProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
