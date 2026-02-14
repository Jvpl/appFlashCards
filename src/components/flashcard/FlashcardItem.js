import React, { memo } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import Animated, { useAnimatedStyle, interpolate, useSharedValue, useDerivedValue, useAnimatedReaction, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { CardFooter } from '../ui/CardFooter';
import { katexScript } from '../editor/editorTemplates';
import styles from '../../styles/globalStyles';

const katexStyles = `
  .katex { font-size: 1.0em !important; }
  .katex .mfrac { font-size: 1.25em !important; }
`;

const screenWidth = Dimensions.get('window').width;

export const FlashcardItem = React.memo(({ card, index, currentIndex, totalCards, translateX, translateY, onFlip, isFlipped, jsCurrentIndex }) => {
  const rotate = useSharedValue(0);
  const position = useDerivedValue(() => index - currentIndex.value);

  useAnimatedReaction(
    () => isFlipped.value,
    (currentValue, previousValue) => {
      if (position.value === 0 && currentValue !== previousValue) {
        rotate.value = withTiming(currentValue ? 180 : 0, { duration: 600 });
      } else if (position.value !== 0 && rotate.value !== 0) {
        rotate.value = 0;
      }
    }
  );

  const cardAnimatedStyle = useAnimatedStyle(() => {
    if (position.value < 0 || position.value > 3) {
      return { opacity: 0 };
    }
    const zIndex = totalCards - position.value;
    if (position.value === 0) {
      const rotateZ = interpolate(
        translateX.value,
        [-screenWidth / 2, screenWidth / 2],
        [-10, 10],
        'clamp'
      );
      return {
        zIndex,
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { rotateZ: `${rotateZ}deg` },
        ],
      };
    }
    const distance = Math.sqrt(translateX.value**2 + translateY.value**2);
    const progress = interpolate(distance, [0, screenWidth / 2], [0, 1], 'clamp');
    const scale = interpolate(progress, [0, 1], [1 - position.value * 0.04, 1 - (position.value - 1) * 0.04]);
    const translateY_stack = interpolate(progress, [0, 1], [position.value * -18, (position.value - 1) * -18]);
    return { zIndex, opacity: 1, transform: [{ scale }, { translateY: translateY_stack }] };
  });

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    if (position.value <= 0) {
      return { opacity: 0 };
    }
    const distance = Math.sqrt(translateX.value**2 + translateY.value**2);
    const progress = interpolate(distance, [0, screenWidth / 2], [0, 1], 'clamp');
    const startOpacity = interpolate(position.value, [1, 4], [0.15, 0.4], 'clamp');
    const endOpacity = interpolate(position.value - 1, [1, 4], [0.15, 0.4], 'clamp');
    const opacity = interpolate(progress, [0, 1], [startOpacity, position.value === 1 ? 0 : endOpacity]);
    return { opacity };
  });

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotate.value}deg` }],
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotate.value + 180}deg` }],
  }));

  if (!card) return null;

  const renderContent = (content) => {
      const hasHtml = /<[a-z][\s\S]*>/i.test(content) || content.includes('math-atom') || content.includes('&nbsp;');
      
      if (content && typeof content === 'string' && hasHtml) {
          const readOnlyHtml = `
            <!DOCTYPE html>
            <html>
            <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <style>
                ${katexStyles}
            </style>
            <script>${katexScript}</script>
            <style>
                * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
                
                html, body {
                    height: 100%;
                    margin: 0;
                    padding: 0;
                    background-color: transparent;
                    font-family: 'Times New Roman', serif;
                    color: white;
                    font-size: 20px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                }

                #viewer {
                    padding: 10px;
                    line-height: 1.6;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    overflow-wrap: anywhere;
                    width: 100%;
                    text-align: center;
                }

                .katex { font-size: 1.0em !important; }
                .katex .mfrac { font-size: 1.25em !important; }
                .math-atom {
                    vertical-align: middle;
                    margin: 0 2px;
                    display: inline-block;
                    cursor: default;
                    white-space: nowrap;
                    font-size: 1.1em;
                }
                img { max-width: 100%; height: auto; }
                .invisible-char, .sentinela-anti-caps { display: none; }
            </style>
            <script>${katexScript}</script>
            </head>
            <body>
            <div id="viewer">${content}</div>
            </body>
            </html>`;

          return (
             <View style={{width: '100%', minHeight: 180, flex: 1}}>
                 <WebView 
                    originWhitelist={['*']}
                    source={{ html: readOnlyHtml }}
                    style={{backgroundColor: 'transparent', flex: 1}}
                    scrollEnabled={false}
                    nestedScrollEnabled={false}
                    pointerEvents="none"
                 />
             </View>
          );
      }
      
      return <Text style={styles.cardText}>{content}</Text>;
  };

  return (
    <Animated.View style={[styles.cardContainer, cardAnimatedStyle]}>
        <TouchableOpacity activeOpacity={1} disabled={index !== jsCurrentIndex} onPress={onFlip}>
          <Animated.View style={[styles.card, frontAnimatedStyle]}>
             <ScrollView style={styles.cardContentScrollView} contentContainerStyle={styles.cardContent}>
                {renderContent(card.question)}
             </ScrollView>
             <CardFooter level={card.level || 0} />
          </Animated.View>
          <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
             <ScrollView style={styles.cardContentScrollView} contentContainerStyle={styles.cardContent}>
                {renderContent(card.answer)}
             </ScrollView>
             <CardFooter level={card.level || 0} />
          </Animated.View>
        </TouchableOpacity>
        <Animated.View style={[styles.cardOverlay, overlayAnimatedStyle]} pointerEvents="none" />
      </Animated.View>
  );
});

export default FlashcardItem;
