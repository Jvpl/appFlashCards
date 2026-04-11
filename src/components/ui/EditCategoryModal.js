/**
 * EditCategoryModal
 *
 * Modal de edição de categoria — ocupa no máximo 50% da tela.
 * Duas páginas via ScrollView horizontal paginado:
 *   Página 0 — Lista de categorias padrão (+ filtro para customizadas)
 *   Página 1 — Input de nome + picker de ícone (swipe direita)
 *
 * Altura fixa: não muda ao trocar de página.
 * Botão Salvar sempre visível abaixo das páginas.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, TextInput, Dimensions, TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import theme from '../../styles/theme';
import GlowIcon from './GlowIcon';
import {
  administrativoIcon, educacaoIcon, fiscalIcon, justicaIcon,
  militarIcon, operacionalIcon, saudeIcon, segurancaIcon,
} from '../../assets/svgIconPaths';
import {
  getCustomCategories, saveCustomCategories, getDeckCatId,
} from '../../config/categories';
import { getAppData, saveAppData } from '../../services/storage';
import { NativeKeyboardAvoidingContainer } from '../../native/NativeKeyboardAvoidingContainer';

const { width: SW, height: SH } = Dimensions.get('window');
const MODAL_HEIGHT = Math.round(SH * 0.50);

const CATEGORY_SVG_ICONS = {
  administrativo: administrativoIcon,
  educacao: educacaoIcon,
  fiscal: fiscalIcon,
  justica: justicaIcon,
  militar: militarIcon,
  operacional: operacionalIcon,
  saude: saudeIcon,
  seguranca: segurancaIcon,
};

const ICON_GROUPS = [
  { label: 'Estudo', icons: ['book-outline', 'school-outline', 'document-text-outline', 'library-outline', 'pencil-outline', 'calculator-outline', 'flask-outline', 'language-outline', 'reader-outline', 'journal-outline', 'clipboard-outline', 'easel-outline'] },
  { label: 'Objetivo', icons: ['trophy-outline', 'star-outline', 'ribbon-outline', 'flag-outline', 'podium-outline', 'rocket-outline', 'diamond-outline', 'sparkles-outline', 'medal-outline', 'trending-up-outline', 'flame-outline', 'compass-outline'] },
  { label: 'Organização', icons: ['calendar-outline', 'checkmark-circle-outline', 'time-outline', 'people-outline', 'list-outline', 'albums-outline', 'folder-outline', 'bookmark-outline', 'grid-outline', 'layers-outline', 'filter-outline', 'pie-chart-outline'] },
  { label: 'Concurso', icons: ['shield-outline', 'briefcase-outline', 'globe-outline', 'megaphone-outline', 'newspaper-outline', 'scale-outline', 'build-outline', 'id-card-outline', 'document-outline', 'people-circle-outline', 'chatbubbles-outline', 'stats-chart-outline'] },
  { label: 'Outros', icons: ['medkit-outline', 'cash-outline', 'hammer-outline', 'heart-outline', 'bus-outline', 'car-outline', 'home-outline', 'leaf-outline', 'nutrition-outline', 'fitness-outline', 'bicycle-outline', 'game-controller-outline'] },
];

const CategoryIconGlow = ({ categoryId, size = 20 }) => {
  const iconData = CATEGORY_SVG_ICONS[categoryId];
  if (!iconData) return <Ionicons name="folder-outline" size={size} color={theme.primary} />;
  return <GlowIcon iconData={iconData} size={size} color={theme.primary} glowBlur={4} />;
};

export function EditCategoryModal({
  visible,
  onDismiss,
  onSaved,
  categoryId,
  categoryName,
  presetCategoriesAvailable = [],
  customCategoriesAvailable = [],
}) {
  const [page, setPage] = useState(0);            // 0 = categorias, 1 = nova personalizada
  const [filter, setFilter] = useState('preset'); // 'preset' | 'custom'
  const [selectedId, setSelectedId] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState(null);
  const [iconGroup, setIconGroup] = useState(0);
  const pageScrollRef = useRef(null); // mantido para compatibilidade mas não usado
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(MODAL_HEIGHT)).current;

  // Pré-preenche quando a categoria editada é customizada
  useEffect(() => {
    if (visible && categoryId?.startsWith('custom_')) {
      const cat = customCategoriesAvailable.find(c => c.id === categoryId);
      if (cat) {
        setCustomName(cat.name || '');
        setCustomIcon(cat.icon || null);
        setPage(1);
        setTimeout(() => pageScrollRef.current?.scrollTo({ x: SW, animated: false }), 0);
      }
    }
  }, [visible, categoryId, customCategoriesAvailable]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(MODAL_HEIGHT);
    }
  }, [visible]);

  const reset = useCallback(() => {
    setPage(0);
    setFilter('preset');
    setSelectedId(null);
    setCustomName('');
    setCustomIcon(null);
    setIconGroup(0);
  }, []);

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: MODAL_HEIGHT,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => {
      reset();
      onDismiss();
    });
  }, [reset, onDismiss]);

  const canSave = !!selectedId || (page === 1 && !!customName.trim());

  const handleSave = useCallback(async () => {
    const DEFAULT_ICON = 'folder-outline';
    if (selectedId && page !== 1) {
      const allData = await getAppData();
      await saveAppData(allData.map(d =>
        getDeckCatId(d) === categoryId ? { ...d, category: selectedId } : d
      ));
      const customs = await getCustomCategories();
      if (customs.find(c => c.id === categoryId)) {
        await saveCustomCategories(customs.filter(c => c.id !== categoryId));
      }
    } else if (customName.trim()) {
      const icon = customIcon && customIcon !== '__picker__' ? customIcon : DEFAULT_ICON;
      const customs = await getCustomCategories();
      const existing = customs.find(c => c.id === categoryId);
      if (existing) {
        await saveCustomCategories(customs.map(c =>
          c.id === categoryId ? { ...c, name: customName.trim(), icon } : c
        ));
      } else {
        const newId = `custom_${Date.now()}`;
        await saveCustomCategories([...customs, {
          id: newId, name: customName.trim(), icon,
          color: theme.primary, keywords: [], isCustom: true,
        }]);
        const allData = await getAppData();
        await saveAppData(allData.map(d =>
          getDeckCatId(d) === categoryId ? { ...d, category: newId } : d
        ));
      }
    }
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: MODAL_HEIGHT,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => {
      reset();
      onSaved?.();
    });
  }, [selectedId, customName, customIcon, categoryId, page, reset, onSaved]);

  const hasCustomCats = customCategoriesAvailable.length > 0;
  const listItems = filter === 'preset' ? presetCategoriesAvailable : customCategoriesAvailable;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <Animated.View style={[s.overlay, { opacity: overlayOpacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
            <NativeKeyboardAvoidingContainer style={{ height: MODAL_HEIGHT }}>
            <View style={s.sheet}>
              {/* Handle */}
              <View style={s.handle} />

              {/* Cabeçalho — categoria atual */}
              <View style={s.currentRow}>
                <View style={s.currentIconWrap}>
                  <CategoryIconGlow categoryId={categoryId} size={20} />
                </View>
                <View style={s.currentMeta}>
                  <Text style={s.currentLabel}>Categoria atual</Text>
                  <Text style={s.currentName} numberOfLines={1}>{categoryName}</Text>
                </View>
                <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={s.divider} />

              {/* ── Tabs: Categorias / Personalizada + filtro à direita ── */}
              <View style={s.tabRow}>
                {/* Tabs à esquerda */}
                <View style={s.tabGroup}>
                  <TouchableOpacity
                    style={[s.tab, page === 0 && s.tabActive]}
                    onPress={() => { setPage(0); pageScrollRef.current?.scrollTo({ x: 0, animated: true }); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.tabText, page === 0 && s.tabTextActive]}>Categorias</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.tab, page === 1 && s.tabActive]}
                    onPress={() => { setPage(1); setSelectedId(null); pageScrollRef.current?.scrollTo({ x: SW, animated: true }); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.tabText, page === 1 && s.tabTextActive]}>Personalizada</Text>
                  </TouchableOpacity>
                </View>
                {/* Filtro Padrão/Customizadas à direita — só na aba Categorias e se houver custom */}
                {page === 0 && hasCustomCats && (
                  <View style={s.tabFilterGroup}>
                    {[{ key: 'preset', label: 'Padrão' }, { key: 'custom', label: 'Custom' }].map(f => (
                      <TouchableOpacity
                        key={f.key}
                        style={[s.tabFilterChip, filter === f.key && s.tabFilterChipActive]}
                        onPress={() => { setFilter(f.key); setSelectedId(null); }}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.tabFilterText, filter === f.key && s.tabFilterTextActive]}>
                          {f.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* ── Pager ── */}
              <ScrollView
                ref={pageScrollRef}
                horizontal
                pagingEnabled
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                style={s.pager}
                keyboardShouldPersistTaps="handled"
              >
                {/* Página 0: lista de categorias */}
                <View style={[s.page, { width: SW }]}>
                  {listItems.length === 0 ? (
                    <View style={s.empty}>
                      <Ionicons name="checkmark-circle-outline" size={18} color={theme.textMuted} />
                      <Text style={s.emptyText}>
                        {filter === 'preset' ? 'Nenhuma categoria padrão.' : 'Nenhuma categoria customizada.'}
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      style={s.listScroll}
                      contentContainerStyle={s.listContent}
                    >
                      {listItems.map((cat, index) => {
                        const isSel = selectedId === cat.id;
                        const isLast = index === listItems.length - 1;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[s.listRow, isSel && s.listRowActive, isLast && { borderBottomWidth: 0 }]}
                            onPress={() => setSelectedId(p => p === cat.id ? null : cat.id)}
                            activeOpacity={0.75}
                            delayPressIn={50}
                          >
                            <View style={[s.listIconWrap, isSel && s.listIconWrapActive]}>
                              <CategoryIconGlow categoryId={cat.id} size={20} />
                            </View>
                            <Text style={[s.listName, isSel && s.listNameActive]} numberOfLines={1}>
                              {cat.name}
                            </Text>
                            {isSel
                              ? <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                              : <Ionicons name="chevron-forward" size={15} color={theme.textMuted} />
                            }
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>

                {/* Página 1: criar/editar personalizada */}
                <View style={[s.page, { width: SW }]}>
                  <View style={s.customWrap}>
                    <View style={s.inputRow}>
                      <TouchableOpacity
                        style={[s.iconPreview, customIcon && customIcon !== '__picker__' && s.iconPreviewActive]}
                        onPress={() => setCustomIcon(p => p === '__picker__' ? null : '__picker__')}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name={customIcon && customIcon !== '__picker__' ? customIcon : 'folder-outline'}
                          size={20}
                          color={customIcon && customIcon !== '__picker__' ? theme.primary : theme.textMuted}
                        />
                      </TouchableOpacity>
                      <View style={s.inputWrap}>
                        <TextInput
                          style={s.input}
                          value={customName}
                          onChangeText={t => { setCustomName(t); setSelectedId(null); }}
                          placeholder="Nome da categoria"
                          placeholderTextColor={theme.textMuted}
                          maxLength={25}
                          returnKeyType="done"
                        />
                        {customName.length > 0 && (
                          <Text style={[s.charCount, customName.length >= 20 && s.charCountWarn]}>
                            {customName.length}/25
                          </Text>
                        )}
                      </View>
                    </View>
                    {customIcon === '__picker__' && (
                      <View style={s.pickerWrap}>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={s.groupTabsContent}
                          style={s.groupTabsScroll}
                        >
                          {ICON_GROUPS.map((g, i) => (
                            <TouchableOpacity
                              key={g.label}
                              style={[s.groupTab, iconGroup === i && s.groupTabActive]}
                              onPress={() => setIconGroup(i)}
                              activeOpacity={0.75}
                            >
                              <Text style={[s.groupTabText, iconGroup === i && s.groupTabTextActive]}>
                                {g.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        <View style={s.iconGrid}>
                          {ICON_GROUPS[iconGroup].icons.map(ic => (
                            <TouchableOpacity
                              key={ic}
                              style={[s.iconOpt, customIcon === ic && s.iconOptActive]}
                              onPress={() => setCustomIcon(ic)}
                              activeOpacity={0.75}
                            >
                              <Ionicons
                                name={ic}
                                size={18}
                                color={customIcon === ic ? theme.primary : theme.textSecondary}
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>

              {/* Botão Salvar — sempre visível */}
              <View style={s.footer}>
                <TouchableOpacity
                  style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
                  disabled={!canSave}
                  onPress={handleSave}
                  activeOpacity={0.85}
                >
                  <Text style={[s.saveBtnText, !canSave && s.saveBtnTextDisabled]}>
                    Salvar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            </NativeKeyboardAvoidingContainer>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#141414',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginTop: 10, marginBottom: 14,
  },

  // Categoria atual
  currentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingBottom: 14, gap: 12,
  },
  currentIconWrap: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: 'rgba(93,214,44,0.08)',
    borderWidth: 1, borderColor: 'rgba(93,214,44,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  currentMeta: { flex: 1 },
  currentLabel: {
    color: theme.textMuted,
    fontSize: 10, fontFamily: theme.fontFamily.uiMedium,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2,
  },
  currentName: {
    color: theme.textPrimary,
    fontSize: 15, fontFamily: theme.fontFamily.headingSemiBold,
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 0 },

  // Tab row
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8,
  },
  tabGroup: {
    flexDirection: 'row', gap: 8, flex: 1,
  },
  tabFilterGroup: {
    flexDirection: 'row', gap: 4,
  },
  tabFilterChip: {
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  tabFilterChipActive: {
    backgroundColor: 'rgba(93,214,44,0.08)',
    borderColor: 'rgba(93,214,44,0.3)',
  },
  tabFilterText: {
    color: theme.textSecondary, fontSize: 10, fontFamily: theme.fontFamily.uiMedium,
  },
  tabFilterTextActive: { color: theme.primary },
  tab: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(93,214,44,0.1)',
    borderColor: 'rgba(93,214,44,0.35)',
  },
  tabText: {
    color: theme.textMuted,
    fontSize: 12, fontFamily: theme.fontFamily.uiSemiBold,
  },
  tabTextActive: { color: theme.primary },

  // Pager
  pager: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 18 },

  // Filtro padrão/custom
  filterRow: {
    flexDirection: 'row', gap: 6, marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(93,214,44,0.08)',
    borderColor: 'rgba(93,214,44,0.3)',
  },
  filterChipText: {
    color: theme.textSecondary, fontSize: 11, fontFamily: theme.fontFamily.uiMedium,
  },
  filterChipTextActive: { color: theme.primary },

  // Lista de categorias
  listScroll: { flex: 1 },
  listContent: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  listRowActive: { backgroundColor: 'rgba(93,214,44,0.05)' },
  listIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  listIconWrapActive: { borderColor: 'rgba(93,214,44,0.25)' },
  listName: {
    flex: 1, color: theme.textPrimary,
    fontSize: 14, fontFamily: theme.fontFamily.uiMedium,
  },
  listNameActive: { color: theme.primary, fontFamily: theme.fontFamily.uiBold },

  // Empty state
  empty: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 20, paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyText: {
    flex: 1, color: theme.textSecondary,
    fontSize: 13, fontFamily: theme.fontFamily.uiMedium,
  },

  // Personalizada
  customWrap: { flex: 1 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  iconPreview: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconPreviewActive: { borderColor: theme.primary },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, paddingHorizontal: 14, height: 42,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1, color: theme.textPrimary,
    fontSize: 14, fontFamily: theme.fontFamily.uiMedium, paddingVertical: 0,
  },
  charCount: {
    fontSize: 10, fontFamily: theme.fontFamily.uiBold, color: theme.textMuted,
  },
  charCountWarn: { color: theme.primary },

  // Icon picker
  pickerWrap: { gap: 8 },
  groupTabsScroll: { flexGrow: 0 },
  groupTabsContent: { gap: 5, paddingBottom: 2 },
  groupTab: {
    paddingHorizontal: 11, paddingVertical: 4, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'transparent',
  },
  groupTabActive: { borderColor: 'rgba(93,214,44,0.4)' },
  groupTabText: { color: theme.textMuted, fontSize: 11, fontFamily: theme.fontFamily.uiSemiBold },
  groupTabTextActive: { color: theme.primary },
  iconGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 7,
  },
  iconOpt: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  iconOptActive: {
    borderColor: theme.primary,
    backgroundColor: 'rgba(93,214,44,0.08)',
  },

  // Footer / Salvar
  footer: {
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  saveBtn: {
    height: 48, borderRadius: 14, backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveBtnDisabled: {
    backgroundColor: 'rgba(93,214,44,0.25)',
    shadowOpacity: 0, elevation: 0,
  },
  saveBtnText: {
    color: '#0F0F0F', fontSize: 15, fontFamily: theme.fontFamily.uiBold,
  },
  saveBtnTextDisabled: { color: 'rgba(15,15,15,0.45)' },
});
