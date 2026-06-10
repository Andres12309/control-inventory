/**
 * Paleta corporativa: Azul · Blanco · Rojo
 * - Azul: marca, navegación, selección, contados
 * - Blanco: fondos y tarjetas
 * - Rojo: acciones fuertes, ventas, pendientes, alertas
 */
export const InventarioColors = {
  // Fondos
  bg: '#F0F4FA',
  surface: '#FFFFFF',
  surfaceAlt: '#E8EFF8',
  surfaceBlue: '#1A4B8C',

  // Bordes
  border: '#C5D4E8',
  borderLight: '#E2EBF5',

  // Texto
  text: '#0B2545',
  textMuted: '#5A7189',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',

  // Azul — primario / marca
  primary: '#1A4B8C',
  primaryDark: '#0F3060',
  primaryLight: '#2E6BB5',
  primaryMuted: '#D4E3F5',
  primarySoft: '#EBF3FB',

  // Rojo — acción / alerta
  accent: '#C41E3A',
  accentDark: '#9A1730',
  accentLight: '#E53955',
  accentMuted: '#FDE8EC',
  accentSoft: '#FCE4E8',

  // Estados
  success: '#1A4B8C',
  successBg: '#D4E3F5',
  warning: '#C41E3A',
  warningBg: '#FDE8EC',
  danger: '#B91C2E',
  dangerBg: '#FCE4E8',

  // Superficies semánticas
  activeBg: '#EBF3FB',
  activeBorder: '#1A4B8C',
  jornadaBg: '#EBF3FB',
  jornadaBorder: '#2E6BB5',
  jornadaText: '#1A4B8C',
  jornadaDot: '#2E6BB5',
  ventaBg: '#FDE8EC',
  ventaBorder: '#C41E3A',
  ventaText: '#C41E3A',
  tablaAlt: '#F5F8FC',
} as const;
