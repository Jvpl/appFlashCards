import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Modal, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../styles/theme';

const { width: W } = Dimensions.get('window');
const TUTORIAL_KEY = '@FlashcardsApp:swipeTutorialSeen';
const CARD_W = Math.min(W * 0.52, 190);
const CARD_H = CARD_W * 1.4;
const SWIPE_X = W * 0.23;
const SWIPE_Y = 70;
const EASE_OUT = Easing.bezier(0.25, 0.46, 0.45, 0.94);
const EASE_BACK = Easing.bezier(0.55, 0.06, 0.68, 0.19);

export const SwipeTutorial = () => {
  const [visible, setVisible] = useState(false);

  const fingerX  = useRef(new Animated.Value(0)).current;
  const fingerY  = useRef(new Animated.Value(0)).current;
  const rightOp  = useRef(new Animated.Value(0)).current;
  const upOp     = useRef(new Animated.Value(0)).current;
  const leftOp   = useRef(new Animated.Value(0)).current;
  const overlayOp = useRef(new Animated.Value(0)).current;
  const animRef  = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem(TUTORIAL_KEY).then(val => {
      if (!val) setVisible(true);
    });
  }, []);

  useEffect(() => {
    if (!visible) return;

    Animated.timing(overlayOp, {
      toValue: 1, duration: 500, useNativeDriver: true,
    }).start();

    const swipe = (dx, dy, opAnim) => Animated.sequence([
      Animated.parallel([
        Animated.timing(fingerX, { toValue: dx, duration: 700, easing: EASE_OUT, useNativeDriver: true }),
        Animated.timing(fingerY, { toValue: dy, duration: 700, easing: EASE_OUT, useNativeDriver: true }),
        Animated.timing(opAnim,  { toValue: 1,  duration: 320, delay: 280,       useNativeDriver: true }),
      ]),
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(fingerX, { toValue: 0,  duration: 380, easing: EASE_BACK, useNativeDriver: true }),
        Animated.timing(fingerY, { toValue: 0,  duration: 380, easing: EASE_BACK, useNativeDriver: true }),
        Animated.timing(opAnim,  { toValue: 0,  duration: 200,                    useNativeDriver: true }),
      ]),
      Animated.delay(420),
    ]);

    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        swipe(SWIPE_X,  0,        rightOp),
        swipe(0,        -SWIPE_Y, upOp),
        swipe(-SWIPE_X, 0,        leftOp),
      ])
    );
    animRef.current = anim;
    anim.start();

    return () => {
      anim.stop();
      [fingerX, fingerY, rightOp, upOp, leftOp].forEach(v => v.setValue(0));
    };
  }, [visible]);

  const dismiss = async () => {
    animRef.current?.stop();
    await AsyncStorage.setItem(TUTORIAL_KEY, '1');
    Animated.timing(overlayOp, {
      toValue: 0, duration: 280, useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <TouchableOpacity style={{ flex: 1 }} onPress={dismiss} activeOpacity={1}>
        <Animated.View style={[s.overlay, { opacity: overlayOp }]}>

          <Text style={s.title}>Como estudar</Text>
          <Text style={s.subtitle}>Deslize o card em 3 direções</Text>

          <View style={s.stage}>

            {/* ← Errei */}
            <Animated.View style={[s.sideLabel, { opacity: leftOp, alignItems: 'flex-end' }]}>
              <Ionicons name="close-circle" size={22} color="#EF4444" />
              <Text style={[s.labelTxt, { color: '#EF4444' }]}>Errei</Text>
            </Animated.View>

            {/* Centro: label topo + card + dedo */}
            <View style={s.center}>

              {/* ↑ Quase */}
              <Animated.View style={[s.topLabel, { opacity: upOp }]}>
                <Ionicons name="remove-circle" size={20} color="#F59E0B" />
                <Text style={[s.labelTxt, { color: '#F59E0B' }]}>Quase</Text>
              </Animated.View>

              {/* Container do card + dedo (dedo pode vazar para fora) */}
              <View style={s.cardWrap}>
                <View style={s.card}>
                  <View style={s.holes}>
                    <View style={s.hole} />
                    <View style={s.hole} />
                    <View style={s.hole} />
                  </View>
                  <View style={s.cardBody}>
                    <View style={[s.line, { width: '100%' }]} />
                    <View style={[s.line, { width: '68%', marginTop: 8 }]} />
                    <View style={[s.line, { width: '85%', marginTop: 22 }]} />
                    <View style={[s.line, { width: '55%', marginTop: 8 }]} />
                  </View>
                </View>

                {/* Dedo animado */}
                <Animated.View
                  pointerEvents="none"
                  style={[s.finger, {
                    transform: [{ translateX: fingerX }, { translateY: fingerY }],
                  }]}
                />
              </View>

            </View>

            {/* → Memorizado */}
            <Animated.View style={[s.sideLabel, { opacity: rightOp, alignItems: 'flex-start' }]}>
              <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
              <Text style={[s.labelTxt, { color: '#22C55E' }]}>Memorizado</Text>
            </Animated.View>

          </View>

          <Text style={s.hint}>Toque em qualquer lugar para começar</Text>

        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    marginBottom: 44,
  },

  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 50,
  },

  sideLabel: {
    width: 86,
    gap: 5,
  },
  labelTxt: {
    fontSize: 13,
    fontWeight: '700',
  },

  center: {
    alignItems: 'center',
  },

  topLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    marginBottom: 10,
  },

  cardWrap: {
    width: CARD_W,
    height: CARD_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.backgroundTertiary,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  holes: {
    width: 22,
    paddingVertical: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: theme.backgroundTertiary,
  },
  hole: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.primary + '80',
    backgroundColor: theme.background,
  },
  cardBody: {
    flex: 1,
    padding: 14,
  },
  line: {
    height: 9,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
  },

  finger: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 12,
  },

  hint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
  },
});

export default SwipeTutorial;
