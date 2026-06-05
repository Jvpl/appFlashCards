import React, { useMemo } from 'react';
import { Canvas, Group, Path, Skia, BlurMask } from '@shopify/react-native-skia';

/**
 * GlowIcon — renderiza um ícone SVG (múltiplos paths) com efeito neon/glow via Skia.
 * Técnica: dois layers do mesmo ícone — blur externo + traçado nítido sobreposto.
 *
 * Props:
 *   iconData  { w, h, paths[] }  — dados do ícone (de svgIconPaths.js)
 *   size      number              — tamanho do Canvas (quadrado)
 *   color     string              — cor do ícone (default: #6fb630)
 *   glowBlur  number              — intensidade do glow (default: 6)
 */
const GlowIcon = ({ iconData, size = 44, color = '#6fb630', glowBlur = 6 }) => {
  const { w, h, paths } = iconData;

  // Padding extra para o glow não ser cortado nas bordas
  const pad = glowBlur * 2;
  const canvasSize = size + pad * 2;

  // Escala uniforme para caber no canvas (descontando o padding)
  const scale = size / Math.max(w, h);
  const offsetX = pad + (size - w * scale) / 2;
  const offsetY = pad + (size - h * scale) / 2;

  // Normaliza path do Illustrator: ,.27 → ,0.27 e M10,.5 → M10,0.5
  const normalizePath = (d) =>
    d.replace(/([\s,])(\.\d)/g, '$10$2').replace(/^(\.\d)/, '0$1');

  // Converte strings de path para objetos Skia (memoizado)
  const skiaPaths = useMemo(() => {
    return paths.reduce((acc, d) => {
      try {
        const p = Skia.Path.MakeFromSVGString(normalizePath(d));
        if (p) acc.push(p);
      } catch (e) {
        // path inválido para Skia — ignora
      }
      return acc;
    }, []);
  }, [paths]);

  return (
    <Canvas style={{ width: canvasSize, height: canvasSize, margin: -pad }}>
      <Group transform={[{ translateX: offsetX }, { translateY: offsetY }, { scale }]}>
        {/* Camada 1: glow difuso */}
        {skiaPaths.map((p, i) => (
          <Path key={`glow-${i}`} path={p} color={color} style="fill">
            <BlurMask blur={glowBlur} style="outer" respectCTM={false} />
          </Path>
        ))}
        {/* Camada 2: ícone nítido */}
        {skiaPaths.map((p, i) => (
          <Path key={`sharp-${i}`} path={p} color={color} style="fill" />
        ))}
      </Group>
    </Canvas>
  );
};

export default GlowIcon;
