import * as Haptics from 'expo-haptics';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { preprocessSearchQuery } from '@/lib/almacen/search-query';

type Options = {
  onFinalQuery: (query: string) => void;
  onPartialQuery?: (query: string) => void;
};

export function useAlmacenVoiceSearch({ onFinalQuery, onPartialQuery }: Options) {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const [available, setAvailable] = useState(false);
  const finalHandled = useRef(false);

  useEffect(() => {
    try {
      setAvailable(ExpoSpeechRecognitionModule.isRecognitionAvailable());
    } catch {
      setAvailable(false);
    }
  }, []);

  useSpeechRecognitionEvent('start', () => {
    finalHandled.current = false;
    setListening(true);
    setPartial('');
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    setPartial('');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const raw = event.results[0]?.transcript?.trim() ?? '';
    if (!raw) return;

    const cleaned = preprocessSearchQuery(raw, { fromVoice: true });
    if (!cleaned) return;

    if (event.isFinal) {
      if (finalHandled.current) return;
      finalHandled.current = true;
      setPartial('');
      onFinalQuery(cleaned);
      void ExpoSpeechRecognitionModule.stop();
      return;
    }

    setPartial(cleaned);
    onPartialQuery?.(cleaned);
  });

  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    setPartial('');
    if (event.error === 'aborted' || event.error === 'no-speech') return;
    Alert.alert(
      'Voz no disponible',
      event.message ||
        'No se pudo usar el micrófono. Escribe la búsqueda o prueba en el APK (no en Expo Go).',
    );
  });

  const toggle = useCallback(async () => {
    if (listening) {
      await ExpoSpeechRecognitionModule.stop();
      return;
    }

    if (!available) {
      Alert.alert(
        'Búsqueda por voz',
        Platform.OS === 'web'
          ? 'La voz no está disponible en web.'
          : 'Instala el APK de EAS para usar el micrófono. En Expo Go puede no funcionar.',
      );
      return;
    }

    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permiso de micrófono',
        'Activa el micrófono para buscar productos hablando.',
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);

    ExpoSpeechRecognitionModule.start({
      lang: 'es-EC',
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
      requiresOnDeviceRecognition: false,
      androidIntentOptions: {
        EXTRA_LANGUAGE_MODEL: 'free_form',
      },
    });
  }, [available, listening]);

  return {
    listening,
    partial,
    available,
    toggle,
  };
}
