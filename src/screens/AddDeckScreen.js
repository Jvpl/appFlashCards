import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Button } from 'react-native';
import { getAppData, saveAppData } from '../services/storage';
import { CustomAlert } from '../components/ui/CustomAlert';
import styles from '../styles/globalStyles';

export const AddDeckScreen = ({ navigation }) => {
  const [name, setName] = useState('');

  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

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
    const newDeck = {
      id: `deck_${Date.now()}`,
      name: name.trim(),
      subjects: [],
      isUserCreated: true, 
    };
    
    const newData = [...allData, newDeck];
    await saveAppData(newData);
    navigation.goBack();
  };

  return (
    <View style={styles.formContainer}>
      <Text style={styles.formLabel}>Nome do Deck</Text>
      <TextInput
        style={styles.formInput}
        placeholder="Ex: Concurso XYZ"
        placeholderTextColor="#A0AEC0"
        value={name}
        onChangeText={setName}
      />
       <View style={{marginTop: 20}}>
          <Button title="Salvar Deck" onPress={handleSave} color="#4FD1C5" />
       </View>
       <CustomAlert visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} buttons={alertConfig.buttons} onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))} />
    </View>
  );
};

// =================================================================

export default AddDeckScreen;
