import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Modal, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import theme from '../../styles/theme';

const ICON_QUASE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40.65 30.13"><path fill="#1cabcd" d="M5.32,10.13l5.75-2.55c2.27-1.01,5.39-.68,7.42,.77,2.45,1.75,5.52,2.67,8.57,2.67,1.99,0,3.97-.39,5.76-1.18l5.75-2.55c1.77-.78,2.56-2.85,1.78-4.62-.78-1.77-2.85-2.57-4.62-1.78l-5.75,2.55c-2.27,1.01-5.39,.68-7.42-.77C18.52-.23,12.76-.83,8.23,1.18L2.48,3.73C.72,4.51-.08,6.58,.7,8.35s2.85,2.56,4.62,1.78Z"/><path fill="#1cabcd" d="M35.33,20l-5.75,2.55c-2.27,1.01-5.39,.68-7.42-.77-4.04-2.9-9.8-3.49-14.33-1.49l-5.75,2.55c-1.77,.78-2.57,2.85-1.78,4.62,.78,1.77,2.85,2.56,4.62,1.78l5.75-2.55c2.27-1,5.39-.68,7.42,.77,2.45,1.75,5.52,2.67,8.57,2.67,1.99,0,3.97-.39,5.76-1.18l5.75-2.55c1.77-.78,2.57-2.85,1.78-4.62-.78-1.77-2.85-2.57-4.62-1.78Z"/></svg>`;

const { width: W } = Dimensions.get('window');
const TUTORIAL_KEY = '@FlashcardsApp:swipeTutorialSeen';
const CARD_W = Math.min(W * 0.52, 190);
const CARD_H = CARD_W * 1.4;
const SWIPE_X = CARD_W * 0.45;
const SWIPE_Y = 70;
const EASE_OUT = Easing.bezier(0.25, 0.46, 0.45, 0.94);
const EASE_BACK = Easing.bezier(0.55, 0.06, 0.68, 0.19);

export const SwipeTutorial = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const manuallyShown = useRef(false);

  useImperativeHandle(ref, () => ({
    show: () => { manuallyShown.current = true; setVisible(true); },
  }));

  const fingerX  = useRef(new Animated.Value(0)).current;
  const fingerY  = useRef(new Animated.Value(0)).current;
  const fingerOp = useRef(new Animated.Value(1)).current;
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
        Animated.timing(fingerX,  { toValue: dx, duration: 700, easing: EASE_OUT, useNativeDriver: true }),
        Animated.timing(fingerY,  { toValue: dy, duration: 700, easing: EASE_OUT, useNativeDriver: true }),
        Animated.timing(fingerOp, { toValue: 0.3, duration: 300, delay: 400,      useNativeDriver: true }),
        Animated.timing(opAnim,   { toValue: 1,  duration: 320, delay: 280,       useNativeDriver: true }),
      ]),
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(fingerX,  { toValue: 0,  duration: 380, easing: EASE_BACK, useNativeDriver: true }),
        Animated.timing(fingerY,  { toValue: 0,  duration: 380, easing: EASE_BACK, useNativeDriver: true }),
        Animated.timing(fingerOp, { toValue: 1,  duration: 200,                    useNativeDriver: true }),
        Animated.timing(opAnim,   { toValue: 0,  duration: 200,                    useNativeDriver: true }),
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
      [fingerX, fingerY, fingerOp, rightOp, upOp, leftOp].forEach(v => v.setValue(0));
      fingerOp.setValue(1);
    };
  }, [visible]);

  const dismiss = async () => {
    animRef.current?.stop();
    if (!manuallyShown.current) await AsyncStorage.setItem(TUTORIAL_KEY, '1');
    manuallyShown.current = false;
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
            <Animated.View style={[s.sideLabel, { opacity: leftOp, alignItems: 'center' }]}>
              <Ionicons name="close-circle" size={22} color="#EF4444" />
              <Text style={[s.labelTxt, { color: '#EF4444' }]}>Errei</Text>
            </Animated.View>

            {/* Centro: label topo + card + dedo */}
            <View style={s.center}>

              <View style={s.cardWrap}>
                {/* ↑ Quase — absoluto acima do card */}
                <Animated.View style={[{ opacity: upOp, position: 'absolute', top: -55, alignItems: 'center', alignSelf: 'center' }]}>
                  <SvgXml xml={ICON_QUASE_SVG} width={16} height={11} />
                  <Text style={[s.labelTxt, { color: '#1cabcd' }]}>Quase</Text>
                </Animated.View>
                <View style={s.card}>
                  <View style={s.cardBody}>
                    <View style={[s.line, { width: '70%' }]} />
                    <View style={[s.line, { width: '90%', marginTop: 8 }]} />
                    <View style={[s.line, { width: '60%', marginTop: 8 }]} />
                    <View style={[s.line, { width: '80%', marginTop: 22 }]} />
                    <View style={[s.line, { width: '50%', marginTop: 8 }]} />
                  </View>
                </View>
                {/* Dedo — overflow visível para passar por cima dos labels */}
                <Animated.View
                  pointerEvents="none"
                  style={[s.finger, {
                    transform: [{ translateX: fingerX }, { translateY: fingerY }],
                    opacity: fingerOp,
                  }]}
                />
              </View>

            </View>

            {/* → Memorizado — renderizado depois do center para ficar na frente do dedo */}
            <Animated.View style={[s.sideLabel, { opacity: rightOp, alignItems: 'center' }]}>
              <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
              <Text style={[s.labelTxt, { color: '#22C55E' }]}>Acertei</Text>
            </Animated.View>

          </View>

          <Text style={s.hint}>Toque em qualquer lugar para começar</Text>

        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
});

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
    marginTop: 30,
  },

  sideLabel: {
    width: 86,
    gap: 5,
    zIndex: 10,
    paddingHorizontal: 10,
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
    marginBottom: 4,
  },

  cardWrap: {
    width: CARD_W,
    height: CARD_H,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  card: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.backgroundTertiary,
    overflow: 'hidden',
  },
  cardBody: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  line: {
    height: 9,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
  },

  finger: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.75)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1,
  },

  hint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
});

export default SwipeTutorial;
