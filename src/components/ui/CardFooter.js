import React from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';

const LEVEL_NAMES = [
  'Marco Zero', 'Aprendiz', 'Em Progresso',
  'Consolidando', 'Confiante', 'Dominado',
];

const RING_COLORS = [
  '#3D4451',
  '#1B4332',
  '#2D6A4F',
  '#40916C',
  '#52B788',
  '#5DD62C',
];

const RING_FILL = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

// SVG original viewBox: 0 0 975.35 207.66
// Círculo: cx=157.58, cy=81.98, r=66.98
// Tick do callout termina em: x=189.55, y=207.66
const VB_W = 975.35;
const VB_H = 220;
const CX = 157.58;
const CY = 81.98;
const R = 66.98;
const RING_STROKE = 8;
const CIRC = 2 * Math.PI * (R - RING_STROKE / 2);

// Posição do texto no viewBox (ao lado do tick)
const TEXT_X = 200;
const TEXT_Y = 207.66; // base do tick

const FOOTER_H = 95;

export const CardFooter = ({ level, currentIndex, totalCards, onEdit, onEditPressIn }) => {
  const { width: screenW } = useWindowDimensions();
  const cardW = screenW * 0.9;

  const lvl = Math.min(Math.max(level || 0, 0), 5);
  const name = LEVEL_NAMES[lvl];
  const color = RING_COLORS[lvl];
  const fill = RING_FILL[lvl];
  const dashOffset = CIRC * (1 - fill);
  const isMax = lvl === 5;

  // Escala real: SVG width=cardW, viewBox VB_W x VB_H, preserveAspectRatio meet
  const scale = Math.min(cardW / VB_W, FOOTER_H / VB_H);
  // Posições em pixels para os elementos React Native (lápis+contador)
  const lineCenterY = CY * scale; // Y da linha horizontal em px
  // Posição direita dos elementos: alinhados com a linha
  const rightTop = lineCenterY - 14;

  return (
    <View style={{ width: '100%', height: FOOTER_H }}>

      {/* SVG com estrutura + texto NÍVEL + nome dentro do viewBox */}
      <Svg
        width={cardW}
        height={FOOTER_H}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMinYMin meet"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {/* Estrutura cinza */}
        <Path
          d="M239.5,84.4H975.35v-5.29H239.49C237.97,35.23,201.82,0,157.58,0S77.19,35.23,75.67,79.11H0v5.29H75.66c1.29,44.09,37.53,79.56,81.92,79.56,11.7,0,22.82-2.48,32.9-6.91l12.65,19.83c2.13,3.34,5.78,5.34,9.74,5.35l24.92,.04v22.81c0,1.43,1.16,2.58,2.58,2.58s2.58-1.16,2.58-2.58v-54.48c0-1.43-1.16-2.58-2.58-2.58s-2.58,1.16-2.58,2.58v24.67l-24.91-.04c-1.57,0-3.01-.79-3.85-2.12l-12.22-19.16c24.79-13.56,41.83-39.57,42.7-69.55Zm-81.92,64.56c-36.93,0-66.98-30.05-66.98-66.98S120.65,15,157.58,15s66.98,30.05,66.98,66.98-30.05,66.98-66.98,66.98Z"
          fill="rgba(255,255,255,0.15)"
        />
        {/* Ring de progresso */}
        {fill > 0 && (
          <Circle
            cx={CX} cy={CY} r={R - RING_STROKE / 2}
            stroke={color} strokeWidth={RING_STROKE} fill="none"
            strokeDasharray={`${CIRC}`} strokeDashoffset={dashOffset}
            strokeLinecap="round" rotation="-90" origin={`${CX}, ${CY}`}
          />
        )}
        {/* Número dentro do círculo */}
        <SvgText
          x={CX} y={CY + 21}
          textAnchor="middle"
          fill="#F8F8F8"
          fontSize={60}
          fontWeight="700"
        >{lvl}</SvgText>
        {/* Label NÍVEL — abaixo da linha */}
        <SvgText
          x={CX + R + 26} y={CY + 85}
          fill="#ffffffa1"
          fontSize={35}
          fontWeight="500"
          letterSpacing={3}
          fontFamily="serif"
        >NÍVEL</SvgText>
        {/* Nome do nível */}
        <SvgText
          x={CX + R + 26} y={CY + 130}
          fill="#F8F8F8"
          fontSize={45}
          fontWeight="700"
        >{name}</SvgText>

      </Svg>

      {/* Lápis + divisor + contador — abaixo da linha, no fundo do footer */}
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
