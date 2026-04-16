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
  View, Text, TouchableOpacity, StyleSheet, Modal, Keyboard, Pressable,
  ScrollView, TextInput, Dimensions, TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import theme from '../../styles/theme';
import GlowIcon from './GlowIcon';
import { CustomAlert } from './CustomAlert';
import {
  administrativoIcon, educacaoIcon, fiscalIcon, justicaIcon,
  militarIcon, operacionalIcon, saudeIcon, segurancaIcon,
} from '../../assets/svgIconPaths';
import {
  getCustomCategories, saveCustomCategories, getDeckCatId,
} from '../../config/categories';
import { getAppData, saveAppData, getUsedCategoryIds, saveUsedCategoryIds } from '../../services/storage';
import { NativeKeyboardAvoidingContainer } from '../../native/NativeKeyboardAvoidingContainer';

const { width: SW, height: SH } = Dimensions.get('window');

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

const CategoryIconGlow = ({ categoryId, ionIcon, size = 20 }) => {
  if (ionIcon) return <Ionicons name={ionIcon} size={size} color={theme.primary} />;
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
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState(null);
  const [iconGroup, setIconGroup] = useState(0);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });
  const [activeCatIds, setActiveCatIds] = useState(new Set());
  // sheetReady: false até onShow disparar — sheet fica com opacity:0 para não piscar
  const [sheetReady, setSheetReady] = useState(false);
  const pageScrollRef = useRef(null);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const exitAnim = useRef(null);
  const isDismissing = useRef(false);

  // Reanimated shared values para o sheet — shadow tree sincronizado via JSI.
  // entryTranslateY: animação de entrada/saída do sheet
  // kbTranslateY: movimento do teclado frame a frame via onKeyboardSettle
  // TouchTargetHelper usa child.matrix para hit-test → sempre correto.
  const entryTranslateY = useSharedValue(500);
  const kbTranslateY = useSharedValue(0);
  // Dois transforms separados: entryTranslateY via withTiming (JS thread),
  // kbTranslateY aplicado direto na UI thread pelo Reanimated sem passar pelo JS.
  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: entryTranslateY.value + kbTranslateY.value }],
  }));

  // Carrega IDs de todas as categorias que já têm decks ao abrir
  useEffect(() => {
    if (!visible) return;
    Promise.all([getAppData(), getCustomCategories()]).then(([allData, customs]) => {
      const ids = new Set();
      allData.filter(d => !d.isExample && d.category).forEach(d => ids.add(d.category));
      customs.forEach(c => ids.add(c.id));
      setActiveCatIds(ids);
    });
  }, [visible]);

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

  // Recebe altura do teclado frame a frame do Kotlin (onProgress).
  // withTiming(duration:0) = instantâneo mas via JSI — shadow tree atualizado corretamente.
  // Ignora eventos durante o fechamento para não interferir na animação de saída.
  const handleKeyboardSettle = useCallback((e) => {
    if (isDismissing.current) return;
    const h = e.nativeEvent?.height ?? 0;
    kbTranslateY.value = withTiming(-h, { duration: 0 });
  }, [kbTranslateY]);

  const handleShow = useCallback(() => {
    setSheetReady(true);
    kbTranslateY.value = 0;
    entryTranslateY.value = withTiming(0, { duration: 320 });
    Animated.timing(overlayOpacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [entryTranslateY, kbTranslateY]);

  useEffect(() => {
    if (visible) {
      setAlertConfig({ visible: false, title: '', message: '', buttons: [] });
    }
  }, [visible]);

  const reset = useCallback(() => {
    setPage(0);
    setSelectedId(null);
    setCustomName('');
    setCustomIcon(null);
    setIconGroup(0);
    setAlertConfig({ visible: false, title: '', message: '', buttons: [] });
    setSaving(false);
  }, []);

  const handleDismiss = useCallback(() => {
    if (isDismissing.current) return;
    isDismissing.current = true;
    Keyboard.dismiss();
    // Congela kbTranslateY para o teclado descendo não interferir na animação de saída
    kbTranslateY.value = kbTranslateY.value;
    entryTranslateY.value = withTiming(500, { duration: 260 });
    Animated.timing(overlayOpacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(({ finished }) => {
      if (finished) {
        // Mantém em 500 (fora da tela) — não volta para 0 para não piscar
        kbTranslateY.value = 0;
        isDismissing.current = false;
        setSheetReady(false);
        reset();
        onDismiss();
      }
    });
  }, [entryTranslateY, kbTranslateY, reset, onDismiss]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
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
      // Transfere o registro de "usado" do id antigo para o novo
      const usedIds = await getUsedCategoryIds();
      usedIds.add(selectedId);
      usedIds.delete(categoryId);
      await saveUsedCategoryIds(usedIds);
    } else if (customName.trim()) {
      const icon = customIcon && customIcon !== '__picker__' ? customIcon : DEFAULT_ICON;
      const customs = await getCustomCategories();
      const nameTrimmed = customName.trim();
      const nameLower = nameTrimmed.toLowerCase();

      // Se o nome digitado é idêntico (case-sensitive) ao nome da categoria atual, não faz nada
      if (nameTrimmed === categoryName) {
        setSaving(false);
        // Fecha sem salvar — não há mudança real
        entryTranslateY.value = withTiming(500, { duration: 260 });
        Animated.timing(overlayOpacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(({ finished }) => {
          if (finished) { kbTranslateY.value = 0; reset(); onDismiss(); }
        });
        return;
      }

      const duplicateInCustom = customs.find(c => c.name?.trim().toLowerCase() === nameLower && c.id !== categoryId);
      const duplicateInPreset = presetCategoriesAvailable.find(c => c.name?.trim().toLowerCase() === nameLower && c.id !== categoryId);
      if (duplicateInCustom || duplicateInPreset) {
        setSaving(false);
        setAlertConfig({
          visible: true,
          title: 'Nome já existe',
          message: `Já existe uma categoria chamada "${nameTrimmed}". Escolha um nome diferente.`,
          buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }],
        });
        return;
      }
      const existing = customs.find(c => c.id === categoryId);
      if (existing) {
        await saveCustomCategories(customs.map(c =>
          c.id === categoryId ? { ...c, name: nameTrimmed, icon } : c
        ));
      } else {
        const newId = `custom_${Date.now()}`;
        await saveCustomCategories([...customs, {
          id: newId, name: nameTrimmed, icon,
          color: theme.primary, keywords: [], isCustom: true,
        }]);
        const allData = await getAppData();
        await saveAppData(allData.map(d =>
          getDeckCatId(d) === categoryId ? { ...d, category: newId } : d
        ));
        // Registra o novo id como usado e remove o id padrão antigo (se não tiver mais decks)
        const usedIds = await getUsedCategoryIds();
        usedIds.add(newId);
        usedIds.delete(categoryId);
        await saveUsedCategoryIds(usedIds);
      }
    }
    entryTranslateY.value = withTiming(500, { duration: 260 });
    Animated.timing(overlayOpacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(({ finished }) => {
      if (finished) {
        // Mantém em 500 — não volta para 0 para não piscar antes do Modal sumir
        kbTranslateY.value = 0;
        reset();
        onSaved?.();
      }
    });
  }, [selectedId, customName, customIcon, categoryId, page, entryTranslateY, kbTranslateY, reset, onSaved]);

  const canSave = (!!selectedId || (page === 1 && !!customName.trim())) && !saving;

  // Aba Padrão: exclui a categoria atual e qualquer categoria que já tem decks
  const listItems = presetCategoriesAvailable.filter(c =>
    c.id !== categoryId && !activeCatIds.has(c.id)
  );
  const currentCatIonIcon = categoryId?.startsWith('custom_')
    ? (customCategoriesAvailable.find(c => c.id === categoryId)?.icon || null)
    : null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onShow={handleShow}
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      {/* Container mínimo só para capturar onKeyboardSettle — sem filhos pesados */}
      <NativeKeyboardAvoidingContainer style={StyleSheet.absoluteFillObject} pointerEvents="none" onKeyboardSettle={handleKeyboardSettle} />

      {/* Overlay — fecha ao tocar fora do sheet */}
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <Animated.View style={[StyleSheet.absoluteFillObject, s.overlayBg, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Sheet animado via Reanimated */}
      <Reanimated.View
        style={[s.sheetWrap, sheetAnimStyle, !sheetReady && { opacity: 0 }]}
        onStartShouldSetResponder={() => true}
        onResponderGrant={() => {}}
        onResponderRelease={() => {}}
      >
        <View style={s.sheet}>
              {/* Handle */}
              <View style={s.handle} />

              {/* Cabeçalho compacto */}
              <View style={s.currentRow}>
                <View style={s.currentIconWrap}>
                  <CategoryIconGlow categoryId={categoryId} ionIcon={currentCatIonIcon} size={20} />
                </View>
                <Text style={s.currentName} numberOfLines={1}>{categoryName}</Text>
              </View>

              <View style={s.divider} />

              {/* Tabs */}
              <View style={s.tabRow}>
                <View style={s.tabGroup}>
                  <TouchableOpacity
                    style={[s.tab, page === 0 && s.tabActive]}
                    onPress={() => { setPage(0); pageScrollRef.current?.scrollTo({ x: 0, animated: true }); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.tabText, page === 0 && s.tabTextActive]}>Padrão</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.tab, page === 1 && s.tabActive]}
                    onPress={() => { setPage(1); setSelectedId(null); pageScrollRef.current?.scrollTo({ x: SW, animated: true }); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.tabText, page === 1 && s.tabTextActive]}>Personalizar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Pager */}
              <ScrollView
                ref={pageScrollRef}
                horizontal
                pagingEnabled
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                style={s.pager}
                keyboardShouldPersistTaps="always"
              >
                {/* Página 0: lista de categorias */}
                <View style={[s.page, { width: SW }]}>
                  {listItems.length === 0 ? (
                    <View style={s.empty}>
                      <Ionicons name="checkmark-circle-outline" size={18} color={theme.textMuted} />
                      <Text style={s.emptyText}>Nenhuma outra categoria padrão disponível.</Text>
                    </View>
                  ) : (
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="always"
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
                              <CategoryIconGlow categoryId={cat.id} ionIcon={cat.isCustom ? (cat.icon || null) : null} size={20} />
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
                    {/* Área vazia — consome toque para não fechar teclado */}
                    <TouchableWithoutFeedback onPress={() => {}}>
                      <View style={{ flex: 1 }} />
                    </TouchableWithoutFeedback>
                  </View>
                </View>
              </ScrollView>

              {/* Botão Salvar */}
              <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
                <Pressable
                  style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
                  onPressIn={canSave ? handleSave : undefined}
                >
                  <Text style={[s.saveBtnText, !canSave && s.saveBtnTextDisabled]}>
                    Salvar
                  </Text>
                </Pressable>
              </View>
            </View>
      </Reanimated.View>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(p => ({ ...p, visible: false }))}
      />
    </Modal>
  );
}

const s = StyleSheet.create({
  overlayBg: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Math.round(SH * 0.5),
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  nativeContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#141414',
    overflow: 'hidden',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginTop: 8, marginBottom: 8,
  },

  currentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingBottom: 8, gap: 8,
  },
  currentIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(93,214,44,0.08)',
    borderWidth: 1, borderColor: 'rgba(93,214,44,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  currentName: {
    color: theme.textPrimary,
    fontSize: 13, fontFamily: theme.fontFamily.headingSemiBold,
    flex: 1,
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 0 },

  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6,
  },
  tabGroup: { flexDirection: 'row', gap: 8, flex: 1 },
  tabFilterGroup: { flexDirection: 'row', gap: 12 },
  tabFilterText: {
    color: theme.textMuted, fontSize: 11, fontFamily: theme.fontFamily.uiMedium,
  },
  tabFilterTextActive: {
    color: theme.primary, textDecorationLine: 'underline',
  },
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
  tabText: { color: theme.textMuted, fontSize: 12, fontFamily: theme.fontFamily.uiSemiBold },
  tabTextActive: { color: theme.primary },

  pager: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 18 },

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
  listName: { flex: 1, color: theme.textPrimary, fontSize: 14, fontFamily: theme.fontFamily.uiMedium },
  listNameActive: { color: theme.primary, fontFamily: theme.fontFamily.uiBold },

  empty: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 20, paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyText: { flex: 1, color: theme.textSecondary, fontSize: 13, fontFamily: theme.fontFamily.uiMedium },

  customWrap: { flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
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
  charCount: { fontSize: 10, fontFamily: theme.fontFamily.uiBold, color: theme.textMuted },
  charCountWarn: { color: theme.primary },

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
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  iconOpt: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  iconOptActive: { borderColor: theme.primary, backgroundColor: 'rgba(93,214,44,0.08)' },

  footer: {
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  saveBtn: {
    height: 48, borderRadius: 14, backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveBtnDisabled: { backgroundColor: 'rgba(93,214,44,0.25)', shadowOpacity: 0, elevation: 0 },
  saveBtnText: { color: '#0F0F0F', fontSize: 15, fontFamily: theme.fontFamily.uiBold },
  saveBtnTextDisabled: { color: 'rgba(15,15,15,0.45)' },
});
