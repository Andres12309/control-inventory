import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { InventarioColors } from '@/constants/inventario-theme';
import { QUICK_SEARCH_SUGGESTIONS } from '@/lib/almacen/search-query';

type Props = {
  query: string;
  onChangeQuery: (value: string) => void;
  onSubmit: () => void;
  listening: boolean;
  voicePartial: string;
  voiceAvailable: boolean;
  onToggleVoice: () => void;
  onSuggestion: (text: string) => void;
};

export function BusquedaAlmacenBar({
  query,
  onChangeQuery,
  onSubmit,
  listening,
  voicePartial,
  voiceAvailable,
  onToggleVoice,
  onSuggestion,
}: Props) {
  const displayValue = listening && voicePartial ? voicePartial : query;
  const showSuggestions = !query.trim() && !listening;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          style={[styles.search, listening && styles.searchListening]}
          placeholder="Nombre, marca, voz… (ej: bujia 8, filtro aveo)"
          placeholderTextColor={InventarioColors.textMuted}
          value={displayValue}
          onChangeText={onChangeQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          editable={!listening}
        />
        <Pressable
          style={[
            styles.micBtn,
            listening && styles.micBtnOn,
            !voiceAvailable && styles.micBtnMuted,
          ]}
          onPress={onToggleVoice}
          accessibilityLabel={listening ? 'Detener búsqueda por voz' : 'Buscar por voz'}
        >
          <MaterialIcons
            name={listening ? 'mic' : 'mic-none'}
            size={22}
            color={listening ? InventarioColors.textOnAccent : InventarioColors.primary}
          />
        </Pressable>
      </View>

      {listening ? (
        <Text style={styles.listeningHint}>Escuchando… di marca, pieza o código</Text>
      ) : null}

      {showSuggestions ? (
        <View style={styles.suggestions}>
          <Text style={styles.suggestLabel}>Rápido:</Text>
          {QUICK_SEARCH_SUGGESTIONS.map((s) => (
            <Pressable key={s} style={styles.suggestChip} onPress={() => onSuggestion(s)}>
              <Text style={styles.suggestChipText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  search: {
    flex: 1,
    backgroundColor: InventarioColors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: InventarioColors.text,
    borderWidth: 1,
    borderColor: InventarioColors.border,
    fontSize: 15,
  },
  searchListening: {
    borderColor: InventarioColors.accent,
    backgroundColor: InventarioColors.accentSoft,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: InventarioColors.primarySoft,
    borderWidth: 1,
    borderColor: InventarioColors.primary,
  },
  micBtnOn: {
    backgroundColor: InventarioColors.accent,
    borderColor: InventarioColors.accentDark,
  },
  micBtnMuted: {
    opacity: 0.55,
  },
  listeningHint: {
    color: InventarioColors.accent,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 2,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  suggestLabel: {
    color: InventarioColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  suggestChip: {
    backgroundColor: InventarioColors.surface,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: InventarioColors.border,
  },
  suggestChipText: {
    color: InventarioColors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
});
