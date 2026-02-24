import React, { useImperativeHandle } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, Easing } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Path, G, Defs, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from 'react-native-svg';
import styles from '../../styles/globalStyles';

export const MathToolbar = React.forwardRef(({ onInsert, onClose, onOpen, onOpenAdvancedMode }, ref) => {
  const translateY = useSharedValue(400);
  const context = useSharedValue({ y: 0 });

  useImperativeHandle(ref, () => ({
    toggle: () => {
      if (translateY.value < 200) {
        translateY.value = withTiming(400, { duration: 220 }, () => runOnJS(onClose)());
      } else {
        onOpen();
        // Easing.out(cubic) acelera no início e desacelera no final de forma assimétrica.
        // O toolbar passa RAPIDAMENTE pela zona da WebView (reduzindo frames de stutter)
        // e desacelera suavemente só nos últimos 20% do percurso
        translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      }
    },
    forceClose: () => {
      translateY.value = withTiming(400, { duration: 220 }, () => runOnJS(onClose)());
    },
  }));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const closeMenu = () => {
    'worklet';
    translateY.value = withTiming(400, { duration: 220 }, () => {
      runOnJS(onClose)();
    });
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((e) => {
      const newY = context.value.y + e.translationY;
      translateY.value = Math.max(0, newY);
    })
    .onEnd((e) => {
      if (e.translationY > 50 || e.velocityY > 500) {
        closeMenu();
      } else {
        translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      }
    });

  const basicFormulas = [
    { icon: 'a/b', label: 'Fração', cmd: '\\\\frac', color: '#4FD1C5' },
    { icon: 'x²', label: 'Potência', cmd: '²', color: '#F59E0B' },
    { icon: '√', label: 'Raiz', cmd: '\\\\sqrt', color: '#10B981' },
    { icon: 'log', label: 'Logaritmo', cmd: '\\\\log', color: '#8B5CF6' },
    { icon: '|x|', label: 'Valor Absoluto', cmd: '\\\\abs', color: '#06B6D4' },
    { icon: 'xₙ', label: 'Subscrito', cmd: '\\\\sub', color: '#EF4444' },
  ];

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        renderToHardwareTextureAndroid={true}
        style={[
          {
            position: 'absolute',
            bottom: -50,
            left: 0,
            right: 0,
            maxHeight: '57%',
            zIndex: 9999,
            flexDirection: 'column',
            flexWrap: 'nowrap',
            backgroundColor: '#252E3D',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 0,
            paddingBottom: 70,
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
          },
          animatedStyle
        ]}>

        {/* Botão de fechar */}
        <View style={{ position: 'absolute', top: -20, left: 0, right: 0, zIndex: 10, alignItems: 'center' }}>
          <TouchableOpacity
            activeOpacity={0.9}
            hittestSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              closeMenu();
            }}
            style={{ alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {/* Box de segurança de imagem */}
              <Svg width="150" height="74" viewBox="0 0 150 74">
                <Defs>
                  <Filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                    <FeGaussianBlur stdDeviation="2" result="blur" />
                    <FeMerge>
                      <FeMergeNode in="blur" />
                    </FeMerge>
                  </Filter>
                </Defs>
                <G x="25" y="20">
                  {/* Sombra Esfumaçada Real */}
                  <Path
                    d="M 0 0 C 12 0, 18 34, 30 34 L 70 34 C 82 34, 88 0, 100 0 Z"
                    fill="#4FD1C5"
                    opacity="0.5"
                    filter="url(#glow)"
                  />
                  {/* Botão Principal Sólido */}
                  <Path
                    d="M 0 0 C 12 0, 18 34, 30 34 L 70 34 C 82 34, 88 0, 100 0 Z"
                    fill="#4FD1C5"
                  />
                </G>
              </Svg>
              {/* Ícone */}
              <View style={{ position: 'absolute', top: 25 }}>
                <Ionicons name="chevron-down" size={20} color="#1A202C" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Conteúdo scrollável */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 35, paddingHorizontal: 12, paddingBottom: 40 }}
          keyboardShouldPersistTaps="always"
        >
          <Text style={localStyles.sectionTitle}>FÓRMULAS BÁSICAS</Text>
          <View style={localStyles.grid}>
            {basicFormulas.map((f) => (
              <TouchableOpacity
                key={f.cmd}
                style={localStyles.button}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onInsert(f.cmd);
                }}
              >
                <Text style={[localStyles.buttonIcon, { color: f.color }]}>{f.icon}</Text>
                <Text style={localStyles.buttonLabel}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={localStyles.advancedBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (onOpenAdvancedMode) {
                onOpenAdvancedMode();
              } else {
                onInsert('__ADVANCED__'); // Fallback para manter retrocompatibilidade se necessário
              }
            }}
          >
            <Text style={localStyles.advancedBtnText}>⚡ Modo Avançado</Text>
            <Text style={localStyles.advancedBtnSub}>Editor completo de fórmulas</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
});

export default MathToolbar;

const localStyles = StyleSheet.create({
  sectionTitle: {
    color: '#A0AEC0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  button: {
    width: '31%',
    backgroundColor: '#323E4F', /* Fundo mais claro para destacar */
    borderRadius: 12,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4A5568',
    paddingVertical: 14,
    marginBottom: 10, /* Substitui o gap */
  },
  buttonIcon: {
    fontSize: 28, /* Maior, igual ao original */
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
    width: '100%',
  },
  buttonLabel: {
    color: '#E2E8F0', /* Branco/cinza bem claro, igual ao original */
    fontSize: 12, /* Maior */
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },
  advancedBtn: {
    backgroundColor: '#6B46C1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  advancedBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  advancedBtnSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
  },
});
