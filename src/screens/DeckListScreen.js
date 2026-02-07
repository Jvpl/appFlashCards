import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, InteractionManager } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAppData, saveAppData } from '../services/storage';
import { isDefaultDeck, canEditDefaultDecks } from '../config/constants';
import { CustomBottomModal } from '../components/ui/CustomBottomModal';
import { SkeletonItem } from '../components/ui/SkeletonItem';
import styles from '../styles/globalStyles';

export const DeckListScreen = ({ navigation }) => {
  const [decks, setDecks] = useState([]);
  // Check global cache for initial state
  const [loading, setLoading] = useState(!global.screenCache.decks);

  const [selectedDeck, setSelectedDeck] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [allowDefaultDeckEditing, setAllowDefaultDeckEditing] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedDecks, setSelectedDecks] = useState(new Set());
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });
  const isFocused = useIsFocused();

  // Auto-scroll refs
  const scrollViewRef = useRef(null);
  const searchContainerRef = useRef(null);

  const loadData = useCallback(async () => {
    // Only show skeleton if we don't have data yet AND it's not cached
    const shouldShowSkeleton = decks.length === 0 && !global.screenCache.decks;
    
    if (shouldShowSkeleton) setLoading(true);
    
    const minDelay = shouldShowSkeleton ? new Promise(resolve => setTimeout(resolve, 500)) : Promise.resolve();
    
    try {
      const [data] = await Promise.all([
          getAppData(),
          minDelay
      ]);
      setDecks(data);
      
      // Load default deck editing preference
      const allowEditing = await canEditDefaultDecks();
      setAllowDefaultDeckEditing(allowEditing);
      
      // Mark decks screen as loaded
      global.screenCache.decks = true;
    } catch (error) {
      console.error('Error loading decks:', error);
      setAlertConfig({
        visible: true,
        title: 'Erro',
        message: 'Não foi possível carregar os decks.',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
      });
    } finally {
      if (shouldShowSkeleton) setLoading(false);
    }
  }, [decks.length]);

  useEffect(() => {
    if (isFocused) {
      // Aguarda a transição de navegação terminar antes de carregar dados pesados/skeleton
      const task = InteractionManager.runAfterInteractions(() => {
        loadData();
      });
      return () => task.cancel();
    }
  }, [isFocused]);

  const calculateProgress = (subjects) => {
    if (!subjects || subjects.length === 0) return 0;
    let totalMaxLevel = 0;
    let currentLevelSum = 0;
    subjects.forEach(s => {
        s.flashcards.forEach(c => {
            totalMaxLevel += 5;
            currentLevelSum += c.level || 0;
        });
    });
    return totalMaxLevel > 0 ? Math.round((currentLevelSum / totalMaxLevel) * 100) : 0;
  }

  const toggleMultiSelectMode = () => {
    setMultiSelectMode(!multiSelectMode);
    setSelectedDecks(new Set());
  };

  const toggleDeckSelection = (deckId) => {
    const newSelected = new Set(selectedDecks);
    if (newSelected.has(deckId)) {
      newSelected.delete(deckId);
    } else {
      newSelected.add(deckId);
    }
    setSelectedDecks(newSelected);
  };

  const deleteSelectedDecks = async () => {
    if (selectedDecks.size === 0) {
      setAlertConfig({
        visible: true,
        title: "Atenção",
        message: "Selecione ao menos um deck para apagar.",
        buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
      });
      return;
    }

    // Check if any protected default decks are selected
    const hasProtectedDefaultDeck = Array.from(selectedDecks).some(id => {
      return isDefaultDeck(id) && !allowDefaultDeckEditing;
    });

    if (hasProtectedDefaultDeck) {
      setAlertConfig({
        visible: true,
        title: "Deck Protegido",
        message: "Alguns decks selecionados são padrão. Para apagá-los, ative 'Permitir edição de decks padrão' nas Configurações.",
        buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
      });
      return;
    }

    setAlertConfig({
      visible: true,
      title: "Apagar Decks",
      message: `Tem certeza que deseja apagar ${selectedDecks.size} deck(s) selecionado(s)?`,
      buttons: [
        { text: "Cancelar", style: "cancel", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
        {
          text: "Confirmar",
          style: "destructive",
          onPress: async () => {
            const allData = await getAppData();
            const newData = allData.filter(d => !selectedDecks.has(d.id));
            await saveAppData(newData);
            setMultiSelectMode(false);
            setSelectedDecks(new Set());
            loadData();
            setAlertConfig(prev => ({ ...prev, visible: false }));
          }
        }
      ]
    });
  };

  const handleSelectAll = () => {
    // Logic: If ANY item is selected, Deselect All.
    // If NOTHING is selected, show Select Options.
    
    if (selectedDecks.size > 0) {
        setSelectedDecks(new Set());
        return;
    }

    // Toggle ON: Select Logic
    if (!allowDefaultDeckEditing) {
      // Locked: Select all USER decks
      const allUserDecks = decks.filter(d => d.isUserCreated).map(d => d.id);
      setSelectedDecks(new Set(allUserDecks));
      return;
    }

    // Unlocked: Show options
    setAlertConfig({
        visible: true,
        title: "Seleção Rápida",
        message: "O que você deseja selecionar?",
        buttons: [
            { 
                text: "Todos os decks", 
                onPress: () => {
                    setSelectedDecks(new Set(decks.map(d => d.id)));
                    setAlertConfig(prev => ({ ...prev, visible: false }));
                }
            },
            { 
                text: "Apenas decks padrão ou do sistema", 
                onPress: () => {
                    const defaultIds = decks.filter(d => !d.isUserCreated).map(d => d.id);
                    setSelectedDecks(new Set(defaultIds));
                    setAlertConfig(prev => ({ ...prev, visible: false }));
                }
            },
            { 
                text: "Apenas meus decks criados", 
                onPress: () => {
                    const userIds = decks.filter(d => d.isUserCreated).map(d => d.id);
                    setSelectedDecks(new Set(userIds));
                    setAlertConfig(prev => ({ ...prev, visible: false }));
                }
            },
            { 
                text: "Cancelar", 
                style: "cancel", 
                onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) 
            }
        ]
    });
  };

  // Update header based on multiSelectMode and deck conditions
  useEffect(() => {
    navigation.setOptions({
      title: multiSelectMode ? `${selectedDecks.size} selecionado(s)` : 'Início',
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Ionicons name="menu" size={28} color="white" />
          </TouchableOpacity>
        </View>
      ),
      headerLeft: multiSelectMode ? () => (
         <TouchableOpacity onPress={() => { setMultiSelectMode(false); setSelectedDecks(new Set()); }} style={{ marginLeft: 15 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
         </TouchableOpacity>
      ) : undefined,
    });

  }, [multiSelectMode, selectedDecks, navigation]);

  // Handle back button press for multi-selection mode
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFocused && multiSelectMode) {
        setMultiSelectMode(false);
        setSelectedDecks(new Set());
        return true; // Consume the event
      }
      return false; // Allow default navigation
    });
    return () => backHandler.remove();
  }, [isFocused, multiSelectMode]);

  const handleOptionsPress = (deck) => {
    setSelectedDeck(deck);
    setModalVisible(true);
  };

  const performDelete = async () => {
    if (!selectedDeck) return;

    // Check if it's a default deck and protection is enabled
    if (isDefaultDeck(selectedDeck.id)) {
      const canEdit = await canEditDefaultDecks();
      if (!canEdit) {
        setModalVisible(false);
        setAlertConfig({
            visible: true,
            title: "Deck Protegido",
            message: "Este é um deck padrão do aplicativo. Para apagá-lo, ative a opção 'Permitir edição de decks padrão' nas Configurações.",
            buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
        });
        return;
      }
    }

    setModalVisible(false);

    setAlertConfig({
        visible: true,
        title: "Apagar Deck",
        message: `Tem certeza que deseja apagar o deck "${selectedDeck.name}" e todas as suas matérias e flashcards?`,
        buttons: [
            { text: "Cancelar", style: "cancel", onPress: () => { setSelectedDeck(null); setAlertConfig(prev => ({ ...prev, visible: false })); } },
            {
                text: "Confirmar",
                style: "destructive", // Adicionado para iOS
                onPress: async () => {
                    const allData = await getAppData();
                    const newData = allData.filter(d => d.id !== selectedDeck.id);
                    await saveAppData(newData);
                    loadData(); // Recarrega os dados
                    setSelectedDeck(null);
                    setAlertConfig(prev => ({ ...prev, visible: false }));
                }
            }
        ]
    });
  };

  if (loading) {
      return (
        <SafeAreaView style={styles.baseContainer}>
            <View style={{ paddingTop: 20 }}>
                {[1, 2, 3].map((item) => (
                    <View key={item} style={styles.itemContainer}>
                        <View style={{ flex: 1, marginRight: 16 }}>
                            <SkeletonItem style={{ width: '70%', height: 24, marginBottom: 8 }} />
                            <SkeletonItem style={{ width: '40%', height: 16 }} />
                        </View>
                        <SkeletonItem style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 0 }} />
                    </View>
                ))}
            </View>
        </SafeAreaView>
      );
  }

  const defaultDecks = decks.filter(d => !d.isUserCreated);
  const userDecks = decks.filter(d => d.isUserCreated);
  const filteredUserDecks = userDecks.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <SafeAreaView style={styles.baseContainer}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {defaultDecks.map(item => (
          <TouchableOpacity 
            key={item.id} 
            style={[
              styles.itemContainer,
              multiSelectMode && selectedDecks.has(item.id) && styles.selectedDeckItem
            ]} 
            onPress={() => multiSelectMode ? (allowDefaultDeckEditing ? toggleDeckSelection(item.id) : null) : navigation.navigate('SubjectList', { deckId: item.id, deckName: item.name, preloadedSubjects: item.subjects })}
            onLongPress={() => {
                if (!multiSelectMode && allowDefaultDeckEditing) {
                    setMultiSelectMode(true);
                    toggleDeckSelection(item.id);
                }
            }}
          >
            {multiSelectMode && allowDefaultDeckEditing && (
              <View style={styles.checkboxContainer}>
                <Ionicons 
                  name={selectedDecks.has(item.id) ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={selectedDecks.has(item.id) ? "#4FD1C5" : "#A0AEC0"} 
                />
              </View>
            )}
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <Text style={styles.itemSubtitle}>{item.subjects.length} matéria(s)</Text>
            </View>
            {!multiSelectMode && (
              allowDefaultDeckEditing ? (
                <View style={styles.subjectRightContainer}>
                    <View style={[styles.progressContainer, {borderColor: calculateProgress(item.subjects) === 100 ? '#22C55E' : '#4FD1C5'}]}><Text style={styles.progressText}>{calculateProgress(item.subjects)}%</Text></View>
                    <TouchableOpacity onPress={() => handleOptionsPress(item)} style={styles.subjectOptionsButton}>
                        <Ionicons name="ellipsis-vertical" size={20} color="#A0AEC0" />
                    </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.subjectRightContainer}>
                    <View style={styles.progressContainer}>
                        <Text style={styles.progressText}>{calculateProgress(item.subjects)}%</Text>
                    </View>
                </View>
              )
            )}
          </TouchableOpacity>
        ))}

        {userDecks.length > 0 && (
          <View>
            <View style={styles.userSubjectsDividerContainer}>
              <View style={styles.userSubjectsDivider} />
              <Text style={styles.userSubjectsDividerText}>Meus Decks</Text>
              <View style={styles.userSubjectsDivider} />
            </View>
            <View 
              style={styles.searchContainer}
              ref={searchContainerRef}
              collapsable={false}
            >
              <TextInput
                style={styles.searchInput}
                placeholder="Pesquisar em meus decks..."
                placeholderTextColor="#A0AEC0"
                value={searchTerm}
                onChangeText={setSearchTerm}
                onPressIn={() => {
                  if (searchContainerRef.current && scrollViewRef.current) {
                    setTimeout(() => {
                      searchContainerRef.current.measure((x, y, width, height, pageX, pageY) => {
                        // Scroll to search bar position with offset for visibility
                        scrollViewRef.current.scrollTo({ y: pageY - 100, animated: true });
                      });
                    }, 100);
                  }
                }}
              />
            </View>
          </View>
        )}

        {filteredUserDecks.map(item => (
          <TouchableOpacity 
            key={item.id} 
            style={[
              styles.itemContainer,
              multiSelectMode && selectedDecks.has(item.id) && styles.selectedDeckItem
            ]} 
            onPress={() => multiSelectMode ? toggleDeckSelection(item.id) : navigation.navigate('SubjectList', { deckId: item.id, deckName: item.name, preloadedSubjects: item.subjects })}
            onLongPress={() => {
                if (!multiSelectMode) {
                    setMultiSelectMode(true);
                    toggleDeckSelection(item.id);
                }
            }}
          >
            {multiSelectMode && (
              <View style={styles.checkboxContainer}>
                <Ionicons 
                  name={selectedDecks.has(item.id) ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={selectedDecks.has(item.id) ? "#4FD1C5" : "#A0AEC0"} 
                />
              </View>
            )}
            {!multiSelectMode && (
              <Ionicons name="person-outline" size={16} color="#4FD1C5" style={{marginRight: 8}} />
            )}
            <View style={styles.itemTextContainer}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemSubtitle}>{item.subjects.length} matéria(s)</Text>
            </View>
            {!multiSelectMode && (
              <View style={styles.subjectRightContainer}>
                  <View style={[styles.progressContainer, {borderColor: calculateProgress(item.subjects) === 100 ? '#22C55E' : '#4FD1C5'}]}><Text style={styles.progressText}>{calculateProgress(item.subjects)}%</Text></View>
                  <TouchableOpacity onPress={() => handleOptionsPress(item)} style={styles.subjectOptionsButton}>
                      <Ionicons name="ellipsis-vertical" size={20} color="#A0AEC0" />
                  </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        ))}


      </ScrollView>

      {!multiSelectMode ? (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddDeck')}>
            <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      ) : (
        <>
           <TouchableOpacity
             style={[
                 styles.fab,
                 { 
                     bottom: 90, 
                     width: 44, // Even smaller
                     height: 44, 
                     borderRadius: 12,
                     right: 26, // Centering adjustment (Assuming Fab is 56 right 20 -> Center at 48. This center at 26+22=48)
                     borderWidth: 2,
                     borderColor: '#4FD1C5',
                     // Hollow Logic: Filled if ANY selected
                     backgroundColor: selectedDecks.size > 0 ? '#4FD1C5' : 'transparent',
                 }
             ]}
             onPress={handleSelectAll}
           >
             <Ionicons 
                name="checkmark-done-outline" 
                size={22} 
                color={selectedDecks.size > 0 ? "white" : "#4FD1C5"} 
             />
           </TouchableOpacity>

           <TouchableOpacity
               style={[
                   styles.fab, 
                   { backgroundColor: '#EF4444' }, 
                   selectedDecks.size === 0 && { opacity: 0.5 } 
                ]}
               activeOpacity={selectedDecks.size === 0 ? 1 : 0.7} 
               onPress={selectedDecks.size > 0 ? deleteSelectedDecks : null} 
           >
               <Ionicons name="trash" size={24} color="white" />
           </TouchableOpacity>
        </>
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Opções do Deck</Text>
                 <TouchableOpacity style={styles.modalButton} onPress={async () => {
                  // Check if it's a default deck and protection is enabled
                  if (isDefaultDeck(selectedDeck.id)) {
                    const canEdit = await canEditDefaultDecks();
                    if (!canEdit) {
                      setModalVisible(false);
                      setAlertConfig({
                          visible: true,
                          title: "Deck Protegido",
                          message: "Este é um deck padrão do aplicativo. Para editá-lo, ative a opção 'Permitir edição de decks padrão' nas Configurações.",
                          buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
                      });
                      return;
                    }
                  }
                  setModalVisible(false);
                  navigation.navigate('EditDeck', { deckId: selectedDeck.id });
                }}>
                  <Ionicons name="create-outline" size={22} color="#FFFFFF" />
                  <Text style={styles.modalButtonText}>Editar Nome</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#4A5568' }]} onPress={() => {
                    setModalVisible(false);
                    setMultiSelectMode(true);
                    toggleDeckSelection(selectedDeck.id);
                }}>
                    <Ionicons name="checkbox-outline" size={22} color="white" />
                    <Text style={styles.modalButtonText}>Selecionar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, {backgroundColor: '#EF4444'}]} onPress={performDelete}>
                  <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
                  <Text style={styles.modalButtonText}>Apagar Deck</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, {backgroundColor: '#4A5568', marginTop: 20}]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <CustomAlert visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} buttons={alertConfig.buttons} onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


// =================================================================


export default DeckListScreen;
