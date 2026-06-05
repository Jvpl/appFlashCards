/**
 * BottomSheet — Reanimated + RNGH
 *
 * Sheet fixo em 90% da tela — nunca muda de tamanho.
 *
 * Teclado:
 *   onKeyboardSettle (Kotlin via WindowInsetsAnimationCompat) emite a altura
 *   do teclado em dp quando a animação termina. O ScrollView interno recebe
 *   paddingBottom = kbHeight via useAnimatedStyle (UI thread, sem bridge).
 *   Isso empurra o conteúdo para cima dentro do sheet, deixando o input visível.
 *
 * Pan gesture:
 *   Desabilitado enquanto teclado estiver aberto (kbHeight > 0).
 *   Sem teclado: pan fecha o sheet quando scrollY === 0 e arrasta para baixo.
 *
 * Scroll vs swipe:
 *   useAnimatedScrollHandler lê scrollY na UI thread (sem bridge).
 */

import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, TouchableWithoutFeedback, View, Modal, Dimensions } from 'react-native';
import { NativeKeyboardAvoidingContainer } from '../../native/NativeKeyboardAvoidingContainer';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  ScrollView as RNGHScrollView,
} from 'react-native-gesture-handler';

const AnimatedScrollView = Animated.createAnimatedComponent(RNGHScrollView);

const SPRING_CONFIG = {
  damping: 50,
  stiffness: 400,
  mass: 0.5,
  overshootClamping: true,
};

const { height: SCREEN_HEIGHT } = Dimensions.get('screen');

export function BottomSheet({ visible, onDismiss, snapPoint = '90%', scrollRef, children }) {
  const sheetHeight = snapPoint.endsWith('%')
    ? Math.floor(SCREEN_HEIGHT * (parseFloat(snapPoint) / 100))
    : parseFloat(snapPoint);

  const translateY = useSharedValue(sheetHeight);
  const backdropOpacity = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const context = useSharedValue(0);
  const kbHeight = useSharedValue(0);
  const scrollViewRef = useRef(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const open = useCallback(() => {
    translateY.value = withSpring(0, SPRING_CONFIG);
    backdropOpacity.value = withTiming(0.6, { duration: 300 });
  }, []);

  const close = useCallback(() => {
    translateY.value = withSpring(sheetHeight, SPRING_CONFIG);
    backdropOpacity.value = withTiming(0, { duration: 250 });
  }, [sheetHeight]);

  useEffect(() => {
    if (visible) open(); else close();
  }, [visible]);

  const callDismiss = useCallback(() => onDismiss(), [onDismiss]);

  const onKeyboardSettle = useCallback((e) => {
    kbHeight.value = e.nativeEvent.height;
  }, []);

  const panGesture = Gesture.Pan()
    .simultaneousWithExternalGesture(scrollViewRef)
    .activeOffsetY([-5, 5])
    .failOffsetX([-10, 10])
    .onStart(() => {
      context.value = translateY.value;
    })
    .onUpdate((e) => {
      // Com teclado aberto: pan desabilitado, scroll livre
      if (kbHeight.value > 0) return;
      if (e.translationY <= 0) return;
      if (scrollY.value > 2) return;
      const newY = context.value + e.translationY;
      translateY.value = newY;
      backdropOpacity.value = interpolate(newY, [0, sheetHeight], [0.6, 0], Extrapolation.CLAMP);
    })
    .onEnd((e) => {
      // Com teclado aberto: ignora swipe, não fecha o sheet
      if (kbHeight.value > 0) {
        translateY.value = withSpring(0, SPRING_CONFIG);
        return;
      }
      if (scrollY.value > 2 || e.translationY <= 0) {
        translateY.value = withSpring(0, SPRING_CONFIG);
        backdropOpacity.value = withTiming(0.6, { duration: 200 });
        return;
      }
      if (e.translationY > sheetHeight * 0.4 || e.velocityY > 1000) {
        translateY.value = withSpring(sheetHeight, SPRING_CONFIG);
        backdropOpacity.value = withTiming(0, { duration: 250 });
        runOnJS(callDismiss)();
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG);
        backdropOpacity.value = withTiming(0.6, { duration: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const scrollViewStyle = useAnimatedStyle(() => ({
    flex: 1,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <TouchableWithoutFeedback onPress={onDismiss}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </TouchableWithoutFeedback>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheet, { height: sheetHeight }, sheetStyle]}>
            <View style={styles.handleArea}>
              <View style={styles.handle} />
            </View>

            <NativeKeyboardAvoidingContainer
              style={{ flex: 1 }}
              onKeyboardSettle={onKeyboardSettle}
            >
              <AnimatedScrollView
                ref={(r) => {
                  scrollViewRef.current = r;
                  if (scrollRef) scrollRef.current = r;
                }}
                style={scrollViewStyle}
                contentContainerStyle={{ flexGrow: 1 }}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
              >
                {children}
              </AnimatedScrollView>
            </NativeKeyboardAvoidingContainer>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#202020',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  handleArea: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4A5568',
  },
});
