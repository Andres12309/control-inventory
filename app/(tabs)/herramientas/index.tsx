import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AjustesPanel } from '@/components/herramientas/AjustesPanel';
import { CatalogoPanel } from '@/components/herramientas/CatalogoPanel';
import { FamiliasPanel } from '@/components/herramientas/FamiliasPanel';
import { InventarioColors } from '@/constants/inventario-theme';

type MenuId = 'catalogo' | 'familias' | 'ajustes';

const MENUS: { id: MenuId; label: string }[] = [
  { id: 'catalogo', label: 'Catálogo' },
  { id: 'familias', label: 'Familias' },
  { id: 'ajustes', label: 'Ajustes' },
];

export default function HerramientasScreen() {
  const [menu, setMenu] = useState<MenuId>('catalogo');

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.menu}>
        {MENUS.map((m) => (
          <Pressable
            key={m.id}
            style={[styles.menuBtn, menu === m.id && styles.menuBtnOn]}
            onPress={() => setMenu(m.id)}>
            <Text style={[styles.menuText, menu === m.id && styles.menuTextOn]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.contenido}>
        {menu === 'catalogo' ? <CatalogoPanel activo={menu === 'catalogo'} /> : null}
        {menu === 'familias' ? <FamiliasPanel activo={menu === 'familias'} /> : null}
        {menu === 'ajustes' ? <AjustesPanel activo={menu === 'ajustes'} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: InventarioColors.bg },
  menu: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },
  menuBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: InventarioColors.surface,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  menuBtnOn: {
    backgroundColor: InventarioColors.primary,
    borderColor: InventarioColors.primary,
  },
  menuText: { color: InventarioColors.textMuted, fontWeight: '700', fontSize: 14 },
  menuTextOn: { color: InventarioColors.textOnPrimary, fontWeight: '800' },
  contenido: { flex: 1 },
});
