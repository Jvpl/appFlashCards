import React, { useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, Easing } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import theme from '../../styles/theme';

export const MathToolbar = React.forwardRef(({ onInsert, onClose, onOpen, onOpenAdvancedMode }, ref) => {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = React.useState(false);
  const translateY = useSharedValue(400);
  const overlayOpacity = useSharedValue(0);
  const context = useSharedValue({ y: 0 });

  const openSheet = () => {
    translateY.value = 400;
    overlayOpacity.value = 0;
    setVisible(true);
    // Pequeno delay para garantir que o Modal já está montado antes de animar
    setTimeout(() => {
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
      overlayOpacity.value = withTiming(0.6, { duration: 250 });
    }, 16);
  };

  const closeSheet = (callback) => {
    'worklet';
    translateY.value = withTiming(400, { duration: 260, easing: Easing.in(Easing.cubic) });
    overlayOpacity.value = withTiming(0, { duration: 220 }, () => {
      runOnJS(setVisible)(false);
      if (callback) runOnJS(callback)();
    });
  };

  useImperativeHandle(ref, () => ({
    toggle: () => {
      if (translateY.value < 200) {
        closeSheet(onClose);
      } else {
        onOpen();
        openSheet();
      }
    },
    forceClose: () => {
      closeSheet(onClose);
    },
  }));

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const panGesture = Gesture.Pan()
    .onStart(() => { context.value = { y: translateY.value }; })
    .onUpdate((e) => {
      const newY = Math.max(0, context.value.y + e.translationY);
      translateY.value = newY;
      overlayOpacity.value = Math.max(0, 0.6 - (newY / 300) * 0.6);
    })
    .onEnd((e) => {
      if (e.translationY > 80 || e.velocityY > 500) {
        closeSheet(onClose);
      } else {
        translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
        overlayOpacity.value = withTiming(0.6, { duration: 200 });
      }
    });

  const basicFormulas = [
    { icon: 'a/b',  label: 'Fração',         cmd: '\\\\frac',  color: theme.primary },
    { icon: 'x²',   label: 'Potência',        cmd: '²',         color: theme.warning },
    { icon: '√',    label: 'Raiz',            cmd: '\\\\sqrt',  color: theme.download },
    { icon: 'log',  label: 'Logaritmo',       cmd: '\\\\log',   color: theme.accentPurpleLight },
    { icon: '|x|',  label: 'Valor Absoluto',  cmd: '\\\\abs',   color: theme.accentCyan },
    { icon: 'xₙ',   label: 'Subscrito',       cmd: '\\\\sub',   color: theme.danger },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={() => closeSheet(onClose)}>
      {/* Overlay clicável para fechar */}
      <TouchableWithoutFeedback onPress={() => closeSheet(onClose)}>
        <Animated.View style={[StyleSheet.absoluteFill, s.overlay, animatedOverlayStyle]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[s.sheet, { paddingBottom: insets.bottom + 16 }, animatedSheetStyle]}>
          {/* Handle */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              closeSheet(onClose);
            }}
            style={s.handleArea}
          >
            <View style={s.handle} />
          </TouchableOpacity>

          {/* Conteúdo */}
          <View style={s.content}>
            <Text style={s.sectionTitle}>FÓRMULAS BÁSICAS</Text>

            <View style={s.grid}>
              {basicFormulas.map((f) => (
                <TouchableOpacity
                  key={f.cmd}
                  style={s.card}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onInsert(f.cmd);
                  }}
                >
                  <Text style={[s.cardIcon, { color: f.color }]}>{f.icon}</Text>
                  <Text style={s.cardLabel}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={s.advancedBtn}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (onOpenAdvancedMode) {
                  onOpenAdvancedMode();
                } else {
                  onInsert('__ADVANCED__');
                }
              }}
            >
              <Ionicons name="flash" size={16} color="#fff" style={{ marginRight: 8 }} />
              <View>
                <Text style={s.advancedBtnText}>Modo Avançado</Text>
                <Text style={s.advancedBtnSub}>Editor completo de fórmulas</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
});

export default MathToolbar;

const s = StyleSheet.create({
  overlay: {
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#141414',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 12,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
    rowGap: 10,
  },
  card: {
    width: '32%',
    minHeight: 80,
    backgroundColor: 'transparent',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardIcon: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  cardLabel: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  advancedBtn: {
    backgroundColor: theme.accentPurple,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  advancedBtnSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    lineHeight: 15,
  },
});
