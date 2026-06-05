import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Canvas, Circle, BlurMask } from '@shopify/react-native-skia';

/**
 * FAB com glow real via Skia BlurMask — funciona no Android e iOS.
 * O Canvas fica atrás do botão com margin negativa para não ocupar espaço.
 */
export function GlowFab({ onPress, style, color = '#5DD62C', size = 56, children, activeOpacity = 0.85, disabled = false }) {
  const radius = size / 2;
  const glowBlur = 8;
  const pad = glowBlur * 2;
  const canvasSize = size + pad * 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
      {/* Glow via Skia — centralizado, com blur real */}
      <Canvas
        style={{
          position: 'absolute',
          width: canvasSize,
          height: canvasSize,
          top: -pad,
          left: -pad,
        }}
        pointerEvents="none"
      >
        <Circle cx={canvasSize / 2} cy={canvasSize / 2} r={radius} color={color} opacity={0.45}>
          <BlurMask blur={glowBlur} style="outer" respectCTM={false} />
        </Circle>
      </Canvas>

      <TouchableOpacity
        onPress={onPress}
        activeOpacity={activeOpacity}
        disabled={disabled}
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: color,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 4,
          },
          style,
        ]}
      >
        {children}
      </TouchableOpacity>
    </View>
  );
}

export default GlowFab;
