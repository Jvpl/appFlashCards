import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { getAppData, saveAppData } from '../services/storage';
import styles from '../styles/globalStyles';

export const EditDeckScreen = ({ route, navigation }) => {
  const { deckId } = route.params;
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

  useEffect(() => {
    const loadDeck = async () => {
      const allData = await getAppData();
      const deck = allData.find(d => d.id === deckId);
      if (deck) {
        setName(deck.name);
      }
      setLoading(false);
    };
    loadDeck();
  }, []);

  const handleSave = async () => {
    if (name.trim().length === 0) {
      setAlertConfig({
          visible: true,
          title: 'Atenção',
          message: 'Por favor, insira um nome para o deck.',
          buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
      });
      return;
    }
    const allData = await getAppData();
    const newData = allData.map(deck => 
      deck.id === deckId ? { ...deck, name: name.trim() } : deck
    );
    await saveAppData(newData);
    navigation.goBack();
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4A5568" /></View>;

  return (
    <View style={styles.formContainer}>
      <Text style={styles.formLabel}>Nome do Deck</Text>
      <TextInput 
        style={styles.formInput} 
        value={name} 
        onChangeText={setName} 
        placeholder="Edite o nome do deck"
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

export default EditDeckScreen;
