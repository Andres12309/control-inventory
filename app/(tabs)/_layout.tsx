import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { InventarioColors } from "@/constants/inventario-theme";

const TAB_BAR_BASE = 52;

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: InventarioColors.primary,
        tabBarInactiveTintColor: InventarioColors.textMuted,
        tabBarStyle: {
          backgroundColor: InventarioColors.surface,
          borderTopColor: InventarioColors.border,
          height: TAB_BAR_BASE + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        headerStyle: { backgroundColor: InventarioColors.surface },
        headerTintColor: InventarioColors.text,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Almacén",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="shippingbox.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="herramientas"
        options={{
          title: "Herramientas",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={26}
              name="wrench.and.screwdriver.fill"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="almacen"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
