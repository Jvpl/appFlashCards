import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

export function FadeInView({ children, style }) {
  const isFocused = useIsFocused();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isFocused) {
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      opacity.value = 0; // Reseta para 0 quando sai, para animar de novo ao entrar
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[style, animatedStyle, { flex: 1 }]}>
      {children}
    </Animated.View>
  );
}

export default FadeInView;
