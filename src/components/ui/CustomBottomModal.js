import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

export const CustomBottomModal = ({ visible, onClose, children, title }) => {
  const [isVisible, setIsVisible] = useState(false);
  const translateY = useSharedValue(300);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      translateY.value = withSpring(0, { damping: 15, stiffness: 90 });
    } else {
      translateY.value = withTiming(400, { duration: 250 }, (finished) => {
        if (finished) {
           runOnJS(setIsVisible)(false);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  if (!isVisible && !visible) return null;

  return (
    <Modal
      transparent
      visible={isVisible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
             <TouchableWithoutFeedback>
                <Animated.View style={[{ backgroundColor: '#1F2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }, animatedStyle]}>
                   {title && <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>{title}</Text>}
                   {children}
                </Animated.View>
             </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default CustomBottomModal;
