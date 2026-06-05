import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Modal, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SvgXml } from 'react-native-svg';
import theme from '../../styles/theme';

const ICON_ACERTO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40.64 30.13"><path fill="#6fb631" d="M39.54,.95c-1.41-1.32-3.62-1.25-4.95,.16L15.13,21.84,5.73,14.08c-1.49-1.23-3.7-1.02-4.93,.47-1.23,1.49-1.02,3.7,.47,4.93l11.93,9.86c.65,.54,1.44,.8,2.23,.8,.94,0,1.87-.37,2.55-1.1L39.7,5.89c1.32-1.41,1.25-3.62-.16-4.95Z"/></svg>`;
const ICON_QUASE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40.65 30.13"><path fill="#1cabcd" d="M5.32,10.13l5.75-2.55c2.27-1.01,5.39-.68,7.42,.77,2.45,1.75,5.52,2.67,8.57,2.67,1.99,0,3.97-.39,5.76-1.18l5.75-2.55c1.77-.78,2.56-2.85,1.78-4.62-.78-1.77-2.85-2.57-4.62-1.78l-5.75,2.55c-2.27,1.01-5.39,.68-7.42-.77C18.52-.23,12.76-.83,8.23,1.18L2.48,3.73C.72,4.51-.08,6.58,.7,8.35s2.85,2.56,4.62,1.78Z"/><path fill="#1cabcd" d="M35.33,20l-5.75,2.55c-2.27,1.01-5.39,.68-7.42-.77-4.04-2.9-9.8-3.49-14.33-1.49l-5.75,2.55c-1.77,.78-2.57,2.85-1.78,4.62,.78,1.77,2.85,2.56,4.62,1.78l5.75-2.55c2.27-1,5.39-.68,7.42,.77,2.45,1.75,5.52,2.67,8.57,2.67,1.99,0,3.97-.39,5.76-1.18l5.75-2.55c1.77-.78,2.57-2.85,1.78-4.62-.78-1.77-2.85-2.57-4.62-1.78Z"/></svg>`;
const ICON_ERRO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38.75 38.75"><path fill="#e94542" d="M24.32,19.37l13.4-13.4c1.37-1.37,1.37-3.58,0-4.95-1.37-1.37-3.58-1.37-4.95,0l-13.4,13.4L5.97,1.03C4.61-.34,2.39-.34,1.03,1.03-.34,2.39-.34,4.61,1.03,5.97l13.4,13.4L1.03,32.77c-1.37,1.37-1.37,3.58,0,4.95,.68,.68,1.58,1.03,2.47,1.03s1.79-.34,2.47-1.03l13.4-13.4,13.4,13.4c.68,.68,1.58,1.03,2.47,1.03s1.79-.34,2.47-1.03c1.37-1.37,1.37-3.58,0-4.95l-13.4-13.4Z"/></svg>`;

const { width: W } = Dimensions.get('window');
const TUTORIAL_KEY = '@FlashcardsApp:swipeTutorialSeen';
const CARD_W = Math.min(W * 0.52, 190);
const CARD_H = CARD_W * 1.4;
const SWIPE_X = CARD_W * 0.45;
const SWIPE_Y = 70;
const EASE_OUT = Easing.bezier(0.25, 0.46, 0.45, 0.94);
const EASE_BACK = Easing.bezier(0.55, 0.06, 0.68, 0.19);

// Fase 1: toque para virar o card
const Phase1 = ({ onNext }) => {
  const fingerY = useRef(new Animated.Value(0)).current;
  const fingerOp = useRef(new Animated.Value(1)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);

  useEffect(() => {
    const tap = Animated.sequence([
      Animated.delay(800),
      // dedo aparece e toca
      Animated.parallel([
        Animated.timing(fingerY, { toValue: 10, duration: 300, easing: EASE_OUT, useNativeDriver: true }),
        Animated.timing(fingerOp, { toValue: 0.6, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(200),
      // card vira
      Animated.timing(flipAnim, { toValue: 1, duration: 500, easing: EASE_OUT, useNativeDriver: true }),
      Animated.delay(1200),
      // volta
      Animated.parallel([
        Animated.timing(flipAnim, { toValue: 0, duration: 500, easing: EASE_OUT, useNativeDriver: true }),
        Animated.timing(fingerY, { toValue: 0, duration: 300, easing: EASE_BACK, useNativeDriver: true }),
        Animated.timing(fingerOp, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(600),
    ]);

    const anim = Animated.loop(tap);
    animRef.current = anim;
    anim.start();
    return () => { anim.stop(); };
  }, []);

  const frontRotateY = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotateY  = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity  = flipAnim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1] });

  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={s.title}>Como estudar</Text>
      <Text style={s.subtitle}><Text style={s.highlight}>Toque</Text> no <Text style={s.highlight}>card</Text> para revelar a resposta</Text>

      <View style={[s.cardWrap, { marginBottom: 50, marginTop: 10 }]}>
        {/* Frente */}
        <Animated.View style={[s.card, { opacity: frontOpacity, transform: [{ perspective: 800 }, { rotateY: frontRotateY }] }]}>
          <View style={s.cardBody}>
            <View style={[s.line, { width: '70%' }]} />
            <View style={[s.line, { width: '90%', marginTop: 8 }]} />
            <View style={[s.line, { width: '60%', marginTop: 8 }]} />
          </View>
        </Animated.View>
        {/* Verso */}
        <Animated.View style={[s.card, { opacity: backOpacity, backgroundColor: theme.backgroundTertiary, transform: [{ perspective: 800 }, { rotateY: backRotateY }] }]}>
          <View style={s.cardBody}>
            <View style={[s.line, { width: '80%', backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            <View style={[s.line, { width: '60%', marginTop: 8, backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            <View style={[s.line, { width: '75%', marginTop: 8, backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          </View>
        </Animated.View>

        {/* Dedo */}
        <Animated.View
          pointerEvents="none"
          style={[s.finger, { transform: [{ translateY: fingerY }], opacity: fingerOp }]}
        />
      </View>

      {/* Dots + navegação */}
      <View style={s.dotsRow}>
        <View style={[s.dot, s.dotActive]} />
        <View style={s.dot} />
      </View>
      <Text style={s.hint} onPress={onNext}>Toque para <Text style={s.highlight}>continuar</Text>  ➔</Text>
    </View>
  );
};

// Fase 2: swipes
const Phase2 = ({ onBack, onDismiss }) => {
  const fingerX  = useRef(new Animated.Value(0)).current;
  const fingerY  = useRef(new Animated.Value(0)).current;
  const fingerOp = useRef(new Animated.Value(1)).current;
  const rightOp  = useRef(new Animated.Value(0)).current;
  const upOp     = useRef(new Animated.Value(0)).current;
  const leftOp   = useRef(new Animated.Value(0)).current;
  const animRef  = useRef(null);

  useEffect(() => {
    const swipe = (dx, dy, opAnim) => Animated.sequence([
      Animated.parallel([
        Animated.timing(fingerX,  { toValue: dx, duration: 700, easing: EASE_OUT, useNativeDriver: true }),
        Animated.timing(fingerY,  { toValue: dy, duration: 700, easing: EASE_OUT, useNativeDriver: true }),
        Animated.timing(fingerOp, { toValue: 0.3, duration: 300, delay: 400, useNativeDriver: true }),
        Animated.timing(opAnim,   { toValue: 1, duration: 320, delay: 280, useNativeDriver: true }),
      ]),
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(fingerX,  { toValue: 0, duration: 380, easing: EASE_BACK, useNativeDriver: true }),
        Animated.timing(fingerY,  { toValue: 0, duration: 380, easing: EASE_BACK, useNativeDriver: true }),
        Animated.timing(fingerOp, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(opAnim,   { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(420),
    ]);

    const anim = Animated.loop(Animated.sequence([
      Animated.delay(700),
      swipe(SWIPE_X, 0, rightOp),
      swipe(0, -SWIPE_Y, upOp),
      swipe(-SWIPE_X, 0, leftOp),
    ]));
    animRef.current = anim;
    anim.start();
    return () => {
      anim.stop();
      [fingerX, fingerY, fingerOp, rightOp, upOp, leftOp].forEach(v => v.setValue(0));
      fingerOp.setValue(1);
    };
  }, []);

  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={s.title}>Como avaliar</Text>
      <Text style={s.subtitle}>Deslize o card em <Text style={s.highlight}>3 direções</Text></Text>

      <View style={[s.stage, { marginTop: 30 }]}>
        {/* ← Errei */}
        <Animated.View style={[s.sideLabel, { opacity: leftOp, alignItems: 'center' }]}>
          <SvgXml xml={ICON_ERRO_SVG} width={14} height={14} />
          <Text style={[s.labelTxt, { color: '#e94542' }]}>Errei</Text>
        </Animated.View>

        <View style={s.center}>
          <View style={s.cardWrap}>
            {/* ↑ Quase */}
            <Animated.View style={{ opacity: upOp, position: 'absolute', top: -55, alignItems: 'center', alignSelf: 'center', gap: 5 }}>
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
            <Animated.View
              pointerEvents="none"
              style={[s.finger, { transform: [{ translateX: fingerX }, { translateY: fingerY }], opacity: fingerOp }]}
            />
          </View>
        </View>

        {/* → Acertei */}
        <Animated.View style={[s.sideLabel, { opacity: rightOp, alignItems: 'center' }]}>
          <SvgXml xml={ICON_ACERTO_SVG} width={16} height={11} />
          <Text style={[s.labelTxt, { color: '#6fb631' }]}>Acertei</Text>
        </Animated.View>
      </View>

      {/* Dots + navegação */}
      <View style={s.dotsRow}>
        <View style={s.dot} />
        <View style={[s.dot, s.dotActive]} />
      </View>
      <Text style={s.hint} onPress={onDismiss}>Toque para <Text style={s.highlight}>começar</Text></Text>
    </View>
  );
};

export const SwipeTutorial = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState(1);
  const manuallyShown = useRef(false);
  const overlayOp = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    show: () => { manuallyShown.current = true; setPhase(1); setVisible(true); },
  }));

  useEffect(() => {
    AsyncStorage.getItem(TUTORIAL_KEY).then(val => {
      if (!val) { setPhase(1); setVisible(true); }
    });
  }, []);

  useEffect(() => {
    if (!visible) return;
    Animated.timing(overlayOp, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [visible]);

  const dismiss = async () => {
    if (!manuallyShown.current) await AsyncStorage.setItem(TUTORIAL_KEY, '1');
    manuallyShown.current = false;
    Animated.timing(overlayOp, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => setVisible(false));
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={phase === 1 ? () => setPhase(2) : dismiss}
        activeOpacity={1}
      >
        <Animated.View style={[s.overlay, { opacity: overlayOp }]}>
          {phase === 1
            ? <Phase1 onNext={() => setPhase(2)} />
            : <Phase2 onBack={() => setPhase(1)} onDismiss={dismiss} />
          }
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
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 16,
  },
  hint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    textAlign: 'center',
  },
  highlight: {
    color: '#337418',
    fontWeight: '700',
  },
});

export default SwipeTutorial;
