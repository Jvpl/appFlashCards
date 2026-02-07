import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { getAppData, saveAppData } from '../services/storage';
import { CustomAlert } from '../components/ui/CustomAlert';
import styles from '../styles/globalStyles';

export const EditSubjectScreen = ({ route, navigation }) => {
  const { deckId, subjectId } = route.params;
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

  useEffect(() => {
    const loadSubject = async () => {
      const allData = await getAppData();
      const deck = allData.find(c => c.id === deckId);
      const subject = deck.subjects.find(s => s.id === subjectId);
      if (subject) {
        setName(subject.name);
      }
      setLoading(false);
    };
    loadSubject();
  }, [deckId, subjectId]); // Adicionado dependências

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
        return {
          ...deck,
          subjects: deck.subjects.map(subject =>
            subject.id === subjectId ? { ...subject, name: name.trim() } : subject
          ),
        };
      }
      return deck;
    });
    await saveAppData(newData);
    navigation.goBack();
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4A5568" /></View>;

  return (
    <View style={styles.formContainer}>
      <Text style={styles.formLabel}>Nome da Matéria</Text>
      <TextInput
         style={styles.formInput}
         value={name}
         onChangeText={setName}
         placeholder="Digite o nome da matéria"
         placeholderTextColor="#A0AEC0"
      />
       <View style={{marginTop: 20}}>
          <Button title="Salvar Alterações" onPress={handleSave} color="#4FD1C5" />
       </View>
       <CustomAlert visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} buttons={alertConfig.buttons} onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))} />
    </View>
  );
};



// =================================================================
// CUSTOM UI COMPONENTS
// =================================================================




export default EditSubjectScreen;
