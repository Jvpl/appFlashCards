import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export const MathToolbar = ({ onInsert, onClose }) => {
  // Começa fora da tela (300px para baixo)
  const translateY = useSharedValue(300);
  const context = useSharedValue({ y: 0 });

  // Anima entrada ao montar
  useEffect(() => {
     // Usa withTiming para subida suave sem bounce, mais lenta (350ms)
     translateY.value = withTiming(0, { duration: 350 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const closeMenu = () => {
    'worklet';
    translateY.value = withTiming(300, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((e) => {
      // Permite arrastar apenas para baixo (valores positivos)
      translateY.value = Math.max(0, context.value.y + e.translationY);
    })
    .onEnd(() => {
      // Se arrastou mais de 80px ou com velocidade suficiente, fecha
      if (translateY.value > 80) {
        closeMenu();
      } else {
        // Senão, volta para a posição original (bounce back)
        translateY.value = withSpring(0, { damping: 15 });
      }
    });

  const symbols = [
    { label: '+', cmd: '+' },
    { label: '-', cmd: '-' },
    { label: '×', cmd: '×' },
    { label: '÷', cmd: '÷' },
    { label: '=', cmd: '=' },
    { label: '≠', cmd: '≠' },
    { label: 'x²', cmd: '²' },
    { label: '√', cmd: '\\\\sqrt' },
    { label: 'π', cmd: 'π' },
    { label: '(', cmd: '(' },
    { label: ')', cmd: ')' },
    { label: 'a/b', cmd: '\\\\frac' },
    { label: 'log', cmd: '\\\\log' },
    { label: '≥', cmd: '≥' },
    { label: '≤', cmd: '≤' },
    { label: '∞', cmd: '∞' },
    { label: 'θ', cmd: 'θ' },
  ];

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[
          styles.mathToolbarContainer, 
          // Adicionando estilos do overlay AQUI para mover tudo junto
          { 
            position: 'absolute', // FIX: Flutua sobre o conteúdo
            bottom: -50, // Começa mais baixo para ter "sobra" de fundo
            left: 0, 
            right: 0,
            zIndex: 9999, // Garante que fique no topo
            flexDirection: 'column', 
            flexWrap: 'nowrap', 
            backgroundColor: '#252E3D', // Cor de fundo do menu
            borderTopWidth: 1,
            borderTopColor: '#4A5568',
            paddingTop: 8,
            paddingBottom: 70, // Padding extra para compensar o bottom negativo (20 original + 50 extra)
            elevation: 10, // Sombra no Android
            shadowColor: "#000", // Sombra no iOS
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }, 
          animatedStyle
      ]}>
        {/* Header com botão de fechar estilizado */}
        <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'center', paddingBottom: 10, paddingTop: 5 }}>
            <TouchableOpacity 
              onPress={() => {
                   // Animação de saída manual ao clicar no botão
                   translateY.value = withTiming(300, { duration: 200 }, () => runOnJS(onClose)());
              }} 
              style={{ 
                backgroundColor: 'rgba(79, 209, 197, 0.15)', // Verde transparente (#4FD1C5)
                paddingVertical: 4,
                paddingHorizontal: 40, // Botão largo para fácil toque
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
               <Ionicons name="chevron-down" size={24} color="#4FD1C5" />
            </TouchableOpacity>
        </View>

        <ScrollView 
          style={{ height: 250, width: '100%' }} 
          showsVerticalScrollIndicator={true} 
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              justifyContent: 'center', // Centraliza horizontalmente
              alignContent: 'center',   // Centraliza as linhas verticalmente 
              flexGrow: 1,              
              paddingBottom: 20 
          }}
        >
        {symbols.map((symbol, index) => (
          <TouchableOpacity key={index} style={styles.mathToolbarButton} onPress={() => onInsert(symbol.cmd)}>
            <Text style={styles.mathToolbarButtonText}>{symbol.label}</Text>
          </TouchableOpacity>
        ))}
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
};


export default MathToolbar;
