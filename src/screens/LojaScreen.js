import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/globalStyles';

export const LojaScreen = () => {
  return (
    <View style={styles.centered}>
      <Ionicons name="cart-outline" size={64} color="#A0AEC0" />
      <Text style={[styles.noCardsText, {marginTop: 20}]}>Loja em construção!</Text>
      <Text style={styles.itemSubtitle}>Novos decks e funcionalidades em breve.</Text>
    </View>
  );
};


// =================================================================

export default LojaScreen;
