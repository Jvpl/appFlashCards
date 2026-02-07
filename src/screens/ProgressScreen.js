import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { getAppData } from '../services/storage';
import { LEVEL_CONFIG } from '../services/srs';
import styles from '../styles/globalStyles';

export const ProgressScreen = () => {
  const navigation = useNavigation();
  // Ref para o ScrollView principal
  const scrollViewRef = useRef(null);
  // Refs para cada item da lista (para rolagem automática)
  const deckRefs = useRef({});
  const contentRef = useRef(null);

  const [stats, setStats] = useState({ total: 0, learned: 0 });
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('inProgress'); // 'inProgress' or 'completed'
  
  const [expandedInProgress, setExpandedInProgress] = useState(null);
  const [expandedCompleted, setExpandedCompleted] = useState(null);
  
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets(); // Hook para safe area

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      const data = await getAppData();
      let totalMaxLevel = 0;
      let currentLevelSum = 0;
      
      const structuredData = data.map(deck => {
        const subjectsWithProgress = deck.subjects.map(subject => {
          const totalLevels = subject.flashcards.length * 5;
          const currentLevels = subject.flashcards.reduce((sum, card) => sum + (card.level || 0), 0);
          totalMaxLevel += totalLevels;
          currentLevelSum += currentLevels;
          return {
            ...subject,
            progress: totalLevels > 0 ? Math.round((currentLevels / totalLevels) * 100) : 0,
          };
        });

        return {
          ...deck,
          subjects: subjectsWithProgress,
        };
      });

      setStats({ total: totalMaxLevel, learned: currentLevelSum });
      setProgressData(structuredData);
      setLoading(false);
    };

    if (isFocused) {
      loadStats();
    }
  }, [isFocused]);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4A5568" /></View>;

  const overallProgress = stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0;
  
  const renderList = (isCompletedList) => {
    const expandedId = isCompletedList ? expandedCompleted : expandedInProgress;
    const setExpandedId = isCompletedList ? setExpandedCompleted : setExpandedInProgress;

    const handleToggle = (deckId) => {
      const isExpanding = expandedId !== deckId;
      setExpandedId(prevId => (prevId === deckId ? null : deckId));

      if (isExpanding) {
        // Aguarda a renderização da lista expandida e rola até ela
        setTimeout(() => {
          const element = deckRefs.current[deckId];
          const scrollView = scrollViewRef.current;
          
          if (element && scrollView && contentRef.current) {
            // Tenta medir a posição do elemento
            element.measure((x, y, width, height, pageX, pageY) => {
              if (pageY !== undefined) {
                // Rola para mostrar o item expandido
                // Usa um offset para garantir que o item fique visível
                const scrollOffset = Math.max(0, pageY - 100);
                scrollView.scrollTo({ y: scrollOffset, animated: true });
              }
            });
          }
        }, 150); // Delay otimizado para responsividade
      }
    };

    const filteredData = progressData.map(deck => {
      const filteredSubjects = deck.subjects
        .filter(subject => (isCompletedList ? subject.progress === 100 : subject.progress < 100))
        .sort((a, b) => b.progress - a.progress);

      return { ...deck, subjects: filteredSubjects };
    }).filter(deck => deck.subjects.length > 0);

    if (filteredData.length === 0) {
      return <Text style={styles.noItemsText}>{isCompletedList ? "Nenhuma matéria concluída ainda." : "Nenhuma matéria em andamento."}</Text>
    }

    return filteredData.map(deck => (
      <View 
        key={deck.id} 
        style={styles.deckGroup}
        ref={el => deckRefs.current[deck.id] = el} // Captura a referência deste item
        renderToHardwareTextureAndroid={true} // Otimização para animação
      >
        <TouchableOpacity style={styles.deckHeader} onPress={() => handleToggle(deck.id)}>
          <Text style={styles.deckGroupTitle}>{deck.name}</Text>
          <Ionicons name={expandedId === deck.id ? 'chevron-up' : 'chevron-down'} size={20} color="#A0AEC0" />
        </TouchableOpacity>
        {expandedId === deck.id && (
          <View>
            {deck.subjects.map((subject, index) => (
               <View key={subject.id}>
                 {/* Agora o item é clicável e navega para os flashcards */}
                <TouchableOpacity 
                    style={styles.progressSubjectContainer}
                    onPress={() => navigation.navigate('Início', {
                        screen: 'HomeDrawer',
                        params: {
                            screen: 'Flashcard',
                            params: { deckId: deck.id, subjectId: subject.id, subjectName: subject.name }
                        }
                    })}
                >
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemTitle}>{subject.name}</Text>
                  </View>
                  <View style={[styles.progressContainer, { borderColor: subject.progress === 100 ? '#22C55E' : '#4FD1C5' }]}>
                      <Text style={styles.progressText}>{subject.progress}%</Text>
                  </View>
                </TouchableOpacity>
                {index < deck.subjects.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}
      </View>
    ));
  }

  return (
    <ScrollView 
        style={styles.baseContainer} 
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        ref={scrollViewRef}
    >
      <View ref={contentRef}>
        {/* Adicionado paddingSuperior para respeitar o Header/Statusbar */}
        <View style={[styles.progressHeader, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.progressTitle}>Progresso Geral</Text>
          <Text style={styles.progressValue}>{overallProgress}%</Text>
          <Text style={styles.progressSubtitle}>Acompanhe sua maestria</Text>
        </View>

        <View style={styles.toggleContainer}>
          <TouchableOpacity 
              style={[styles.toggleButton, viewMode === 'inProgress' && styles.toggleButtonActive]} 
              onPress={() => setViewMode('inProgress')}>
            <Text style={[styles.toggleButtonText, viewMode === 'inProgress' && styles.toggleButtonTextActive]}>Em Andamento</Text>
          </TouchableOpacity>
          <TouchableOpacity 
              style={[styles.toggleButton, viewMode === 'completed' && styles.toggleButtonActive]} 
              onPress={() => setViewMode('completed')}>
            <Text style={[styles.toggleButtonText, viewMode === 'completed' && styles.toggleButtonTextActive]}>Concluídos</Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'inProgress' ? renderList(false) : renderList(true)}
      </View>
    </ScrollView>
  );
};

// =================================================================


export default ProgressScreen;
