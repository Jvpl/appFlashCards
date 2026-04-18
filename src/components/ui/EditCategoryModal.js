import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Keyboard, Pressable,
  ScrollView, TextInput, Dimensions, TouchableWithoutFeedback,
} from 'react-native';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withTiming, runOnJS,
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

const { height: SH } = Dimensions.get('window');

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
  // localVisible controla o Modal internamente — só vai a false após a animação de saída terminar
  const [localVisible, setLocalVisible] = useState(false);
  const isDismissing = useRef(false);

  const entryTranslateY = useSharedValue(500);
  const overlayOpacity = useSharedValue(0);
  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: entryTranslateY.value }],
  }));
  const overlayAnimStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // Abre o modal local imediatamente quando visible=true
  useEffect(() => {
    if (visible) setLocalVisible(true);
  }, [visible]);

  // Carrega IDs de todas as categorias que já têm decks ao abrir
  useEffect(() => {
    if (!visible) return;
    Promise.all([getAppData(), getCustomCategories()]).then(([allData, customs]) => {
      const ids = new Set();
      allData.filter(d => !d.isExample && d.category).forEach(d => ids.add(d.category));
      setActiveCatIds(ids);
    });
  }, [visible]);


  const handleShow = useCallback(() => {
    setSheetReady(true);
    entryTranslateY.value = withTiming(0, { duration: 320 });
    overlayOpacity.value = withTiming(1, { duration: 280 });
  }, [entryTranslateY, overlayOpacity]);

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

  const finishDismiss = useCallback(() => {
    isDismissing.current = false;
    Keyboard.dismiss();
    setLocalVisible(false);
    setSheetReady(false);
    // Adiamos reset+onDismiss para o próximo frame — evita jank do re-render do pai
    requestAnimationFrame(() => {
      reset();
      onDismiss();
    });
  }, [reset, onDismiss]);

  const handleDismiss = useCallback(() => {
    if (isDismissing.current) return;
    isDismissing.current = true;
    overlayOpacity.value = withTiming(0, { duration: 220 });
    entryTranslateY.value = withTiming(SH + 100, { duration: 240 }, () => {
      runOnJS(finishDismiss)();
    });
  }, [entryTranslateY, overlayOpacity, finishDismiss]);

  const finishSave = useCallback(() => {
    setLocalVisible(false);
    requestAnimationFrame(() => {
      reset();
      onSaved?.();
    });
  }, [reset, onSaved]);

  const closeAndSave = useCallback(() => {
    overlayOpacity.value = withTiming(0, { duration: 220 });
    entryTranslateY.value = withTiming(SH + 100, { duration: 240 }, () => {
      runOnJS(finishSave)();
    });
  }, [entryTranslateY, overlayOpacity, finishSave]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const DEFAULT_ICON = 'folder-outline';

    // ── Regra A: item da lista selecionado → troca direta ──
    if (selectedId && !customName.trim()) {
      const allData = await getAppData();
      await saveAppData(allData.map(d =>
        getDeckCatId(d) === categoryId ? { ...d, category: selectedId } : d
      ));
      const usedIds = await getUsedCategoryIds();
      usedIds.add(selectedId);
      usedIds.delete(categoryId);
      await saveUsedCategoryIds(usedIds);
      closeAndSave();
      return;
    }

    // ── Regras B, C, D, E, F: texto digitado ──
    if (customName.trim()) {
      const nameTrimmed = customName.trim();
      const nameLower = nameTrimmed.toLowerCase();
      const icon = customIcon && customIcon !== '__picker__' ? customIcon : DEFAULT_ICON;
      const customs = await getCustomCategories();
      const allData = await getAppData();

      // Sem mudança real
      if (nameTrimmed === categoryName) {
        setSaving(false);
        handleDismiss();
        return;
      }

      // Regra E: nome digitado é categoria padrão disponível (não em uso)
      const matchPresetAvailable = presetCategoriesAvailable.find(
        c => c.name?.trim().toLowerCase() === nameLower && c.id !== categoryId
      );
      if (matchPresetAvailable) {
        await saveAppData(allData.map(d =>
          getDeckCatId(d) === categoryId ? { ...d, category: matchPresetAvailable.id } : d
        ));
        const usedIds = await getUsedCategoryIds();
        usedIds.add(matchPresetAvailable.id);
        usedIds.delete(categoryId);
        await saveUsedCategoryIds(usedIds);
        closeAndSave();
        return;
      }

      // Regra B: nome de categoria já em uso por outro deck → bloqueado
      const inUsePreset = presetCategoriesAvailable
        .filter(c => c.id !== categoryId)
        .find(c => c.name?.trim().toLowerCase() === nameLower && activeCatIds.has(c.id));
      const inUseCustom = customs
        .filter(c => c.id !== categoryId)
        .find(c => c.name?.trim().toLowerCase() === nameLower && activeCatIds.has(c.id));
      if (inUsePreset || inUseCustom) {
        setSaving(false);
        setAlertConfig({
          visible: true,
          title: 'Categoria em uso',
          message: `A categoria "${nameTrimmed}" já está sendo usada por outro deck. Escolha um nome diferente.`,
          buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }],
        });
        return;
      }

      // Regra C: nome de personalizada existente na biblioteca (disponível, sem uso)
      const matchCustomAvailable = customs.find(
        c => c.name?.trim().toLowerCase() === nameLower && c.id !== categoryId && !activeCatIds.has(c.id)
      );
      if (matchCustomAvailable) {
        setSaving(false);
        setAlertConfig({
          visible: true,
          title: 'Categoria já existe',
          message: `"${nameTrimmed}" já existe na sua biblioteca. Quer trocar? Seus decks sairão de "${categoryName}" para "${matchCustomAvailable.name}".`,
          buttons: [
            {
              text: 'Cancelar',
              onPress: () => setAlertConfig(p => ({ ...p, visible: false })),
            },
            {
              text: 'Trocar',
              onPress: async () => {
                setAlertConfig(p => ({ ...p, visible: false }));
                setSaving(true);
                await saveAppData(allData.map(d =>
                  getDeckCatId(d) === categoryId ? { ...d, category: matchCustomAvailable.id } : d
                ));
                const usedIds = await getUsedCategoryIds();
                usedIds.add(matchCustomAvailable.id);
                usedIds.delete(categoryId);
                await saveUsedCategoryIds(usedIds);
                closeAndSave();
              },
            },
          ],
        });
        return;
      }

      // Regra D: nome novo — não existe em lugar nenhum
      const isCurrentCustom = categoryId?.startsWith('custom_');
      if (isCurrentCustom) {
        // Renomeia a categoria personalizada atual (mantém o id, atualiza nome e ícone)
        await saveCustomCategories(customs.map(c =>
          c.id === categoryId ? { ...c, name: nameTrimmed, icon } : c
        ));
      } else {
        // Categoria atual é padrão → cria nova personalizada e migra os decks
        const newId = `custom_${Date.now()}`;
        await saveCustomCategories([...customs, {
          id: newId, name: nameTrimmed, icon,
          color: theme.primary, keywords: [], isCustom: true,
        }]);
        await saveAppData(allData.map(d =>
          getDeckCatId(d) === categoryId ? { ...d, category: newId } : d
        ));
        const usedIds = await getUsedCategoryIds();
        usedIds.add(newId);
        usedIds.delete(categoryId);
        await saveUsedCategoryIds(usedIds);
      }
      closeAndSave();
    }
  }, [selectedId, customName, customIcon, categoryId, categoryName, presetCategoriesAvailable, activeCatIds, entryTranslateY, overlayOpacity, reset, onSaved, onDismiss, saving, closeAndSave]);

  const canSave = (!!selectedId || !!customName.trim()) && !saving;

  // Listas disponíveis por filtro
  const listItemsPreset = presetCategoriesAvailable.filter(c =>
    c.id !== categoryId && !activeCatIds.has(c.id)
  );
  const listItemsCustom = customCategoriesAvailable.filter(c =>
    c.id !== categoryId && !activeCatIds.has(c.id)
  );
  const listItems = page === 0 ? listItemsPreset : listItemsCustom;

  const currentCatIonIcon = categoryId?.startsWith('custom_')
    ? (customCategoriesAvailable.find(c => c.id === categoryId)?.icon || null)
    : null;

  // Bloqueio mútuo: input com texto bloqueia lista; lista com seleção bloqueia input
  const inputLocked = !!selectedId;
  const listLocked = customName.trim().length > 0;

  return (
    <Modal
      transparent
      animationType="none"
      visible={localVisible}
      onShow={handleShow}
      onRequestClose={handleDismiss}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <Reanimated.View style={[StyleSheet.absoluteFillObject, s.overlayBg, overlayAnimStyle]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Reanimated.View
        style={[s.sheetWrap, sheetAnimStyle, !sheetReady && { opacity: 0 }]}
      >
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* ── Header: categoria atual ── */}
          <View style={s.currentRow}>
            <View style={s.currentIconWrap}>
              <CategoryIconGlow categoryId={categoryId} ionIcon={currentCatIonIcon} size={22} />
            </View>
            <Text style={s.currentName} numberOfLines={1}>{categoryName}</Text>
          </View>

          <View style={s.divider} />

          {/* ── Input + picker de ícone ── */}
          <View style={s.inputSection}>
            <View style={s.inputRow}>
              <TouchableOpacity
                style={[s.iconPreview, customIcon && customIcon !== '__picker__' && s.iconPreviewActive, inputLocked && s.lockedOpacity]}
                onPress={() => { if (inputLocked) return; setCustomIcon(p => p === '__picker__' ? null : '__picker__'); }}
                activeOpacity={inputLocked ? 1 : 0.75}
              >
                <Ionicons
                  name={customIcon && customIcon !== '__picker__' ? customIcon : 'folder-outline'}
                  size={20}
                  color={customIcon && customIcon !== '__picker__' ? theme.primary : theme.textMuted}
                />
              </TouchableOpacity>
              <View style={[s.inputWrap, inputLocked && s.lockedOpacity]}>
                <TextInput
                  style={s.input}
                  value={customName}
                  onChangeText={t => setCustomName(t)}
                  placeholder="Nome da categoria"
                  placeholderTextColor={theme.textMuted}
                  maxLength={25}
                  returnKeyType="done"
                  editable={!inputLocked}
                  onSubmitEditing={canSave ? handleSave : undefined}
                />
                {customName.length > 0 && (
                  <Text style={[s.charCount, customName.length >= 20 && s.charCountWarn]}>
                    {customName.length}/25
                  </Text>
                )}
              </View>
            </View>

            {/* Picker de ícones — toggle, só quando input não está bloqueado */}
            {!inputLocked && customIcon === '__picker__' && (
              <View style={s.pickerWrap}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.groupTabsContent}
                  style={s.groupTabsScroll}
                  keyboardShouldPersistTaps="always"
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
                <ScrollView
                  keyboardShouldPersistTaps="always"
                  scrollEnabled={false}
                  contentContainerStyle={s.iconGrid}
                >
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
                </ScrollView>
              </View>
            )}
          </View>

          <View style={s.divider} />

          {/* ── Filtro Padrão / Personalizar ── */}
          <View style={s.tabRow}>
            <TouchableOpacity
              style={[s.tab, page === 0 && s.tabActive]}
              onPress={() => { setPage(0); setSelectedId(null); }}
              activeOpacity={0.7}
            >
              <Text style={[s.tabText, page === 0 && s.tabTextActive]}>Padrão</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, page === 1 && s.tabActive]}
              onPress={() => { setPage(1); setSelectedId(null); }}
              activeOpacity={0.7}
            >
              <Text style={[s.tabText, page === 1 && s.tabTextActive]}>Personalizadas</Text>
            </TouchableOpacity>
          </View>

          {/* ── Lista de categorias disponíveis ── */}
          <View style={[s.listWrap, listLocked && s.lockedOpacity]}>
            {listItems.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="checkmark-circle-outline" size={18} color={theme.textMuted} />
                <Text style={s.emptyText}>
                  {page === 0
                    ? 'Nenhuma outra categoria padrão disponível.'
                    : 'Nenhuma categoria personalizada disponível.'}
                </Text>
              </View>
            ) : page === 0 ? (
              /* Aba Padrão — grade 2 colunas */
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                style={s.listScroll}
                contentContainerStyle={s.gridContent}
              >
                {Array.from({ length: Math.ceil(listItems.length / 2) }, (_, rowIdx) => {
                  const pair = listItems.slice(rowIdx * 2, rowIdx * 2 + 2);
                  return (
                    <View key={rowIdx} style={s.gridRow}>
                      {pair.map((cat) => {
                        const isSel = selectedId === cat.id;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[s.gridCard, isSel && s.gridCardActive]}
                            onPress={() => { if (listLocked) return; setSelectedId(p => p === cat.id ? null : cat.id); }}
                            activeOpacity={listLocked ? 1 : 0.75}
                          >
                            {isSel && (
                              <View style={s.gridCardCheck}>
                                <Ionicons name="checkmark" size={10} color="#0F0F0F" />
                              </View>
                            )}
                            <CategoryIconGlow categoryId={cat.id} ionIcon={null} size={36} />
                            <Text style={[s.gridCardName, isSel && s.gridCardNameActive]}>{cat.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                      {pair.length === 1 && <View style={[s.gridCard, s.gridCardEmpty]} />}
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              /* Aba Personalizadas — grade 2 colunas */
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                style={s.listScroll}
                contentContainerStyle={s.gridContent}
              >
                {Array.from({ length: Math.ceil(listItems.length / 2) }, (_, rowIdx) => {
                  const pair = listItems.slice(rowIdx * 2, rowIdx * 2 + 2);
                  return (
                    <View key={rowIdx} style={s.gridRow}>
                      {pair.map((cat) => {
                        const isSel = selectedId === cat.id;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[s.gridCard, isSel && s.gridCardActive]}
                            onPress={() => { if (listLocked) return; setSelectedId(p => p === cat.id ? null : cat.id); }}
                            activeOpacity={listLocked ? 1 : 0.75}
                          >
                            {isSel && (
                              <View style={s.gridCardCheck}>
                                <Ionicons name="checkmark" size={10} color="#0F0F0F" />
                              </View>
                            )}
                            <Ionicons name={cat.icon || 'folder-outline'} size={36} color={theme.primary} />
                            <Text style={[s.gridCardName, isSel && s.gridCardNameActive]}>{cat.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                      {pair.length === 1 && <View style={[s.gridCard, s.gridCardEmpty]} />}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* ── Botão Salvar ── */}
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
  overlayBg: { backgroundColor: 'rgba(0,0,0,0.6)' },
  sheetWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: Math.round(SH * 0.78),
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#141414',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginTop: 8, marginBottom: 8,
  },

  // Header
  currentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingBottom: 10, gap: 8,
  },
  currentIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  currentName: {
    color: theme.textPrimary,
    fontSize: 13, fontFamily: theme.fontFamily.headingSemiBold,
    flex: 1,
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },

  // Input
  inputSection: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconPreview: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconPreviewActive: { borderColor: theme.primary },
  lockedOpacity: { opacity: 0.35 },
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
  pickerWrap: { gap: 8, marginTop: 12 },
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

  // Filtro
  tabRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8,
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

  // Lista
  listWrap: { flex: 1, paddingHorizontal: 18, paddingBottom: 4 },
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

  // Grade personalizadas
  gridContent: {
    flexGrow: 1,
    gap: 10,
    paddingBottom: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridCard: {
    flex: 1,
    minHeight: 110,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 8,
    position: 'relative',
  },
  gridCardActive: {
    borderColor: theme.primary,
    backgroundColor: 'rgba(93,214,44,0.07)',
  },
  gridCardEmpty: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  gridCardCheck: {
    position: 'absolute',
    top: 7, right: 7,
    width: 16, height: 16,
    borderRadius: 8,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: theme.fontFamily.uiMedium,
    textAlign: 'center',
    flexShrink: 1,
  },
  gridCardNameActive: {
    color: theme.primary,
    fontFamily: theme.fontFamily.uiBold,
  },

  // Footer
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
