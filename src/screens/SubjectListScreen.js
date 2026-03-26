import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, InteractionManager, KeyboardAvoidingView, ScrollView, Modal, TouchableWithoutFeedback, TextInput, Platform, BackHandler, Dimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { View as SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAppData, saveAppData } from '../services/storage';
import { isDefaultDeck, canEditDefaultDecks } from '../config/constants';
import { CustomBottomModal } from '../components/ui/CustomBottomModal';
import { SkeletonItem } from '../components/ui/SkeletonItem';
import { CustomAlert } from '../components/ui/CustomAlert';
import styles from '../styles/globalStyles';
import theme from '../styles/theme';

export const SubjectListScreen = ({ route, navigation }) => {
  const { deckId, deckName, preloadedSubjects } = route.params;
  const isFocused = useIsFocused(); // Add missing hook
  const [subjects, setSubjects] = useState(preloadedSubjects || []);
  const [loading, setLoading] = useState(preloadedSubjects ? false : true); // FORCE FALSE if params exist
  const [selectedSubject, setSelectedSubject] = useState(null); 
  const [isModalVisible, setModalVisible] = useState(false);
  const [isSelectionMode, setSelectionMode] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [allowDefaultDeckEditing, setAllowDefaultDeckEditing] = useState(false);

  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });
  
  // Auto-scroll refs
  const scrollViewRef = useRef(null);
  const searchContainerRef = useRef(null);

  const loadData = useCallback(async () => {
    // SECURITY CHECK: If we have subjects, NEVER set loading to true
    if (!preloadedSubjects && subjects.length === 0) setLoading(true);
    
    // Safety delay only if TRULY empty and not preloaded
    const shouldDelay = !preloadedSubjects && subjects.length === 0;
    const minDelay = shouldDelay ? new Promise(resolve => setTimeout(resolve, 300)) : Promise.resolve();
    
    const [allData] = await Promise.all([
      getAppData(),
      minDelay
    ]);

    const deck = allData.find(d => d.id === deckId);
    if (deck) setSubjects(deck.subjects);
    
    // Load default deck editing preference
    const allowEditing = await canEditDefaultDecks();
    setAllowDefaultDeckEditing(allowEditing);
    
    setLoading(false);
  }, [deckId, subjects.length]); // Adicionado dependência subjects.length

  const userSubjects = useMemo(() => subjects.filter(s => s.isUserCreated), [subjects]); // Usando useMemo



  useEffect(() => {
    if (isFocused) {
      const task = InteractionManager.runAfterInteractions(() => {
        loadData();
      });
      return () => task.cancel();
    }
  }, [isFocused, loadData]);



  const calculatePending = useCallback((flashcards) => {
    if (!flashcards || flashcards.length === 0) return 0;
    const now = new Date();
    return flashcards.filter(c => (c.level || 0) < 5 && (c.nextReview == null || new Date(c.nextReview) <= now)).length;
  }, []);

  const handleSelectAll = () => {
    if (selectedSubjects.length > 0) {
        setSelectedSubjects([]);
        return;
    }

    if (!allowDefaultDeckEditing) {
      const allUserSubjects = subjects.filter(s => s.isUserCreated).map(s => s.id);
      setSelectionMode(true);
      setSelectedSubjects(allUserSubjects);
      return;
    }

    setAlertConfig({
        visible: true,
        title: "Seleção Rápida",
        message: "O que você deseja selecionar?",
        buttons: [
            { 
                text: "Todas as matérias", 
                onPress: () => {
                    setSelectedSubjects(subjects.map(s => s.id));
                    setAlertConfig(prev => ({ ...prev, visible: false }));
                }
            },
            { 
                text: "Apenas matérias padrão ou do sistema", 
                onPress: () => {
                    const defaultIds = subjects.filter(s => !s.isUserCreated).map(s => s.id);
                    setSelectedSubjects(defaultIds);
                    setAlertConfig(prev => ({ ...prev, visible: false }));
                }
            },
            { 
                text: "Apenas minhas matérias criadas", 
                onPress: () => {
                    const userIds = subjects.filter(s => s.isUserCreated).map(s => s.id);
                    setSelectedSubjects(userIds);
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

  const handleToggleSelection = useCallback((subjectId) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  }, []);

  const handleOptionsPress = useCallback(async (subject) => {
    // Check if it's a default deck subject and protection is enabled
    // Only protect if the subject itself is NOT user created
    if (isDefaultDeck(deckId) && !subject.isUserCreated) {
      const canEdit = await canEditDefaultDecks();
      if (!canEdit) {
        setAlertConfig({
          visible: true,
          title: "Matéria Protegida",
          message: "Esta matéria pertence a um deck padrão do aplicativo. Para editá-la, ative a opção 'Permitir edição de decks padrão' nas Configurações.",
          buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
        });
        return;
      }
    }
    
    setSelectedSubject(subject);
    setModalVisible(true);
  }, [deckId]); // Updated dependencies

  const performDelete = useCallback(async () => {
    if (!selectedSubject) return;

    // Check if it's a default deck and protection is enabled
    // Only protect if the subject itself is NOT user created
    if (isDefaultDeck(deckId) && !selectedSubject.isUserCreated) {
      const canEdit = await canEditDefaultDecks();
      if (!canEdit) {
        setModalVisible(false);
        setAlertConfig({
          visible: true,
          title: "Matéria Protegida",
          message: "Esta matéria pertence a um deck padrão do aplicativo. Para apagá-la, ative a opção 'Permitir edição de decks padrão' nas Configurações.",
          buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
        });
        return;
      }
    }

    setModalVisible(false);

    setAlertConfig({
      visible: true,
      title: "Apagar Matéria",
      message: `Tem certeza que deseja apagar a matéria "${selectedSubject.name}" e todos os seus flashcards?`,
      buttons: [
        { text: "Cancelar", style: "cancel", onPress: () => { setSelectedSubject(null); setAlertConfig(prev => ({ ...prev, visible: false })); } },
        {
          text: "Confirmar",
          style: "destructive",
          onPress: async () => {
            const allData = await getAppData();
            const newData = allData.map(deck => {
              if (deck.id === deckId) {
                return {
                  ...deck,
                  subjects: deck.subjects.filter(s => s.id !== selectedSubject.id),
                };
              }
              return deck;
            });
            await saveAppData(newData);
            loadData();
            setSelectedSubject(null);
            setAlertConfig(prev => ({ ...prev, visible: false }));
          }
        }
      ]
    });
  }, [selectedSubject, deckId, loadData]); // Adicionado dependências



  const handleBulkDelete = useCallback(async () => {
     if(selectedSubjects.length === 0) return;
     
     // Check if selection involves default subjects and protection is enabled
     const selectedItems = subjects.filter(s => selectedSubjects.includes(s.id));
     const hasDefaultSubject = selectedItems.some(s => !s.isUserCreated);

     if (hasDefaultSubject) {
       const canEdit = await canEditDefaultDecks();
       if (!canEdit) {
         setAlertConfig({
           visible: true,
           title: "Matérias Protegidas",
           message: "Sua seleção contém matérias padrão do aplicativo. Para apagá-las, ative a opção 'Permitir edição de decks padrão' nas Configurações.",
           buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
         });
         return;
       }
     }
     
     setAlertConfig({
      visible: true,
      title: `Apagar ${selectedSubjects.length} matérias`,
      message: "Esta ação também apagará todos os flashcards dentro delas. Deseja continuar?",
      buttons: [
        { text: "Cancelar", style: "cancel", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
        {
          text: "Confirmar",
          style: "destructive",
          onPress: async () => {
            const allData = await getAppData();
            const deck = allData.find(c => c.id === deckId);
            if (deck) {
                deck.subjects = deck.subjects.filter(s => !selectedSubjects.includes(s.id));
                await saveAppData(allData);
                setSelectionMode(false);
                setSelectedSubjects([]);
                loadData();
                setAlertConfig(prev => ({ ...prev, visible: false }));
            }
          }
        }
      ]
    });
  }, [selectedSubjects, deckId, loadData, subjects]); // Adicionado dependências


  useLayoutEffect(() => {
    const hasUserSubjects = subjects.some(s => s.isUserCreated);
    const shouldShowMultiSelect = hasUserSubjects || allowDefaultDeckEditing;

    navigation.setOptions({
      headerTitle: () => {
        const screenWidth = Dimensions.get('window').width;
        return (
          <Text 
            numberOfLines={1} 
            ellipsizeMode="tail" 
            style={{
              color: 'white',
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.bold,
              maxWidth: screenWidth - 140
            }}
          >
            {isSelectionMode ? `${selectedSubjects.length} selecionado(s)` : deckName}
          </Text>
        );
      },
      headerRight: () => null,
      headerLeft: isSelectionMode ? () => (
         <TouchableOpacity onPress={() => { setSelectionMode(false); setSelectedSubjects([]); }} style={{ marginLeft: 15 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
         </TouchableOpacity>
      ) : undefined,
    });
  }, [navigation, isSelectionMode, selectedSubjects, subjects, allowDefaultDeckEditing, deckName, handleBulkDelete]);

  // Handle back button press for selection mode
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFocused && isSelectionMode) {
        setSelectionMode(false);
        setSelectedSubjects([]);
        return true; // Consume the event
      }
      return false; // Allow default navigation
    });
    return () => backHandler.remove();
  }, [isFocused, isSelectionMode]);


  if (loading) {
      return (
        <SafeAreaView style={styles.baseContainer}>
            <View style={{ padding: 15 }}>
                {[1, 2, 3, 4, 5].map((item) => (
                    <View key={item} style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        backgroundColor: theme.backgroundSecondary,
                        padding: 15,
                        borderRadius: 12,
                        marginBottom: 15,
                        borderLeftWidth: 4,
                        borderLeftColor: theme.backgroundTertiary
                    }}>
                        <SkeletonItem style={{ width: 24, height: 24, borderRadius: 12, marginRight: 15 }} />
                        <View style={{ flex: 1 }}>
                            <SkeletonItem style={{ width: '60%', height: 20, marginBottom: 8 }} />
                            <SkeletonItem style={{ width: '40%', height: 16 }} />
                        </View>
                        <SkeletonItem style={{ width: 40, height: 20, borderRadius: 4 }} />
                    </View>
                ))}
            </View>
        </SafeAreaView>
      );
  }

  const defaultSubjects = subjects.filter(s => !s.isUserCreated);
  const filteredUserSubjects = userSubjects.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <SafeAreaView style={styles.baseContainer}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {subjects.length === 0 && <Text style={styles.noItemsText}>Nenhuma matéria ainda. Toque no '+' para criar a primeira!</Text>}
        {defaultSubjects.map(item => (
          <TouchableOpacity 
            key={item.id} 
            style={[
              styles.itemContainer,
              isSelectionMode && selectedSubjects.includes(item.id) && styles.selectedDeckItem
            ]} 
            onPress={() => isSelectionMode ? (allowDefaultDeckEditing ? handleToggleSelection(item.id) : null) : navigation.navigate('Flashcard', { deckId, deckName, subjectId: item.id, subjectName: item.name, preloadedCards: item.flashcards })}
            onLongPress={() => {
              if (!isSelectionMode && allowDefaultDeckEditing) {
                setSelectionMode(true);
                setSelectedSubjects([item.id]);
              }
            }}
          >
            {isSelectionMode && allowDefaultDeckEditing && (
              <Ionicons 
                name={selectedSubjects.includes(item.id) ? 'checkbox' : 'square-outline'} 
                size={24} 
                color="#4FD1C5" 
                style={{marginRight: 15}} 
              />
            )}
            <View style={styles.itemTextContainer}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemSubtitle}>{item.flashcards.length} flashcard(s)</Text>
            </View>
            <View style={styles.subjectRightContainer}>
                {!isSelectionMode && (() => {
                  const pending = calculatePending(item.flashcards);
                  return pending > 0
                    ? <View style={[styles.progressContainer, { borderColor: theme.primary }]}><Text style={styles.progressText}>{pending}</Text></View>
                    : <View style={[styles.progressContainer, { borderColor: theme.success }]}><Ionicons name="checkmark" size={16} color={theme.success} /></View>;
                })()}
                {/* Show ellipsis for default subjects when editing is allowed and NOT in selection mode */}
                {allowDefaultDeckEditing && !isSelectionMode && (
                  <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleOptionsPress(item); }} style={{marginLeft: 10}}>
                    <Ionicons name="ellipsis-vertical" size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
            </View>
          </TouchableOpacity>
        ))}

        {userSubjects.length > 0 && (
          <View>
            <View style={styles.userSubjectsDividerContainer}>
              <View style={styles.userSubjectsDivider} />
              <Text style={styles.userSubjectsDividerText}>Minhas Matérias</Text>
              <View style={styles.userSubjectsDivider} />
            </View>
            <View 
              style={styles.searchContainer}
              ref={searchContainerRef}
              collapsable={false}
            >
              <TextInput
                style={styles.searchInput}
                placeholder="Pesquisar em minhas matérias..."
                placeholderTextColor={theme.textMuted}
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

        {filteredUserSubjects.map(item => (
          <TouchableOpacity 
            key={item.id} 
            style={[
              styles.itemContainer,
              isSelectionMode && selectedSubjects.includes(item.id) && styles.selectedDeckItem
            ]} 
            onPress={() => isSelectionMode ? handleToggleSelection(item.id) : navigation.navigate('Flashcard', { deckId, deckName, subjectId: item.id, subjectName: item.name, preloadedCards: item.flashcards })}
            onLongPress={() => { // Adicionado LongPress
                if (!isSelectionMode) {
                    setSelectionMode(true);
                    setSelectedSubjects([item.id]);
                }
            }}
          >
            {isSelectionMode ? (
              <Ionicons name={selectedSubjects.includes(item.id) ? 'checkbox' : 'square-outline'} size={24} color={theme.primary} style={{marginRight: 15}}/>
            ) : (
              <Ionicons name="person-outline" size={16} color={theme.primary} style={{marginRight: 8}} />
            )}
            <View style={styles.itemTextContainer}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemSubtitle}>{item.flashcards.length} flashcard(s)</Text>
            </View>
            <View style={styles.subjectRightContainer}>
                {!isSelectionMode && (() => {
                  const pending = calculatePending(item.flashcards);
                  return pending > 0
                    ? <View style={[styles.progressContainer, { borderColor: theme.primary }]}><Text style={styles.progressText}>{pending}</Text></View>
                    : <View style={[styles.progressContainer, { borderColor: theme.success }]}><Ionicons name="checkmark" size={16} color={theme.success} /></View>;
                })()}
                {!isSelectionMode && (
                  <TouchableOpacity onPress={() => handleOptionsPress(item)} style={styles.subjectOptionsButton}>
                      <Ionicons name="ellipsis-vertical" size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!isSelectionMode ? (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddSubject', { deckId })}>
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
                     right: 26, // Centering adjustment
                     borderWidth: 2,
                     borderColor: theme.primary,
                     // Hollow Logic: Filled if ANY selected
                     backgroundColor: selectedSubjects.length > 0 ? theme.primary : 'transparent',
                 }
             ]}
             onPress={handleSelectAll}
           >
             <Ionicons 
                name="checkmark-done-outline" 
                size={22} 
                color={selectedSubjects.length > 0 ? theme.textPrimary : theme.primary}
             />
           </TouchableOpacity>

           <TouchableOpacity 
               style={[
                   styles.fab,
                   { backgroundColor: theme.danger },
                   selectedSubjects.length === 0 && { opacity: 0.5 }
                ]}
               activeOpacity={selectedSubjects.length === 0 ? 1 : 0.7}
               onPress={selectedSubjects.length > 0 ? handleBulkDelete : null}
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
                <Text style={styles.modalTitle}>Opções da Matéria</Text>
                <TouchableOpacity style={styles.modalButton} onPress={() => { setModalVisible(false); navigation.navigate('EditSubject', { deckId, subjectId: selectedSubject.id })}}>
                  <Ionicons name="create-outline" size={22} color="#FFFFFF" />
                  <Text style={styles.modalButtonText}>Editar Nome</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.backgroundTertiary }]} onPress={() => {
                    setModalVisible(false);
                    setSelectionMode(true);
                    setSelectedSubjects([selectedSubject.id]);
                }}>
                    <Ionicons name="checkbox-outline" size={22} color="white" />
                    <Text style={styles.modalButtonText}>Selecionar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, {backgroundColor: theme.danger}]} onPress={performDelete}>
                  <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
                  <Text style={styles.modalButtonText}>Apagar Matéria</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, {backgroundColor: theme.backgroundTertiary, marginTop: 20}]} onPress={() => setModalVisible(false)}>
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


export default SubjectListScreen;
