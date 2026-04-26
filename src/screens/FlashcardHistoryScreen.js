import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, BackHandler, TextInput, TouchableOpacity, ActivityIndicator, Modal, TouchableWithoutFeedback } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { View as SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { getAppData, saveAppData } from '../services/storage';
import { LEVEL_CONFIG } from '../services/srs';
import { isDefaultDeck, canEditDefaultDecks } from '../config/constants';
import { katexScript, katexStyles } from '../components/editor/editorTemplates';
import { CustomAlert } from '../components/ui/CustomAlert';
import styles from '../styles/globalStyles';
import theme from '../styles/theme';
import { GlowFab } from '../components/ui/GlowFab';

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
         if (card) navigation.navigate('ManageFlashcards', { deckId: card.deckId, subjectId: card.subjectId, cardId: card.id });
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
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.backgroundSecondary, borderBottomWidth: 1, borderBottomColor: theme.backgroundTertiary }}>
            <Text style={{ color: theme.textMuted, fontSize: theme.fontSize.sm, textTransform: 'uppercase', letterSpacing: 1 }}>Filtrando por:</Text>
            <Text style={{ color: theme.textSecondary, fontSize: theme.fontSize.base, fontWeight: theme.fontWeight.bold }}>{contextName}</Text>
        </View>
      ) : null}

      <View style={[styles.searchContainer, { marginTop: 16 }]}>
         <View style={[styles.searchInput, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.backgroundTertiary }]}>
            <Ionicons name="search" size={20} color={theme.textMuted} style={{ marginRight: 8 }} />
            <TextInput
                style={{ flex: 1, color: theme.textPrimary, height: 40 }}
                placeholder="Buscar cards..."
                placeholderTextColor={theme.textDisabled}
                value={searchTerm}
                onChangeText={setSearchTerm}
            />
            {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                    <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </TouchableOpacity>
            )}
         </View>
      </View>

      {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
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
                            backgroundColor: theme.backgroundSecondary,
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: multiSelectMode && selectedCards.has(item.id) ? theme.primary : 'transparent',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 4,
                            elevation: 3,
                            flexDirection: 'row',
                            alignItems: 'center'
                        },
                        multiSelectMode && selectedCards.has(item.id) && { backgroundColor: theme.primaryTransparent }
                    ]}
                    onPress={() => {
                        if (multiSelectMode) toggleSelection(item.id);
                        else navigation.navigate('ManageFlashcards', { deckId: item.deckId, subjectId: item.subjectId, cardId: item.id });
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
                                color={selectedCards.has(item.id) ? theme.primary : theme.textMuted}
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
                                    <style>
                                        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
                                        html, body { height: 100%; overflow: hidden; -webkit-text-size-adjust: none; }
                                        body {
                                            font-family: system-ui, -apple-system, sans-serif;
                                            font-size: 18px;
                                            color: white;
                                            background: transparent;
                                            display: flex;
                                            align-items: center;
                                        }
                                        .content {
                                            display: block;
                                            white-space: nowrap;
                                            overflow: hidden;
                                            width: 100%;
                                            font-weight: 600;
                                        }
                                        .katex { font-size: 1.3em; vertical-align: middle; }
                                        .invisible-char, .sentinela-anti-caps { display: none; }
                                    </style>
                                </head>
                                <body>
                                    <div class="content">${item.question || ''}</div>
                                    <script>
                                        document.addEventListener("DOMContentLoaded", function() {
                                            var content = document.querySelector('.content');

                                            // Render KaTeX synchronously
                                            content.querySelectorAll('.math-atom[data-latex]').forEach(function(el) {
                                                var latex = el.getAttribute('data-latex');
                                                try { katex.render('\\\\displaystyle ' + latex, el, { throwOnError: false, displayMode: false }); } catch(e) {}
                                            });

                                            var setupDone = false;
                                            var truncateDone = false;

                                            function setupSpans() {
                                                if (setupDone) return;
                                                setupDone = true;
                                                Array.from(content.childNodes).forEach(function(node) {
                                                    if (node.nodeType === 3) {
                                                        var s = document.createElement('span');
                                                        s.textContent = node.textContent;
                                                        content.insertBefore(s, node);
                                                        content.removeChild(node);
                                                    }
                                                });
                                            }

                                            function getEls() {
                                                return Array.from(content.children).filter(function(el) {
                                                    var cls = el.className || '';
                                                    var isHelper = cls.includes('invisible-char') || cls.includes('sentinela-anti-caps');
                                                    var isEmpty = !el.hasAttribute('data-latex') && el.textContent.trim() === '';
                                                    return !isHelper && !isEmpty;
                                                });
                                            }

                                            // Sum widths using getBoundingClientRect — unaffected by overflow:hidden on container
                                            function visibleW(els) {
                                                return els.reduce(function(sum, el) {
                                                    return sum + (el.style.display !== 'none' ? el.getBoundingClientRect().width : 0);
                                                }, 0);
                                            }

                                            function smartTruncate() {
                                                if (truncateDone) return;
                                                setupSpans();

                                                var W = window.innerWidth;
                                                if (!W) return;

                                                var els = getEls();
                                                if (!els.length) { truncateDone = true; return; }

                                                // If layout not ready yet (all widths 0), skip — retry timer will fire
                                                var allZero = els.every(function(el) { return el.getBoundingClientRect().width === 0; });
                                                if (allZero) return;

                                                truncateDone = true;

                                                var first = els[0];
                                                var firstW = first.getBoundingClientRect().width;

                                                // Rule A: first is a wide/complex formula (>38% of W)
                                                if (first.hasAttribute('data-latex') && firstW > W * 0.38) {
                                                    if (els.length > 1) {
                                                        els.slice(1).forEach(function(e) { e.style.display = 'none'; });
                                                        var d = document.createElement('span');
                                                        d.textContent = ' \u2026';
                                                        d.style.color = '#4FD1C5';
                                                        content.appendChild(d);
                                                    }
                                                    return;
                                                }

                                                // Rule B: fits — nothing to do
                                                if (visibleW(els) <= W) return;

                                                // Rule C: remove elements from right until remaining fits, then add ellipsis
                                                var DOTS_W = 22;
                                                var truncated = false;
                                                for (var i = els.length - 1; i >= 0; i--) {
                                                    els[i].style.display = 'none';
                                                    if (visibleW(els) <= W - DOTS_W) {
                                                        truncated = true;
                                                        // Non-formula: restore max text that fits at a word boundary
                                                        if (!els[i].hasAttribute('data-latex')) {
                                                            var orig = els[i].textContent;
                                                            els[i].style.display = '';
                                                            var lo = 0, hi = orig.length;
                                                            while (hi - lo > 1) {
                                                                var mid = Math.floor((lo + hi) / 2);
                                                                els[i].textContent = orig.slice(0, mid);
                                                                if (visibleW(els) <= W - DOTS_W) lo = mid;
                                                                else hi = mid;
                                                            }
                                                            if (lo > 0) {
                                                                var partial = orig.slice(0, lo);
                                                                var isMidWord = lo < orig.length
                                                                    && orig[lo] !== ' '
                                                                    && partial[partial.length - 1] !== ' ';
                                                                if (isMidWord) {
                                                                    var lastSpace = partial.lastIndexOf(' ');
                                                                    if (lastSpace > 0) partial = partial.slice(0, lastSpace);
                                                                }
                                                                var trimmed = partial.trimEnd();
                                                                if (trimmed) els[i].textContent = trimmed;
                                                                else els[i].style.display = 'none';
                                                            } else {
                                                                els[i].style.display = 'none';
                                                            }
                                                        }
                                                        break;
                                                    }
                                                    if (i === 0) { els[0].style.display = ''; truncated = true; break; }
                                                }

                                                if (truncated) {
                                                    var dotsEl = document.createElement('span');
                                                    dotsEl.textContent = '\u2026';
                                                    dotsEl.style.color = '#4FD1C5';
                                                    content.appendChild(dotsEl);
                                                }
                                            }

                                            // Run after fonts load (+100ms for layout), with a long fallback
                                            if (document.fonts && document.fonts.ready) {
                                                document.fonts.ready.then(function() { setTimeout(smartTruncate, 100); });
                                            }
                                            setTimeout(smartTruncate, 600);
                                        });
                                    </script>
                                </body>
                                </html>
                            ` }}
                            style={{
                                flex: 1,
                                height: hasTags ? 82 : 66,
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
                                <View style={{ backgroundColor: theme.backgroundTertiary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 8, marginTop: 4 }}>
                                    <Text style={{ color: theme.textSecondary, fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.bold }}>{item.subjectName}</Text>
                                </View>
                            )}
                            {showDeck && (
                                <Text style={{ color: theme.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 }}>{item.deckName}</Text>
                            )}
                        </View>
                        )}
                    </View>
                    
                    {!multiSelectMode && (
                        <TouchableOpacity style={{ padding: 8, marginRight: -8 }} onPress={(e) => { e.stopPropagation(); handleCardOptions(item.id); }}>
                             <Ionicons name="ellipsis-vertical" size={20} color={theme.textDisabled} />
                        </TouchableOpacity>
                    )}
                 </TouchableOpacity>
             )}}
             ListEmptyComponent={
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="documents-outline" size={48} color={theme.backgroundTertiary} />
                    <Text style={{ color: theme.textMuted, marginTop: 10, fontSize: theme.fontSize.base }}>Nenhum card encontrado.</Text>
                </View>
             }
          />
      )}

      {/* FAB for Deletion */}
      {/* FAB for Deletion */}
      {multiSelectMode && selectedCards.size > 0 && (
        <View style={{ position: 'absolute', right: 20, bottom: 20 }}>
          <GlowFab onPress={deleteSelected} color={theme.danger}>
            <Ionicons name="trash" size={24} color="white" />
          </GlowFab>
        </View>
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

                <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.backgroundTertiary }]} onPress={() => handleOptionSelect('select')}>
                    <Ionicons name="checkbox-outline" size={22} color="white" />
                    <Text style={styles.modalButtonText}>Selecionar</Text>
                </TouchableOpacity>

                 <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.danger }]} onPress={() => handleOptionSelect('delete')}>
                    <Ionicons name="trash-outline" size={22} color="white" />
                    <Text style={styles.modalButtonText}>Apagar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalButton, { backgroundColor: 'transparent', marginTop: 10 }]} onPress={() => setOptionsModalVisible(false)}>
                    <Text style={[styles.modalButtonText, { color: theme.textMuted }]}>Cancelar</Text>
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
