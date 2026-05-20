import "react-native-reanimated";

import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";

import { InventarioColors } from "@/constants/inventario-theme";
import { migrateDbIfNeeded } from "@/lib/db/migrate";

export const unstable_settings = {
  anchor: "(tabs)",
};

const inventarioTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: InventarioColors.bg,
    card: InventarioColors.surface,
    primary: InventarioColors.accent,
    border: InventarioColors.border,
    text: InventarioColors.text,
  },
};

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="inventario.db" onInit={migrateDbIfNeeded}>
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
        <StatusBar style="light" />
      </ThemeProvider>
    </SQLiteProvider>
  );
}
