import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAppData } from '../services/storage';
import { LEVEL_CONFIG } from '../services/srs';
import styles from '../styles/globalStyles';

export const FlashcardHistoryScreen = ({ route, navigation }) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });
  const isFocused = useIsFocused();
  
  // Modal de opções do card
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedCardIdForOptions, setSelectedCardIdForOptions] = useState(null);

  // Context info for the header
  const [contextName, setContextName] = useState('');
  // Guardamos IDs para verificação de redundancia
  const [filterDeckId, setFilterDeckId] = useState(null);
  const [filterSubjectId, setFilterSubjectId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const allData = await getAppData();
    
    // Set Context Name if filtered
    const fDeckId = route.params?.deckId;
    const fSubjectId = route.params?.subjectId;
    setFilterDeckId(fDeckId);
    setFilterSubjectId(fSubjectId);

    if (fDeckId || fSubjectId) {
        // Find names
        const deck = allData.find(d => d.id === fDeckId);
        if (deck) {
            if (fSubjectId) {
                const sub = deck.subjects.find(s => s.id === fSubjectId);
                if (sub) setContextName(`${deck.name} > ${sub.name}`);
                else setContextName(deck.name);
            } else {
                setContextName(deck.name);
            }
        }
    } else {
        setContextName('');
    }

    // Flatten structure: Deck -> Subject -> Card
    let flatList = [];
    allData.forEach(deck => {
      deck.subjects.forEach(subject => {
        subject.flashcards.forEach(card => {
           flatList.push({
             ...card,
             deckId: deck.id,
             deckName: deck.name,
             subjectId: subject.id,
             subjectName: subject.name,
             isPro: !isDefaultDeck(deck.id) // Helper to know if it's a system deck
           });
        });
      });
    });

    // Sort by newest
    flatList.reverse();
    setCards(flatList);
    setLoading(false);
  }, [route.params]);

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, loadData]);

  // Handle back button press for multi-selection mode
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFocused && multiSelectMode) {
        // Exit multi-select mode and clear selections
        setMultiSelectMode(false);
        setSelectedCards(new Set());
        return true; // Consume the event
      }
      return false; // Allow default navigation
    });

    return () => backHandler.remove();
  }, [isFocused, multiSelectMode]); 

  const filteredCards = useMemo(() => {
      let result = cards;

      // 1. Context Filter (if passed params exist)
      const fDeckId = route.params?.deckId;
      const fSubjectId = route.params?.subjectId;

      if (fDeckId) {
          result = result.filter(c => c.deckId === fDeckId);
      }
      if (fSubjectId) {
          result = result.filter(c => c.subjectId === fSubjectId);
      }

      // 2. Search Term Filter
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          result = result.filter(c => 
            (c.question && c.question.toLowerCase().includes(lower)) ||
            (c.answer && c.answer.toLowerCase().includes(lower))
          );
      }
      return result;
  }, [cards, searchTerm, route.params]);

  const toggleSelection = (cardUniqueId) => {
    const newSet = new Set(selectedCards);
    if (newSet.has(cardUniqueId)) {
      newSet.delete(cardUniqueId);
      if (newSet.size === 0) setMultiSelectMode(false);
    } else {
      newSet.add(cardUniqueId);
    }
    setSelectedCards(newSet);
  };

  const handleCardOptions = (cardId) => {
      setSelectedCardIdForOptions(cardId);
      setOptionsModalVisible(true);
  };

  const handleOptionSelect = (action) => {
      setOptionsModalVisible(false);
      const cardId = selectedCardIdForOptions;
      if (!cardId) return;

      const card = cards.find(c => c.id === cardId);

      if (action === 'edit') {
         if (card) navigation.navigate('EditFlashcard', { deckId: card.deckId, subjectId: card.subjectId, cardId: card.id });
      } else if (action === 'select') {
         setMultiSelectMode(true);
         toggleSelection(cardId);
      } else if (action === 'delete') {
         // Single delete confirmation
         confirmDeleteSingle(cardId);
      }
  };

  const confirmDeleteSingle = (cardId) => {
       const card = cards.find(c => c.id === cardId);
       if (!card) return;

       // Check protection
       if (isDefaultDeck(card.deckId)) {
           canEditDefaultDecks().then(canEdit => {
               if (!canEdit) {
                   setAlertConfig({
                    visible: true,
                    title: "Protegido",
                    message: "Este card pertence a um deck padrão. Habilite a edição nas configurações para apagá-lo.",
                    buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
                   });
                   return;
               }
               showDeleteAlert([cardId]);
           });
       } else {
           showDeleteAlert([cardId]);
       }
  };

  const deleteSelected = async () => {
     if (selectedCards.size === 0) return;

     const cardsToDelete = cards.filter(c => selectedCards.has(c.id));
     const hasProtected = cardsToDelete.some(c => isDefaultDeck(c.deckId));

     if (hasProtected) {
         const canEdit = await canEditDefaultDecks();
         if (!canEdit) {
            setAlertConfig({
                visible: true,
                title: "Cards Protegidos",
                message: "Alguns cards pertencem a decks padrão. Ative a edição de decks padrão nas configurações para apagá-lo.",
                buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
            });
            return;
         }
     }
     
     showDeleteAlert(Array.from(selectedCards));
  };

  const showDeleteAlert = (idsToDelete) => {
      setAlertConfig({
        visible: true,
        title: "Apagar Cards",
        message: `Deseja permanentemente apagar ${idsToDelete.length > 1 ? idsToDelete.length + ' cards' : 'este card'}?`,
        buttons: [
            { text: "Cancelar", style: "cancel", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
            { 
               text: "Apagar", 
               style: "destructive", 
               onPress: async () => {
                  const allData = await getAppData();
                  const idsSet = new Set(idsToDelete);

                  const newData = allData.map(deck => ({
                      ...deck,
                      subjects: deck.subjects.map(subj => ({
                          ...subj,
                          flashcards: subj.flashcards.filter(c => !idsSet.has(c.id))
                      }))
                  }));

                  await saveAppData(newData);
                  setMultiSelectMode(false);
                  setSelectedCards(new Set());
                  loadData(); 
                  setAlertConfig(prev => ({ ...prev, visible: false }));
               }
            }
        ]
     });
  };

  // Strip HTML for preview
  const stripHtml = (html) => html ? html.replace(/<[^>]*>?/gm, '').trim() || '(Imagem/Fórmula)' : '';

  return (
    <SafeAreaView style={styles.baseContainer}>
      
      {/* Modern Header / Filter Context */}
      {contextName ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#2D3748', borderBottomWidth: 1, borderBottomColor: '#4A5568' }}>
            <Text style={{ color: '#A0AEC0', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Filtrando por:</Text>
            <Text style={{ color: '#E2E8F0', fontSize: 16, fontWeight: 'bold' }}>{contextName}</Text>
        </View>
      ) : null}

      <View style={[styles.searchContainer, { marginTop: 16 }]}>
         <View style={[styles.searchInput, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, backgroundColor: '#2D3748', borderWidth: 1, borderColor: '#4A5568' }]}>
            <Ionicons name="search" size={20} color="#A0AEC0" style={{ marginRight: 8 }} />
            <TextInput 
                style={{ flex: 1, color: 'white', height: 40 }}
                placeholder="Buscar cards..."
                placeholderTextColor="#718096"
                value={searchTerm}
                onChangeText={setSearchTerm}
            />
            {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                    <Ionicons name="close-circle" size={18} color="#A0AEC0" />
                </TouchableOpacity>
            )}
         </View>
      </View>

      {loading ? (
          <ActivityIndicator size="large" color="#4FD1C5" style={{ marginTop: 20 }} />
      ) : (
          <FlatList 
             data={filteredCards}
             keyExtractor={item => item.id}
             contentContainerStyle={{ padding: 16, paddingBottom: 100, flexGrow: 1 }}
             renderItem={({ item }) => {
                 // Check redundancy
                 const showSubject = !filterSubjectId || item.subjectId !== filterSubjectId;
                 const showDeck = !filterDeckId || item.deckId !== filterDeckId;
                 const hasTags = showSubject || showDeck;

                 return (
                 <TouchableOpacity 
                    style={[
                        {
                            backgroundColor: '#2D3748',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: multiSelectMode && selectedCards.has(item.id) ? '#4FD1C5' : 'transparent', // Border transparent normally
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 4,
                            elevation: 3,
                            flexDirection: 'row',
                            alignItems: 'center'
                        },
                        multiSelectMode && selectedCards.has(item.id) && { backgroundColor: 'rgba(79, 209, 197, 0.1)' }
                    ]}
                    onPress={() => {
                        if (multiSelectMode) toggleSelection(item.id);
                        else navigation.navigate('EditFlashcard', { deckId: item.deckId, subjectId: item.subjectId, cardId: item.id });
                    }}
                    onLongPress={() => {
                        setMultiSelectMode(true);
                        toggleSelection(item.id);
                    }}
                    activeOpacity={0.7}
                 >
                    {multiSelectMode && (
                        <View style={{ marginRight: 12 }}>
                            <Ionicons 
                                name={selectedCards.has(item.id) ? "checkbox" : "square-outline"} 
                                size={24} 
                                color={selectedCards.has(item.id) ? "#4FD1C5" : "#A0AEC0"}
                            />
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        {/* WebView for rendering KaTeX formulas */}
                        <WebView
                            originWhitelist={['*']}
                            source={{ html: `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                                    <style>${katexStyles}</style>
                                    <script>${katexScript}</script>
                                    <script>!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t(require("katex")):"function"==typeof define&&define.amd?define(["katex"],t):"object"==typeof exports?exports.renderMathInElement=t(require("katex")):e.renderMathInElement=t(e.katex)}("undefined"!=typeof self?self:this,(function(e){return function(){"use strict";var t={771:function(t){t.exports=e}},r={};function n(e){var i=r[e];if(void 0!==i)return i.exports;var a=r[e]={exports:{}};return t[e](a,a.exports,n),a.exports}n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,{a:t}),t},n.d=function(e,t){for(var r in t)n.o(t,r)&&!n.o(e,r)&&Object.defineProperty(e,r,{e:!0,get:r[n]})},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})};var i={};return function(){n.r(i),n.d(i,{default:function(){return a}});var e={delimiters:[{left:"$$",right:"$$",display:!0},{left:"\\\\(",right:"\\\\)",display:!1},{left:"\\\\begin{equation}",right:"\\\\end{equation}",display:!0},{left:"\\\\begin{align}",right:"\\\\end{align}",display:!0},{left:"\\\\begin{alignat}",right:"\\\\end{alignat}",display:!0},{left:"\\\\begin{gather}",right:"\\\\end{gather}",display:!0},{left:"\\\\begin{CD}",right:"\\\\end{CD}",display:!0},{left:"\\\\[",right:"\\\\]",display:!0}],ignoredTags:["script","noscript","style","textarea","pre","code","option"],ignoredClasses:[],errorCallback:function(e){console.error(e)},preProcess:function(e){return e}};function a(t,r){var a=function(t,r){var a=Object.assign({},e,r),i=a.delimiters.slice();for(var o in a.ignoredTags)a.ignoredTags.hasOwnProperty(o)&&(a.ignoredTags[o]=a.ignoredTags[o].toLowerCase());return a.ignoredClasses.length||(a.ignoredClasses=null),a}(0,r);!function e(t,r){for(var n=0;n<t.childNodes.length;n++){var a=t.childNodes[n];if(3===a.nodeType){for(var i=a.textContent,o=0,s=[],l=0;l<r.delimiters.length;l++){var h=r.delimiters[l],c=h.left,m=h.right,u=i.indexOf(c);if(-1!==u){var p=i.indexOf(m,u+c.length);-1!==p&&s.push({left:u,right:p+m.length,display:h.display})}}S(s),0!==s.length&&(o=0,s.forEach((function(e){var t=i.slice(o,e.left);r.preProcess(t),o=e.right})),r.preProcess(i.slice(o)))}else 1===a.nodeType&&1!==a.nodeType||-1===r.ignoredTags.indexOf(a.nodeName.toLowerCase())&&(!r.ignoredClasses||!r.ignoredClasses.some((function(e){return a.classList.contains(e)})))&&e(a,r)}}(t,a)}}(),i}()}));</script>
                                    <style>
                                        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
                                        body {
                                            font-family: system-ui, -apple-system, sans-serif;
                                            font-size: 16px;
                                            color: white;
                                            background: transparent;
                                            line-height: 1.4;
                                            padding: 0;
                                            overflow: hidden;
                                            -webkit-text-size-adjust: none;
                                            display: flex;
                                            flex-direction: column;
                                            justify-content: center;
                                            height: 100vh;
                                        }
                                        .content {
                                            display: -webkit-box;
                                            -webkit-line-clamp: 2;
                                            -webkit-box-orient: vertical;
                                            overflow: hidden;
                                            text-overflow: ellipsis;
                                            font-weight: 600;
                                            max-height: 2.8em;
                                            word-break: break-word;
                                        }
                                        .katex { font-size: 1.0em; }
                                        .katex .mfrac { font-size: 1.25em; }
                                        .invisible-char { display: none; }
                                    </style>
                                </head>
                                <body>
                                    <div class="content">${item.question || ''}</div>
                                    <script>
                                        document.addEventListener("DOMContentLoaded", function() {
                                            renderMathInElement(document.body, {
                                                delimiters: [
                                                    {left: "$$", right: "$$", display: true},
                                                    {left: "$", right: "$", display: false}
                                                ],
                                                throwOnError: false
                                            });
                                        });
                                    </script>
                                </body>
                                </html>
                            ` }}
                            style={{ 
                                height: hasTags ? 90 : 70, 
                                backgroundColor: 'transparent',
                                marginBottom: hasTags ? 6 : 0,
                                opacity: 0.99
                            }}
                            scrollEnabled={false}
                            showsVerticalScrollIndicator={false}
                            showsHorizontalScrollIndicator={false}
                        />
                        
                        {hasTags && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                            {showSubject && (
                                <View style={{ backgroundColor: '#4A5568', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 8, marginTop: 4 }}>
                                    <Text style={{ color: '#E2E8F0', fontSize: 10, fontWeight: 'bold' }}>{item.subjectName}</Text>
                                </View>
                            )}
                            {showDeck && (
                                <Text style={{ color: '#A0AEC0', fontSize: 12, marginTop: 4 }}>{item.deckName}</Text>
                            )}
                        </View>
                        )}
                    </View>
                    
                    {!multiSelectMode && (
                        <TouchableOpacity style={{ padding: 8, marginRight: -8 }} onPress={(e) => { e.stopPropagation(); handleCardOptions(item.id); }}>
                             <Ionicons name="ellipsis-vertical" size={20} color="#718096" />
                        </TouchableOpacity>
                    )}
                 </TouchableOpacity>
             )}}
             ListEmptyComponent={
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="documents-outline" size={48} color="#4A5568" />
                    <Text style={{ color: '#A0AEC0', marginTop: 10, fontSize: 16 }}>Nenhum card encontrado.</Text>
                </View>
             }
          />
      )}

      {/* FAB for Deletion */}
      {/* FAB for Deletion */}
      {multiSelectMode && selectedCards.size > 0 && (
          <TouchableOpacity 
            style={[styles.fab, { backgroundColor: '#EF4444' }]} 
            onPress={deleteSelected}
          >
              <Ionicons name="trash" size={24} color="white" />
          </TouchableOpacity>
      )}

      {/* Options Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={optionsModalVisible}
        onRequestClose={() => setOptionsModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOptionsModalVisible(false)}>
         <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Opções</Text>
                
                <TouchableOpacity style={styles.modalButton} onPress={() => handleOptionSelect('edit')}>
                    <Ionicons name="create-outline" size={22} color="white" />
                    <Text style={styles.modalButtonText}>Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#4A5568' }]} onPress={() => handleOptionSelect('select')}>
                    <Ionicons name="checkbox-outline" size={22} color="white" />
                    <Text style={styles.modalButtonText}>Selecionar</Text>
                </TouchableOpacity>

                 <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#EF4444' }]} onPress={() => handleOptionSelect('delete')}>
                    <Ionicons name="trash-outline" size={22} color="white" />
                    <Text style={styles.modalButtonText}>Apagar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalButton, { backgroundColor: 'transparent', marginTop: 10 }]} onPress={() => setOptionsModalVisible(false)}>
                    <Text style={[styles.modalButtonText, { color: '#A0AEC0' }]}>Cancelar</Text>
                </TouchableOpacity>
            </View>
         </View>
        </TouchableWithoutFeedback>
      </Modal>

      <CustomAlert visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} buttons={alertConfig.buttons} onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))} />
    </SafeAreaView>
  );
};

// =================================================================

export default FlashcardHistoryScreen;
