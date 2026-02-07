import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { getAppData, saveAppData } from '../services/storage';
import styles from '../styles/globalStyles';

export const AddSubjectScreen = ({ route, navigation }) => {
  const { deckId } = route.params;
  const [name, setName] = useState('');
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

  const handleSave = async () => {
    if (name.trim().length === 0) {
      setAlertConfig({
          visible: true,
          title: 'Atenção',
          message: 'Por favor, insira um nome para a matéria.',
          buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
      });
      return;
    }
    const allData = await getAppData();
    const newData = allData.map(deck => {
      if (deck.id === deckId) {
        const newSubject = {
          id: `subject_${Date.now()}`,
          name: name.trim(),
          flashcards: [],
          isUserCreated: true, 
        };
        return { ...deck, subjects: [...deck.subjects, newSubject] };
      }
      return deck;
    });
    await saveAppData(newData);
    navigation.goBack();
  };

  return (
    <View style={styles.formContainer}>
      <Text style={styles.formLabel}>Nome da Matéria</Text>
      <TextInput
        style={styles.formInput}
        placeholder="Ex: Direito Penal"
        placeholderTextColor="#A0AEC0"
        value={name}
        onChangeText={setName}
      />
       <View style={{marginTop: 20}}>
         <Button title="Salvar Matéria" onPress={handleSave} color="#4FD1C5" />
       </View>
       <CustomAlert visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} buttons={alertConfig.buttons} onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))} />
    </View>
  );
};


// =================================================================
// UNIFICADO: HTML e Componente MathInput para texto e fórmulas
// =================================================================

// HTML para MathLive, otimizado e com garantia de teclado virtual desligado
// HTML para MathLive, otimizado e corrigido (Sem cursor duplo/nativo)
// HTML FINAL - V16 - Arquitetura Modal (Block-Only para Visualização)
// =================================================================
// =================================================================
// =================================================================
// SKELETON COMPONENT
// Componente reutilizável para loading screens (Wireframes)
// =================================================================

export default AddSubjectScreen;
