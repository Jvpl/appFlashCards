import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { SvgXml } from 'react-native-svg';
import { Canvas, Path as SkiaPath, BlurMask, Skia } from '@shopify/react-native-skia';
import theme from '../../styles/theme';

const RING_GRADIENTS = [
  ['#2A2F3A', '#3D4451'],
  ['#0D2B1E', '#2D6A4F'],
  ['#1B4332', '#40916C'],
  ['#2D6A4F', '#52B788'],
  ['#40916C', '#74C69D'],
  ['#2D9E00', '#5DD62C'],
];
const RING_FILL   = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
const RING_COLORS = [
  theme.srsLevel0, theme.srsLevel1, theme.srsLevel2,
  theme.srsLevel3, theme.srsLevel4, theme.srsLevel5,
];

const LEVELS = [
  { level: 0, name: 'Marco Zero',   interval: '1 min'           },
  { level: 1, name: 'Aprendiz',     interval: '10 min'          },
  { level: 2, name: 'Em Progresso', interval: '1 hora'          },
  { level: 3, name: 'Consolidando', interval: '6 horas'         },
  { level: 4, name: 'Confiante',    interval: '1 dia'           },
  { level: 5, name: 'Dominado',     interval: '7–30 dias'       },
];

const ICON_ACERTO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40.64 30.13"><path fill="#6fb631" d="M39.54,.95c-1.41-1.32-3.62-1.25-4.95,.16L15.13,21.84,5.73,14.08c-1.49-1.23-3.7-1.02-4.93,.47-1.23,1.49-1.02,3.7,.47,4.93l11.93,9.86c.65,.54,1.44,.8,2.23,.8,.94,0,1.87-.37,2.55-1.1L39.7,5.89c1.32-1.41,1.25-3.62-.16-4.95Z"/></svg>`;
const ICON_QUASE  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40.65 30.13"><path fill="#1cabcd" d="M5.32,10.13l5.75-2.55c2.27-1.01,5.39-.68,7.42,.77,2.45,1.75,5.52,2.67,8.57,2.67,1.99,0,3.97-.39,5.76-1.18l5.75-2.55c1.77-.78,2.56-2.85,1.78-4.62-.78-1.77-2.85-2.57-4.62-1.78l-5.75,2.55c-2.27,1.01-5.39,.68-7.42-.77C18.52-.23,12.76-.83,8.23,1.18L2.48,3.73C.72,4.51-.08,6.58,.7,8.35s2.85,2.56,4.62,1.78Z"/><path fill="#1cabcd" d="M35.33,20l-5.75,2.55c-2.27,1.01-5.39,.68-7.42-.77-4.04-2.9-9.8-3.49-14.33-1.49l-5.75,2.55c-1.77,.78-2.57,2.85-1.78,4.62,.78,1.77,2.85,2.56,4.62,1.78l5.75-2.55c2.27-1,5.39-.68,7.42,.77,2.45,1.75,5.52,2.67,8.57,2.67,1.99,0,3.97-.39,5.76-1.18l5.75-2.55c1.77-.78,2.57-2.85,1.78-4.62-.78-1.77-2.85-2.57-4.62-1.78Z"/></svg>`;
const ICON_ERRO   = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38.75 38.75"><path fill="#e94542" d="M24.32,19.37l13.4-13.4c1.37-1.37,1.37-3.58,0-4.95-1.37-1.37-3.58-1.37-4.95,0l-13.4,13.4L5.97,1.03C4.61-.34,2.39-.34,1.03,1.03-.34,2.39-.34,4.61,1.03,5.97l13.4,13.4L1.03,32.77c-1.37,1.37-1.37,3.58,0,4.95,.68,.68,1.58,1.03,2.47,1.03s1.79-.34,2.47-1.03l13.4-13.4,13.4,13.4c.68,.68,1.58,1.03,2.47,1.03s1.79-.34,2.47-1.03c1.37-1.37,1.37-3.58,0-4.95l-13.4-13.4Z"/></svg>`;

const RULES = [
  { svg: ICON_ACERTO, color: '#6fb631', label: 'Acertou 2×', desc: 'sobe 1 nível' },
  { svg: ICON_QUASE,  color: '#1cabcd', label: 'Quase',      desc: 'não avança, reinicia a contagem' },
  { svg: ICON_ERRO,   color: '#e94542', label: 'Errou',      desc: 'volta para Marco Zero ou Aprendiz' },
];

const SIZE = 44;
const STROKE = 4;
const R = (SIZE - STROKE) / 2;
const CX = SIZE / 2;
const CY = SIZE / 2;
const CIRC = 2 * Math.PI * R;

const SRS_COLORS = [
  theme.srsLevel0, theme.srsLevel1, theme.srsLevel2,
  theme.srsLevel3, theme.srsLevel4, theme.srsLevel5,
];

const GLOW_PAD = 8;
const CANVAS_SIZE = SIZE + GLOW_PAD * 2;

const LevelRing = ({ level }) => {
  const fill = RING_FILL[level];
  const color = SRS_COLORS[level];
  return (
    <View style={{ width: SIZE, height: SIZE }}>
      {/* Glow apenas no arco colorido */}
      {fill > 0 && (() => {
        const cx = CANVAS_SIZE / 2;
        const cy = CANVAS_SIZE / 2;
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + 2 * Math.PI * fill;
        const x1 = cx + R * Math.cos(startAngle);
        const y1 = cy + R * Math.sin(startAngle);
        const x2 = cx + R * Math.cos(endAngle);
        const y2 = cy + R * Math.sin(endAngle);
        const largeArc = fill > 0.5 ? 1 : 0;
        const path = Skia.Path.Make();
        path.moveTo(x1, y1);
        path.arcToOval({ x: cx - R, y: cy - R, width: R * 2, height: R * 2 }, -90, fill * 360, false);
        const paint = Skia.Paint();
        paint.setColor(Skia.Color(color));
        paint.setStyle(1);
        paint.setStrokeWidth(STROKE);
        paint.setAlphaf(0.6);
        return (
          <Canvas style={{ position: 'absolute', top: -GLOW_PAD, left: -GLOW_PAD, width: CANVAS_SIZE, height: CANVAS_SIZE }} pointerEvents="none">
            <SkiaPath path={path} color={color} style="stroke" strokeWidth={STROKE} opacity={0.6}>
              <BlurMask blur={8} style="outer" respectCTM={false} />
            </SkiaPath>
          </Canvas>
        );
      })()}
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE} />
        {fill > 0 && (
          <Circle
            cx={CX} cy={CY} r={R}
            stroke={color} strokeWidth={STROKE} fill="none"
            strokeDasharray={`${CIRC * fill} ${CIRC * (1 - fill)}`}
            strokeLinecap="round" rotation="-90" origin={`${CX},${CY}`}
          />
        )}
      </Svg>
      <Text style={[s.ringNum, { color: level === 0 ? theme.textMuted : '#fff' }]}>{level}</Text>
    </View>
  );
};

export const SrsInfoModal = ({ visible, onClose }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={s.overlay}>
        <TouchableWithoutFeedback>
          <View style={s.sheet}>
            <View style={s.handle} />

            <View style={s.header}>
              <Text style={s.title}>Sistema de Níveis</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
              <Text style={s.desc}>
                O app usa repetição espaçada (SRS) — quanto mais você acerta um card, maior o intervalo até ele voltar.
              </Text>

              {/* Grid de níveis 2 colunas */}
              <View style={s.grid}>
                {LEVELS.map((lvl) => (
                  <View key={lvl.level} style={s.levelCard}>
                    <LevelRing level={lvl.level} />
                    <Text style={[s.levelName, { color: lvl.level === 5 ? theme.primary : theme.textPrimary }]}>{lvl.name}</Text>
                    <Text style={s.levelInterval}>↩ {lvl.interval}</Text>
                  </View>
                ))}
              </View>

              {/* Regras */}
              <Text style={s.sectionTitle}>Regras de progressão</Text>
              <View style={s.rulesCard}>
                {RULES.map((rule, i) => (
                  <View key={i} style={[s.ruleRow, i > 0 && s.ruleBorder]}>
                    <SvgXml xml={rule.svg} width={20} height={20} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.ruleLabel, { color: rule.color }]}>{rule.label}</Text>
                      <Text style={s.ruleDesc}>{rule.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  title: {
    color: theme.textPrimary, fontSize: 18, fontFamily: theme.fontFamily.uiBold,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  desc: {
    color: theme.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 20,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
  },
  levelCard: {
    width: '47.5%',
    backgroundColor: '#1E1E1E',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    padding: 10, alignItems: 'flex-start', gap: 6,
  },
  ringNum: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    textAlign: 'center', lineHeight: 44,
    fontFamily: theme.fontFamily.uiBold, fontSize: 14,
  },
  levelName: {
    fontFamily: theme.fontFamily.uiSemiBold, fontSize: 13,
  },
  levelInterval: {
    fontFamily: theme.fontFamily.uiMedium, fontSize: 12, color: theme.textMuted,
  },
  sectionTitle: {
    color: theme.textPrimary, fontFamily: theme.fontFamily.uiSemiBold,
    fontSize: 14, marginBottom: 10,
  },
  rulesCard: {
    backgroundColor: '#1E1E1E', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden',
  },
  ruleRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14,
  },
  ruleBorder: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  ruleLabel: {
    fontFamily: theme.fontFamily.uiSemiBold, fontSize: 14, marginBottom: 2,
  },
  ruleDesc: {
    color: theme.textSecondary, fontSize: 12, lineHeight: 18,
  },
});

export default SrsInfoModal;
