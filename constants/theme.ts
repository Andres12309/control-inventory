/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

import { InventarioColors } from './inventario-theme';

const tintColorLight = InventarioColors.primary;
const tintColorDark = InventarioColors.textOnPrimary;

export const Colors = {
  light: {
    text: InventarioColors.text,
    background: InventarioColors.bg,
    tint: tintColorLight,
    icon: InventarioColors.textMuted,
    tabIconDefault: InventarioColors.textMuted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: InventarioColors.textOnPrimary,
    background: InventarioColors.primaryDark,
    tint: tintColorDark,
    icon: InventarioColors.primaryMuted,
    tabIconDefault: InventarioColors.primaryMuted,
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
