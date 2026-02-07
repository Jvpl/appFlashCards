import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getAppData, saveAppData } from '../services/storage';
import { initialData } from '../data/mockData';
import styles from '../styles/globalStyles';

export const SettingsScreen = () => {
  const [allowDefaultDeckEditing, setAllowDefaultDeckEditing] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const value = await AsyncStorage.getItem('allowDefaultDeckEditing');
        setAllowDefaultDeckEditing(value === 'true');
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  const toggleDefaultDeckEditing = async (value) => {
    try {
      await AsyncStorage.setItem('allowDefaultDeckEditing', value.toString());
      setAllowDefaultDeckEditing(value);
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };

  const handleRestoreOnlyDecks = () => {
    setAlertConfig({
      visible: true,
      title: "Restaurar Só Decks",
      message: "Esta função restaura apenas os decks padrão que foram apagados. As matérias e flashcards existentes não serão alterados. Deseja continuar?",
      buttons: [
        { text: "Cancelar", style: "cancel", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
        {
          text: "Restaurar",
          style: "destructive",
          onPress: async () => {
            try {
              const currentData = await getAppData();
              // Filter out user decks
              const userDecks = currentData.filter(deck => !DEFAULT_DECK_IDS.includes(deck.id));
              
              // Find which default decks are missing
              const existingDefaultIds = currentData
                .filter(deck => DEFAULT_DECK_IDS.includes(deck.id))
                .map(deck => deck.id);
              
              // Get only the missing default decks from initialData, but with EMPTY subjects
              const missingDecks = initialData
                .filter(deck => !existingDefaultIds.includes(deck.id))
                .map(deck => ({ ...deck, subjects: [] }));
              
              if (missingDecks.length === 0) {
                setAlertConfig({
                    visible: true,
                    title: "Informação",
                    message: "Todos os decks padrão já existem.",
                    buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
                });
                return;
              }
              
              // Combine existing data with missing decks
              const restoredData = [...currentData, ...missingDecks];
              await saveAppData(restoredData);
              setAlertConfig({
                visible: true,
                title: "Sucesso!",
                message: `${missingDecks.length} deck(s) padrão foram restaurados.`,
                buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
              });
            } catch (error) {
              console.error('Error restoring decks:', error);
              setAlertConfig({
                visible: true,
                title: "Erro",
                message: "Não foi possível restaurar os decks.",
                buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
              });
            }
          }
        }
      ]
    });
  };

  const handleRestoreDecksAndSubjects = () => {
    setAlertConfig({
      visible: true,
      title: "Restaurar Decks e Matérias",
      message: "Esta ação irá restaurar COMPLETAMENTE os 6 decks originais do app. Qualquer matéria ou flashcard adicionado a eles será perdido. Seus decks personalizados serão mantidos. Deseja continuar?",
      buttons: [
        { text: "Cancelar", style: "cancel", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
        {
          text: "Restaurar Tudo",
          style: "destructive",
          onPress: async () => {
            try {
              const currentData = await getAppData();
              // Keep only user decks
              const userDecks = currentData.filter(deck => !DEFAULT_DECK_IDS.includes(deck.id));
              // Add fresh copy of all original decks
              const restoredData = [...initialData, ...userDecks];
              await saveAppData(restoredData);
              setAlertConfig({
                visible: true,
                title: "Sucesso!",
                message: "Os decks originais foram completamente restaurados.",
                buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
              });
            } catch (error) {
              console.error('Error restoring decks and subjects:', error);
              setAlertConfig({
                visible: true,
                title: "Erro",
                message: "Não foi possível restaurar os decks.",
                buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
              });
            }
          }
        }
      ]
    });
  };

  const handleResetProgress = (type) => {
    let title = "Resetar Progresso";
    let message = "";
    let filterFunc;

    if (type === 'all') {
      message = "Isso irá zerar o progresso de TODOS os flashcards (do app e criados por você). Deseja continuar?";
      filterFunc = () => true;
    } else if (type === 'app') {
      message = "Isso irá zerar o progresso apenas dos flashcards originais do aplicativo. Seu conteúdo não será afetado. Deseja continuar?";
      filterFunc = card => !card.isUserCreated;
    } else { // user
      message = "Isso irá zerar o progresso apenas dos flashcards criados por você. O conteúdo do app não será afetado. Deseja continuar?";
      filterFunc = card => card.isUserCreated;
    }

    setAlertConfig({
        visible: true,
        title: title,
        message: message,
        buttons: [
            { text: "Cancelar", style: "cancel", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
            { 
                text: "Confirmar", 
                style: "destructive", 
                onPress: async () => {
                   const data = await getAppData();
                   data.forEach(deck => {
                     deck.subjects.forEach(subject => {
                       subject.flashcards.forEach(card => {
                         if (filterFunc(card)) {
                           card.level = 0;
                           card.points = 0;
                           card.lastReview = null;
                           card.nextReview = null;
                         }
                       });
                     });
                   });
                   await saveAppData(data);
                   setAlertConfig({
                       visible: true,
                       title: "Sucesso!",
                       message: "O progresso foi resetado.",
                       buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
                   });
                }
            }
        ]
    });
  };

  const handleDeleteContent = async (type) => {
    let title = "Apagar Conteúdo";
    let message = "";
    let onConfirm;

    if (type === 'flashcards') {
      message = "Isso irá apagar permanentemente TODOS os flashcards que você criou em TODAS as matérias. Suas matérias criadas serão mantidas (vazias). Deseja continuar?";
      onConfirm = async () => {
        const data = await getAppData();
        data.forEach(deck => {
          deck.subjects.forEach(subject => {
            subject.flashcards = subject.flashcards.filter(card => !card.isUserCreated);
          });
        });
        await saveAppData(data);
        setAlertConfig({
            visible: true,
            title: "Sucesso!",
            message: "Seus flashcards foram apagados.",
            buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
        });
      };
    } else { // all
      message = "Isso irá apagar permanentemente TODAS as matérias e flashcards que você criou. Esta ação não pode ser desfeita. Deseja continuar?";
      onConfirm = async () => {
        const data = await getAppData();
        data.forEach(deck => {
          deck.subjects = deck.subjects.filter(subject => !subject.isUserCreated);
        });
        await saveAppData(data);
        setAlertConfig({
            visible: true,
            title: "Sucesso!",
            message: "Todo o seu conteúdo foi apagado.",
            buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
        });
      };
    }
    
    setAlertConfig({
        visible: true,
        title: title,
        message: message,
        buttons: [
            { text: "Cancelar", style: "cancel", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
            { 
                text: "Confirmar", 
                style: "destructive", 
                onPress: onConfirm 
            }
        ]
    });
  };

  return (
    <ScrollView style={styles.baseContainer}>
      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Configurações Avançadas</Text>
        <View style={styles.settingsButton}>
          <Ionicons name="shield-outline" size={24} color="#F59E0B" />
          <View style={styles.settingsButtonTextContainer}>
            <Text style={styles.settingsButtonTitle}>Permitir edição de decks padrão</Text>
            <Text style={styles.settingsButtonSubtitle}>Habilita editar e apagar os decks originais do app.</Text>
          </View>
          <TouchableOpacity 
            onPress={() => toggleDefaultDeckEditing(!allowDefaultDeckEditing)}
            style={[styles.switchContainer, allowDefaultDeckEditing && styles.switchActive]}
          >
            <View style={[styles.switchThumb, allowDefaultDeckEditing && styles.switchThumbActive]} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Resetar Progresso</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => handleResetProgress('all')}>
          <Ionicons name="refresh-circle-outline" size={24} color="#3B82F6" />
          <View style={styles.settingsButtonTextContainer}>
            <Text style={styles.settingsButtonTitle}>Resetar Tudo</Text>
            <Text style={styles.settingsButtonSubtitle}>Zera o progresso de todos os flashcards.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsButton} onPress={() => handleResetProgress('app')}>
          <Ionicons name="refresh-outline" size={24} color="#3B82F6" />
          <View style={styles.settingsButtonTextContainer}>
            <Text style={styles.settingsButtonTitle}>Resetar Conteúdo do App</Text>
            <Text style={styles.settingsButtonSubtitle}>Zera o progresso dos flashcards originais.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsButton} onPress={() => handleResetProgress('user')}>
          <Ionicons name="person-outline" size={24} color="#3B82F6" />
          <View style={styles.settingsButtonTextContainer}>
            <Text style={styles.settingsButtonTitle}>Resetar Meu Conteúdo</Text>
            <Text style={styles.settingsButtonSubtitle}>Zera o progresso dos flashcards que você criou.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsButton} onPress={handleRestoreOnlyDecks}>
          <Ionicons name="download-outline" size={24} color="#10B981" />
          <View style={styles.settingsButtonTextContainer}>
            <Text style={styles.settingsButtonTitle}>Restaurar Só Decks</Text>
            <Text style={styles.settingsButtonSubtitle}>Restaura apenas decks padrão apagados.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsButton} onPress={handleRestoreDecksAndSubjects}>
          <Ionicons name="refresh-circle-outline" size={24} color="#10B981" />
          <View style={styles.settingsButtonTextContainer}>
            <Text style={styles.settingsButtonTitle}>Restaurar Decks e Matérias</Text>
            <Text style={styles.settingsButtonSubtitle}>Restauração completa dos decks originais.</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Apagar Conteúdo Criado</Text>
        <TouchableOpacity style={[styles.settingsButton, styles.dangerButton]} onPress={() => handleDeleteContent('flashcards')}>
          <Ionicons name="document-text-outline" size={24} color="#EF4444" />
          <View style={styles.settingsButtonTextContainer}>
            <Text style={styles.settingsButtonTitle}>Apagar Meus Flashcards</Text>
            <Text style={styles.settingsButtonSubtitle}>Remove todos os flashcards criados por você.</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingsButton, styles.dangerButton]} onPress={() => handleDeleteContent('all')}>
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
          <View style={styles.settingsButtonTextContainer}>
            <Text style={styles.settingsButtonTitle}>Apagar Tudo que Criei</Text>
            <Text style={styles.settingsButtonSubtitle}>Remove suas matérias e flashcards.</Text>
          </View>
        </TouchableOpacity>
      </View>
      <CustomAlert visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} buttons={alertConfig.buttons} onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))} />
    </ScrollView>
  );
};


// =================================================================
// STYLES
// Folha de estilos unificada para todos os componentes.
// =================================================================


export default SettingsScreen;
