import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Svg, { Circle, Path, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Canvas, Circle as SkiaCircle, BlurMask } from '@shopify/react-native-skia';
import { Feather } from '@expo/vector-icons';

const LEVEL_NAMES = [
  'Marco Zero', 'Aprendiz', 'Em Progresso',
  'Consolidando', 'Confiante', 'Dominado',
];

// [cor escura, cor clara] — gradiente do ring
const RING_GRADIENTS = [
  ['#2A2F3A', '#3D4451'],
  ['#0D2B1E', '#2D6A4F'],
  ['#1B4332', '#40916C'],
  ['#2D6A4F', '#52B788'],
  ['#40916C', '#74C69D'],
  ['#2D9E00', '#5DD62C'],
];

const RING_FILL = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

const VB_W = 975.35;
const VB_H = 220;
const VB_Y = -10; // espaço para o stroke do ring não ser clipado no topo
const CX = 157.58;
const CY = 81.98;
const R = 66.98;
const RING_STROKE = 15; // espessura exata do anel cinza: 81.98 - 66.98
const RING_R = 74.48; // centro exato do anel: (66.98 + 81.98) / 2
const CIRC = 2 * Math.PI * RING_R;
const FOOTER_H = 95;

export const CardFooter = ({ level, currentIndex, totalCards, onEdit, onEditPressIn }) => {
  const { width: screenW } = useWindowDimensions();
  const cardW = screenW * 0.9;

  const lvl = Math.min(Math.max(level || 0, 0), 5);
  const name = LEVEL_NAMES[lvl];
  const [gradStart, gradEnd] = RING_GRADIENTS[lvl];
  const fill = RING_FILL[lvl];
  const dashOffset = CIRC * (1 - fill);
  const isMax = lvl === 5;
  const gradientId = `ringGrad${lvl}`;

  const scale = Math.min(cardW / VB_W, FOOTER_H / VB_H);
  // Posição e tamanho do ring em pixels reais (para o Canvas Skia)
  // VB_Y desloca o viewBox, então compensa subtraindo VB_Y * scale
  const ringCX = CX * scale;
  const ringCY = (CY - VB_Y) * scale;
  const ringR = RING_R * scale;
  const glowBlur = ringR * 0.35;
  const glowPad = glowBlur * 3;

  return (
    <View style={{ width: '100%', height: FOOTER_H }}>

      {/* Glow Skia no ring — nível 5 */}
      {isMax && (
        <Canvas
          style={{
            position: 'absolute',
            top: ringCY - ringR - glowPad,
            left: ringCX - ringR - glowPad,
            width: (ringR + glowPad) * 2,
            height: (ringR + glowPad) * 2,
          }}
          pointerEvents="none"
        >
          <SkiaCircle
            cx={ringR + glowPad}
            cy={ringR + glowPad}
            r={ringR}
            color="#5DD62C"
            opacity={0.5}
          >
            <BlurMask blur={glowBlur} style="outer" respectCTM={false} />
          </SkiaCircle>
        </Canvas>
      )}

      {/* SVG com estrutura + ring + textos */}
      <Svg
        width={cardW}
        height={FOOTER_H}
        viewBox={`0 ${VB_Y} ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMinYMin meet"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <Path
          d="M239.5,84.4H975.35v-5.29H239.49C237.97,35.23,201.82,0,157.58,0S77.19,35.23,75.67,79.11H0v5.29H75.66c1.29,44.09,37.53,79.56,81.92,79.56,11.7,0,22.82-2.48,32.9-6.91l12.65,19.83c2.13,3.34,5.78,5.34,9.74,5.35l24.92,.04v22.81c0,1.43,1.16,2.58,2.58,2.58s2.58-1.16,2.58-2.58v-54.48c0-1.43-1.16-2.58-2.58-2.58s-2.58,1.16-2.58,2.58v24.67l-24.91-.04c-1.57,0-3.01-.79-3.85-2.12l-12.22-19.16c24.79-13.56,41.83-39.57,42.7-69.55Zm-81.92,64.56c-36.93,0-66.98-30.05-66.98-66.98S120.65,15,157.58,15s66.98,30.05,66.98,66.98-30.05,66.98-66.98,66.98Z"
          fill="rgba(255,255,255,0.15)"
        />
        {fill > 0 && (
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradStart} stopOpacity="1" />
              <Stop offset="1" stopColor={gradEnd} stopOpacity="1" />
            </LinearGradient>
          </Defs>
        )}
        {fill > 0 && (
          <Circle
            cx={CX} cy={CY} r={RING_R}
            stroke={`url(#${gradientId})`} strokeWidth={RING_STROKE} fill="none"
            strokeDasharray={`${CIRC * fill} ${CIRC * (1 - fill)}`}
            strokeDashoffset={0}
            strokeLinecap="round" rotation="-90" origin={`${CX}, ${CY}`}
          />
        )}
        <SvgText
          x={CX} y={CY + 21}
          textAnchor="middle"
          fill="#F8F8F8"
          fontSize={60}
          fontWeight="700"
        >{lvl}</SvgText>
        <SvgText
          x={CX + R + 26} y={CY + 85}
          fill="#ffffffa1"
          fontSize={35}
          fontWeight="500"
          letterSpacing={3}
          fontFamily="serif"
        >NÍVEL</SvgText>
        <SvgText
          x={CX + R + 26} y={CY + 130}
          fill="#F8F8F8"
          fontSize={45}
          fontWeight="700"
        >{name}</SvgText>
      </Svg>

      {/* Lápis + divisor + contador */}
      <View style={{
        position: 'absolute',
        right: 24,
        top: 50,
        height: 28,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <TouchableOpacity
          onPressIn={() => { onEditPressIn && onEditPressIn(); }}
          onPress={() => { onEdit && onEdit(); }}
          style={{
            width: 34, height: 34,
            justifyContent: 'center', alignItems: 'center',
            borderRadius: 6, borderWidth: 1,
            borderColor: 'rgba(93,214,44,0.4)',
          }}>
          <Feather name="edit-2" size={15} color="#A0A0A0" />
        </TouchableOpacity>
        <View style={{ width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 8 }} />
        <Text style={{ color: '#F8F8F8', fontSize: 15, fontWeight: '600' }}>
          {(currentIndex ?? 0) + 1} / {totalCards ?? 1}
        </Text>
      </View>

    </View>
  );
};

export default CardFooter;
