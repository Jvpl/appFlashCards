import React, { memo, useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, interpolate, useSharedValue, useDerivedValue, useAnimatedReaction, withTiming, Easing } from 'react-native-reanimated';
import { Canvas, RoundedRect, BlurMask } from '@shopify/react-native-skia';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { CardFooter } from '../ui/CardFooter';
import { katexScript, katexStyles as katexFullStyles } from '../editor/editorTemplates';
import styles from '../../styles/globalStyles';

const SWIPE_COLORS = { 1: '#EF4444', 2: '#5DD62C', 3: '#38BDF8' };
const FOOTER_H = 95;

// Paths extraídos dos SVGs originais (viewBox 213.84x213.84)
const ERREI_PATHS = [
  { d: 'M106.92,0C47.96,0,0,47.96,0,106.92s47.96,106.92,106.92,106.92,106.92-47.96,106.92-106.92S165.87,0,106.92,0Zm0,198.84c-50.68,0-91.92-41.23-91.92-91.92S56.23,15,106.92,15s91.92,41.24,91.92,91.92-41.23,91.92-91.92,91.92Z' },
  { d: 'M142.9,70.94c-2.93-2.93-7.68-2.93-10.61,0l-25.37,25.37-25.37-25.37c-2.93-2.93-7.68-2.93-10.61,0-2.93,2.93-2.93,7.68,0,10.61l25.37,25.37-25.37,25.37c-2.93,2.93-2.93,7.68,0,10.61,1.46,1.46,3.38,2.2,5.3,2.2s3.84-.73,5.3-2.2l25.37-25.37,25.37,25.37c1.46,1.46,3.38,2.2,5.3,2.2s3.84-.73,5.3-2.2c2.93-2.93,2.93-7.68,0-10.61l-25.37-25.37,25.37-25.37c2.93-2.93,2.93-7.68,0-10.61Z' },
];
const ACERTEI_PATHS = [
  { d: 'M106.92,0C47.96,0,0,47.96,0,106.92s47.96,106.92,106.92,106.92,106.92-47.96,106.92-106.92S165.87,0,106.92,0Zm0,198.84c-50.68,0-91.92-41.24-91.92-91.92S56.23,15,106.92,15s91.92,41.23,91.92,91.92-41.23,91.92-91.92,91.92Z' },
  { d: 'M149.87,76.5c-3.2-2.62-7.93-2.16-10.55,1.05l-39.05,47.67-18.41-17.43c-3.01-2.85-7.75-2.72-10.6,.29-2.85,3.01-2.72,7.75,.29,10.6l24.26,22.97c1.4,1.32,3.24,2.05,5.16,2.05,.16,0,.32,0,.47-.01,2.08-.13,4.01-1.12,5.33-2.73l44.16-53.9c2.62-3.2,2.16-7.93-1.05-10.55Z' },
];
const QUASE_PATHS = [
  { d: 'M106.92,0C47.96,0,0,47.96,0,106.92s47.96,106.92,106.92,106.92,106.92-47.96,106.92-106.92S165.88,0,106.92,0Zm0,198.84c-50.68,0-91.92-41.23-91.92-91.92S56.23,15,106.92,15s91.92,41.24,91.92,91.92-41.24,91.92-91.92,91.92Z' },
  { d: 'M143.66,83.48l-12.48,4.06c-5.4,1.76-12.91,.99-17.84-1.82-8.54-4.87-20.56-6.09-29.91-3.04l-12.48,4.06c-3.94,1.28-6.09,5.52-4.81,9.45,1.28,3.94,5.52,6.09,9.45,4.81l12.48-4.06c5.4-1.76,12.91-.99,17.84,1.82,5.41,3.08,12.22,4.7,18.86,4.7,3.84,0,7.63-.54,11.05-1.66l12.48-4.06c3.94-1.28,6.09-5.52,4.81-9.45-1.29-3.94-5.52-6.09-9.45-4.81Z' },
  { d: 'M143.66,115.95l-12.48,4.06c-5.4,1.76-12.91,1-17.84-1.82-8.54-4.87-20.56-6.09-29.91-3.04l-12.48,4.06c-3.94,1.28-6.09,5.52-4.81,9.45,1.28,3.94,5.52,6.09,9.45,4.81l12.48-4.06c5.4-1.76,12.91-.99,17.84,1.82,5.41,3.08,12.22,4.7,18.86,4.7,3.84,0,7.63-.54,11.05-1.66l12.48-4.06c3.94-1.28,6.09-5.52,4.81-9.45-1.29-3.94-5.52-6.09-9.45-4.81Z' },
];

// Path interno da borda (cls-2, fill none) — usado como stroke
const BORDER_PATH = 'M881.75,3H32.67C16.31,3,3,16.09,3,32.18v1000.59h29.42c13.67-41.2,52.55-71,98.27-71s84.6,29.8,98.27,71H911.42V32.18c0-16.09-13.31-29.18-29.67-29.18Z';

const SwipeIcon = ({ paths, color, size = 80 }) => (
  <Svg width={size} height={size} viewBox="0 0 213.84 213.84">
    {paths.map((p, i) => <SvgPath key={i} d={p.d} fill={color} />)}
  </Svg>
);


const screenWidth = Dimensions.get('window').width;

const MAX_LINES = 6;

const VIEWER_MAX_H = 290;

const buildHtml = (content, scrollable) => `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>${katexFullStyles}</style>
<script>var module=undefined;var exports=undefined;var define=undefined;${katexScript};window.katex=window.katex||globalThis.katex||self.katex;</script>
<style>
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
html, body { margin: 0; padding: 0; }
body {
  margin: 0; padding: 0;
  background-color: transparent;
  font-family: 'Roboto', sans-serif;
  color: white; font-size: 20px;
  ${scrollable
    ? 'height: auto; overflow: auto; display: block; padding-bottom: 60px;'
    : 'overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center;'}
}
#viewer {
  padding: ${scrollable ? '20px 16px' : '16px'};
  line-height: 1.6; word-wrap: break-word; overflow-wrap: anywhere;
  width: 100%; text-align: center;
  ${scrollable ? '' : `max-height: ${VIEWER_MAX_H}px; overflow: hidden;`}
}
.katex { font-size: 1.0em !important; color: white !important; }
.katex .mfrac { font-size: 1.25em !important; }
.katex svg { color: white; }
.katex svg path { fill: white !important; stroke: none !important; }
.katex-mathml { display: none !important; }
.math-atom { vertical-align: middle; margin: 0 2px; display: inline-block; cursor: default; white-space: nowrap; font-size: 1.1em; }
img { max-width: 100%; height: auto; }
.invisible-char, .sentinela-anti-caps { display: none; }
mark, span.destaque { background-color: #5DD62C !important; color: #000 !important; border-radius: 2px; padding: 0 2px; }
</style>
</head>
<body data-mode="${scrollable ? 'scroll' : 'clip'}">
<div id="viewer">${content}</div>
<script>
document.querySelectorAll('.math-atom[data-latex]').forEach(function(el) {
  var latex = el.getAttribute('data-latex');
  var isDisplay = el.getAttribute('data-display') === 'true';
  try { katex.render(latex, el, { throwOnError: false, displayMode: isDisplay }); } catch(e) {}
});
</script>
</body>
</html>`;

const HTML_INJECTED_JS = `(function(){
  if(document.body.getAttribute('data-mode')!=='scroll'){
    document.body.style.height=(window.innerHeight||document.documentElement.clientHeight||365)+'px';
  }
  document.querySelectorAll('.katex svg path').forEach(function(p){p.setAttribute('fill','white');p.setAttribute('stroke','white');});
  document.querySelectorAll('.katex').forEach(function(el){el.style.color='white';});
  document.querySelectorAll('.katex-mathml').forEach(function(el){el.style.display='none';});
  if(document.body.getAttribute('data-mode')==='scroll'){
    var vv=document.getElementById('viewer');
    if(vv){
      var last=vv.lastElementChild||vv;
      var sm=document.createElement('span');
      sm.textContent=' ver menos';
      sm.style.cssText='color:#EF4444;font-weight:700;';
      sm.addEventListener('click',function(){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({t:'vm0'}));});
      last.appendChild(sm);
    }
    window.ReactNativeWebView.postMessage(JSON.stringify({t:'ov',v:false}));
    return;
  }
  var v = document.getElementById('viewer');
  if(!v){window.ReactNativeWebView.postMessage(JSON.stringify({t:'ov',v:false}));return;}
  var MAX_H = 290;
  var savedHtml = v.innerHTML;
  // Remove max-height antes de medir — overflow:hidden pode distorcer scrollHeight
  v.style.maxHeight = 'none';
  v.style.overflow = 'visible';
  var trueH = v.scrollHeight;
  if(trueH <= MAX_H){
    v.style.maxHeight = '';
    v.style.overflow = '';
    window.ReactNativeWebView.postMessage(JSON.stringify({t:'ov',v:false}));
    return;
  }
  var fullText = v.textContent.trim().replace(/\\s+/g,' ');
  // Guard: texto muito curto não precisa de truncamento
  if(fullText.length < 80){
    v.innerHTML = savedHtml;
    v.style.maxHeight = '';
    v.style.overflow = '';
    window.ReactNativeWebView.postMessage(JSON.stringify({t:'ov',v:false}));
    return;
  }
  var lo=0, hi=fullText.length;
  while(lo < hi-1){
    var mid=Math.floor((lo+hi)/2);
    v.textContent = fullText.slice(0,mid)+'... ver mais';
    if(v.scrollHeight<=MAX_H) lo=mid; else hi=mid;
  }
  // Guard: truncamento muito pequeno — exibe conteúdo completo
  if(lo < 50){
    v.innerHTML = savedHtml;
    v.style.maxHeight = '';
    v.style.overflow = '';
    window.ReactNativeWebView.postMessage(JSON.stringify({t:'ov',v:false}));
    return;
  }
  var trunc = fullText.slice(0,lo).replace(/\\s+$/,'');
  var sp = trunc.lastIndexOf(' ');
  if(sp>0 && (trunc.length-sp)<20) trunc=trunc.slice(0,sp);
  v.innerHTML='';
  v.style.maxHeight='';
  v.style.overflow='';
  v.appendChild(document.createTextNode(trunc+'... '));
  var s=document.createElement('span');
  s.id='vm';s.textContent='ver mais';
  s.style.cssText='color:#5DD62C;font-weight:600;';
  v.appendChild(s);
  var vmR=s.getBoundingClientRect();
  window.ReactNativeWebView.postMessage(JSON.stringify({t:'ov',v:true,y:vmR.top,h:vmR.height,x:vmR.left,w:vmR.width}));
})();true;`;

const ExpandableHtml = ({ content, onExpandChange, verMaisZoneSV, verMaisTriggerRef, isActiveFace, cardLeft, cardTopY }) => {
  const [expanded, setExpanded] = useState(false);
  const [vmPos, setVmPos] = useState(null); // nunca limpa depois de setado

  const toggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    onExpandChange && onExpandChange(next);
  }, [expanded, onExpandChange]);

  useEffect(() => {
    if (!verMaisZoneSV || !verMaisTriggerRef || !cardTopY) return;
    if (isActiveFace && vmPos && !expanded) {
      verMaisZoneSV.value = {
        active: true,
        y: cardTopY.value + vmPos.y,
        h: vmPos.h,
        x: cardLeft + vmPos.x,
        w: vmPos.w,
      };
      verMaisTriggerRef.current = toggle;
    } else {
      if (isActiveFace) {
        verMaisZoneSV.value = { active: false, y: 0, h: 0, x: 0, w: 0 };
        if (!expanded) verMaisTriggerRef.current = null;
      }
    }
  }, [vmPos, isActiveFace, expanded, toggle, verMaisZoneSV, verMaisTriggerRef, cardLeft, cardTopY]);

  return (
    <View style={{ flex: 1, width: '100%' }}>
      <WebView
        key={expanded ? 'e' : 'c'}
        originWhitelist={['*']}
        source={{ html: buildHtml(content, expanded) }}
        style={{ backgroundColor: 'transparent', flex: 1 }}
        scrollEnabled={expanded}
        nestedScrollEnabled={expanded}
        pointerEvents={expanded ? 'auto' : 'none'}
        injectedJavaScript={HTML_INJECTED_JS}
        onMessage={(e) => {
          try {
            const d = JSON.parse(e.nativeEvent.data);
            if (d.t === 'ov' && d.v) setVmPos({ y: d.y, h: d.h, x: d.x, w: d.w });
            else if (d.t === 'vm0') toggle();
          } catch {}
        }}
      />
    </View>
  );
};

const ExpandableText = ({ content, onExpandChange, verMaisZoneSV, verMaisTriggerRef, isActiveFace, cardLeft, cardTopY }) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const [relativePos, setRelativePos] = useState(null);

  const toggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    onExpandChange && onExpandChange(next);
  }, [expanded, onExpandChange]);

  const handleLayout = useCallback((e) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setRelativePos({ x, y, w: width, h: height });
  }, []);

  useEffect(() => {
    if (!verMaisZoneSV || !verMaisTriggerRef || !cardTopY) return;
    if (isActiveFace && overflows && !expanded && relativePos) {
      verMaisZoneSV.value = {
        active: true,
        y: cardTopY.value + relativePos.y,
        h: relativePos.h,
        x: cardLeft + relativePos.x,
        w: relativePos.w,
      };
      verMaisTriggerRef.current = toggle;
    } else {
      if (isActiveFace) {
        verMaisZoneSV.value = { active: false, y: 0, h: 0, x: 0, w: 0 };
        if (!expanded) verMaisTriggerRef.current = null;
      }
    }
  }, [isActiveFace, overflows, expanded, relativePos, verMaisZoneSV, verMaisTriggerRef, cardLeft, cardTopY]);

  if (expanded) {
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.cardText}>{content}</Text>
        <View style={{ marginTop: 12, alignSelf: 'center' }}>
          <Text onPress={toggle} style={[styles.cardText, { color: '#EF4444', fontWeight: '700' }]}>ver menos</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text
        style={styles.cardText}
        numberOfLines={MAX_LINES}
        onTextLayout={(e) => {
          if (e.nativeEvent.lines.length >= MAX_LINES) setOverflows(true);
        }}
      >
        {content}
      </Text>
      {overflows && (
        <View
          collapsable={false}
          onLayout={handleLayout}
          style={{ marginTop: 4, alignSelf: 'center' }}
        >
          <Text onPress={toggle} style={[styles.cardText, { color: '#5DD62C' }]}>ver mais</Text>
        </View>
      )}
    </View>
  );
};

export const FlashcardItem = ({ card, index, currentIndex, totalCards, completedCards, sessionTotal, translateX, translateY, isFlipped, jsCurrentIndex, jsIsFlipped, resetKey, showLevel = true, swipeProgress, swipeDirection, onEdit, footerPressedSV, verMaisZoneSV, verMaisTriggerRef, cardOpacitySV, contentKey, onExpandChange, cardTopY }) => {
  const [frontExpanded, setFrontExpanded] = useState(false);
  const [backExpanded, setBackExpanded] = useState(false);
  const editingRef = useRef(false);
  const rotate = useSharedValue(0);
  const position = useDerivedValue(() => index - currentIndex.value);
  const isCurrentCard = index === jsCurrentIndex;

  // localFlipped: troca quando rotate cruza 90° — controla pointerEvents das faces
  useAnimatedReaction(
    () => ({ flipped: isFlipped.value, pos: position.value, reset: resetKey ? resetKey.value : 0 }),
    (current, previous) => {
      const resetFired = previous && current.reset !== previous.reset;
      if (resetFired) {
        rotate.value = withTiming(0, { duration: 0 });
      } else if (current.pos === 0) {
        const target = !!current.flipped ? 180 : 0;
        if (rotate.value !== target) {
          rotate.value = withTiming(target, { duration: 420, easing: Easing.out(Easing.cubic) });
        }
      } else if (current.pos !== 0) {
        if (rotate.value !== 0) rotate.value = 0;
      }
    }
  );

  const cardAnimatedStyle = useAnimatedStyle(() => {
    if (position.value < 0 || position.value > 3) {
      return { opacity: 0 };
    }
    const zIndex = position.value === 0 ? 100 : totalCards - position.value;
    if (position.value === 0) {
      const rotateZ = interpolate(
        translateX.value,
        [-screenWidth / 2, screenWidth / 2],
        [-10, 10],
        'clamp'
      );
      return {
        zIndex,
        opacity: cardOpacitySV ? cardOpacitySV.value : 1,
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { rotateZ: `${rotateZ}deg` },
        ],
      };
    }
    const distance = Math.sqrt(translateX.value ** 2 + translateY.value ** 2);
    const progress = interpolate(distance, [0, screenWidth / 2], [0, 1], 'clamp');
    const scale = interpolate(progress, [0, 1], [1 - position.value * 0.035, 1 - (position.value - 1) * 0.035]);
    const translateY_stack = interpolate(progress, [0, 1], [position.value * -20, (position.value - 1) * -20]);
    return { zIndex, opacity: 1, transform: [{ scale }, { translateY: translateY_stack }] };
  });

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    if (position.value <= 0) {
      return { opacity: 0 };
    }
    const distance = Math.sqrt(translateX.value ** 2 + translateY.value ** 2);
    const progress = interpolate(distance, [0, screenWidth / 2], [0, 1], 'clamp');
    const startOpacity = interpolate(position.value, [1, 4], [0.15, 0.4], 'clamp');
    const endOpacity = interpolate(position.value - 1, [1, 4], [0.15, 0.4], 'clamp');
    const opacity = interpolate(progress, [0, 1], [startOpacity, position.value === 1 ? 0 : endOpacity]);
    return { opacity };
  });

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotate.value}deg` }],
    opacity: rotate.value > 90 ? 0 : 1,
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotate.value + 180}deg` }],
    opacity: rotate.value > 90 ? 1 : 0,
  }));

  // Texto do verso some rápido ao iniciar o swipe
  const backContentOpacity = useAnimatedStyle(() => {
    if (!swipeProgress || Math.floor(currentIndex.value) !== index) return { opacity: 1 };
    return { opacity: interpolate(swipeProgress.value, [0, 0.15], [1, 0], 'clamp') };
  });

  // Overlay do verso: ícone + borda aparecem progressivamente
  const swipeOverlayStyle = useAnimatedStyle(() => {
    if (!swipeProgress || Math.floor(currentIndex.value) !== index) return { opacity: 0 };
    return { opacity: interpolate(swipeProgress.value, [0.05, 0.4], [0, 1], 'clamp') };
  });

  const borderOpacityLeft = useAnimatedStyle(() => {
    if (!swipeProgress || !swipeDirection || Math.floor(currentIndex.value) !== index) return { opacity: 0 };
    return { opacity: swipeDirection.value === 1 ? interpolate(swipeProgress.value, [0.05, 0.5], [0, 1], 'clamp') : 0 };
  });
  const borderOpacityRight = useAnimatedStyle(() => {
    if (!swipeProgress || !swipeDirection || Math.floor(currentIndex.value) !== index) return { opacity: 0 };
    return { opacity: swipeDirection.value === 2 ? interpolate(swipeProgress.value, [0.05, 0.5], [0, 1], 'clamp') : 0 };
  });
  const borderOpacityUp = useAnimatedStyle(() => {
    if (!swipeProgress || !swipeDirection || Math.floor(currentIndex.value) !== index) return { opacity: 0 };
    return { opacity: swipeDirection.value === 3 ? interpolate(swipeProgress.value, [0.05, 0.5], [0, 1], 'clamp') : 0 };
  });

  if (!card) return null;

  const isHtml = (content) => /<[a-z][\s\S]*>/i.test(content) || content?.includes('math-atom') || content?.includes('&nbsp;');

  useEffect(() => {
    if (index !== jsCurrentIndex) {
      editingRef.current = false;
      setFrontExpanded(false);
      setBackExpanded(false);
    }
  }, [jsCurrentIndex, index]);

  const handleEditPressIn = () => {
    editingRef.current = true;
    if (footerPressedSV) footerPressedSV.value = true;
  };
  const handleEdit = () => {
    editingRef.current = false;
    if (footerPressedSV) footerPressedSV.value = false;
    onEdit && onEdit();
  };

  const cardW = screenWidth * 0.9;
  const cardH = 460;
  const cardRadius = 20;
  const glowBlur = 12;
  const glowPad = glowBlur * 2;
  const isMax = (card.level || 0) === 5;

  const cardLeft = (screenWidth - cardW) / 2;

  const lineY = 89.11 * (cardW / 975.35);
  const cardContentHeight = 365 + lineY;

  return (
    <Animated.View style={[styles.cardContainer, cardAnimatedStyle]}>
      {isMax && (
        <Canvas
          style={{
            position: 'absolute',
            top: -glowPad,
            left: -glowPad,
            width: cardW + glowPad * 2,
            height: cardH + glowPad * 2,
          }}
          pointerEvents="none"
        >
          <RoundedRect
            x={glowPad} y={glowPad}
            width={cardW} height={cardH}
            r={cardRadius}
            color="#5DD62C"
            opacity={0.55}
            style="stroke"
            strokeWidth={2}
          >
            <BlurMask blur={glowBlur} style="outer" respectCTM={false} />
          </RoundedRect>
        </Canvas>
      )}

      <View>
        {/* Face da frente — pointerEvents='none' quando virado (verso fica na frente) */}
        <Animated.View
          style={[styles.card, (card.level || 0) === 5 && styles.cardDominated, frontAnimatedStyle]}
          pointerEvents={isCurrentCard && jsIsFlipped ? 'none' : 'auto'}
        >
          <View style={{ height: cardContentHeight, width: '100%', overflow: 'hidden' }}>
            {isHtml(card.question)
              ? <ExpandableHtml key={contentKey} content={card.question} onExpandChange={(exp) => { setFrontExpanded(exp); onExpandChange && onExpandChange(exp); }} verMaisZoneSV={verMaisZoneSV} verMaisTriggerRef={verMaisTriggerRef} isActiveFace={isCurrentCard && !jsIsFlipped} cardLeft={cardLeft} cardTopY={cardTopY} />
              : <ExpandableText content={card.question} onExpandChange={(exp) => { setFrontExpanded(exp); onExpandChange && onExpandChange(exp); }} verMaisZoneSV={verMaisZoneSV} verMaisTriggerRef={verMaisTriggerRef} isActiveFace={isCurrentCard && !jsIsFlipped} cardLeft={cardLeft} cardTopY={cardTopY} />
            }
            {frontExpanded && (
              <>
                <LinearGradient
                  colors={['#242427', 'rgba(36, 36, 39, 0)']}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40 }}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={['rgba(36, 36, 39, 0)', 'rgba(36, 36, 39, 0.4)', 'rgba(36, 36, 39, 0.8)', '#242427', '#242427']}
                  locations={[0, 0.3, 0.6, 0.8, 1]}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 110 }}
                  pointerEvents="none"
                />
              </>
            )}
          </View>
          {showLevel && (
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
              <CardFooter level={card.level || 0} completedCards={completedCards} sessionTotal={sessionTotal} onEdit={handleEdit} onEditPressIn={handleEditPressIn} />
            </View>
          )}
        </Animated.View>

        {/* Face do verso — pointerEvents='none' quando não virado */}
        <Animated.View
          style={[styles.card, styles.cardBack, (card.level || 0) === 5 && styles.cardDominated, backAnimatedStyle]}
          pointerEvents={isCurrentCard && jsIsFlipped ? 'auto' : 'none'}
        >
          {[
            { color: SWIPE_COLORS[1], anim: borderOpacityLeft },
            { color: SWIPE_COLORS[2], anim: borderOpacityRight },
            { color: SWIPE_COLORS[3], anim: borderOpacityUp },
          ].map(({ color, anim }) => {
            const pad = 10;
            const offsetX = -0.6;
            const bW = cardW - pad * 2;
            const bH = (cardH - FOOTER_H - pad * 1.4) * (1035.77 / 964.77);
            return (
              <Animated.View key={color} pointerEvents="none" style={[{ position: 'absolute', top: pad, left: pad + offsetX, width: bW, height: bH }, anim]}>
                <Svg width={bW} height={bH} viewBox="0 0 914.42 1035.77" preserveAspectRatio="none">
                  <SvgPath d={BORDER_PATH} fill="none" stroke={color} strokeWidth={8} />
                </Svg>
              </Animated.View>
            );
          })}
          <Animated.View style={[{ height: cardContentHeight, width: '100%', overflow: 'hidden' }, backContentOpacity]} pointerEvents={backExpanded ? 'auto' : 'none'}>
            {isHtml(card.answer)
              ? <ExpandableHtml key={contentKey} content={card.answer} onExpandChange={(exp) => { setBackExpanded(exp); onExpandChange && onExpandChange(exp); }} verMaisZoneSV={verMaisZoneSV} verMaisTriggerRef={verMaisTriggerRef} isActiveFace={isCurrentCard && jsIsFlipped} cardLeft={cardLeft} cardTopY={cardTopY} />
              : <ExpandableText content={card.answer} onExpandChange={(exp) => { setBackExpanded(exp); onExpandChange && onExpandChange(exp); }} verMaisZoneSV={verMaisZoneSV} verMaisTriggerRef={verMaisTriggerRef} isActiveFace={isCurrentCard && jsIsFlipped} cardLeft={cardLeft} cardTopY={cardTopY} />
            }
            {backExpanded && (
              <>
                <LinearGradient
                  colors={['#1E1E21', 'rgba(30, 30, 33, 0)']}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40 }}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={['rgba(30, 30, 33, 0)', 'rgba(30, 30, 33, 0.4)', 'rgba(30, 30, 33, 0.8)', '#1E1E21', '#1E1E21']}
                  locations={[0, 0.3, 0.6, 0.8, 1]}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 110 }}
                  pointerEvents="none"
                />
              </>
            )}
          </Animated.View>
          <Animated.View pointerEvents="none" style={[fi.swipeOverlay, swipeOverlayStyle]}>
            <Animated.View style={[fi.iconWrap, borderOpacityLeft]}>
              <SwipeIcon paths={ERREI_PATHS} color={SWIPE_COLORS[1]} size={64} />
              <Text style={[fi.swipeLabel, { color: SWIPE_COLORS[1] }]}>ERREI</Text>
            </Animated.View>
            <Animated.View style={[fi.iconWrap, borderOpacityRight]}>
              <SwipeIcon paths={ACERTEI_PATHS} color={SWIPE_COLORS[2]} size={64} />
              <Text style={[fi.swipeLabel, { color: SWIPE_COLORS[2] }]}>{(card.level || 0) >= 4 ? 'MEMORIZADO' : 'ACERTEI'}</Text>
            </Animated.View>
            <Animated.View style={[fi.iconWrap, borderOpacityUp]}>
              <SwipeIcon paths={QUASE_PATHS} color={SWIPE_COLORS[3]} size={64} />
              <Text style={[fi.swipeLabel, { color: SWIPE_COLORS[3] }]}>QUASE</Text>
            </Animated.View>
          </Animated.View>
          {showLevel && (
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
              <CardFooter level={card.level || 0} completedCards={completedCards} sessionTotal={sessionTotal} onEdit={handleEdit} onEditPressIn={handleEditPressIn} />
            </View>
          )}
        </Animated.View>
      </View>

      <Animated.View style={[styles.cardOverlay, overlayAnimatedStyle]} pointerEvents="none" />
    </Animated.View>
  );
};

const fi = StyleSheet.create({
  borderWrap: {
    position: 'absolute', top: 6, left: 6, right: 6, bottom: 6,
    pointerEvents: 'none',
  },
  swipeOverlay: {
    position: 'absolute', top: 10, left: 0, right: 0, bottom: FOOTER_H - 20,
    alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none',
  },
  iconWrap: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
  },
  swipeLabel: {
    fontSize: 18, fontWeight: '800', letterSpacing: 2, marginTop: 12,
  },
  flipHitbox: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    bottom: FOOTER_H,
  },
});


export default FlashcardItem;
