/**
 * EditCategoryModalScreen
 *
 * Screen apresentada como transparentModal — ocupa no máximo 50% da tela.
 * Duas páginas via ScrollView horizontal paginado:
 *   Página 0 — Lista de categorias padrão disponíveis
 *   Página 1 — Input de nome + picker de ícone (personalizar)
 *
 * Keyboard avoidance:
 *   Gerenciado pelo NativeKeyboardAvoidingContainer (Kotlin).
 *   Ele anima translationY frame-a-frame via WindowInsetsAnimationCompat,
 *   sem passar pela bridge JS. Também corrige hit-test de toques quando
 *   o sheet está transladado para cima.
 *
 * Animações de entrada/saída:
 *   Gerenciadas por Reanimated (overlay + slide do sheet).
 *   NÃO misturar com keyboard — o Kotlin cuida disso separadamente.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Keyboard, Pressable,
  ScrollView, TextInput, Dimensions, TouchableWithoutFeedback,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

import theme from '../styles/theme';
import GlowIcon from '../components/ui/GlowIcon';
import { CustomAlert } from '../components/ui/CustomAlert';
import { NativeKeyboardAvoidingContainer } from '../native/NativeKeyboardAvoidingContainer';
import {
  administrativoIcon, educacaoIcon, fiscalIcon, justicaIcon,
  militarIcon, operacionalIcon, saudeIcon, segurancaIcon,
} from '../assets/svgIconPaths';
import {
  getCustomCategories, saveCustomCategories, getDeckCatId,
} from '../config/categories';
import { getAppData, saveAppData, getUsedCategoryIds, saveUsedCategoryIds } from '../services/storage';

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

export function EditCategoryModalScreen({ route, navigation }) {
  const {
    categoryId,
    categoryName,
    presetCategoriesAvailable = [],
    customCategoriesAvailable = [],
    onSaved,
  } = route.params || {};

  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState(null);
  const [iconGroup, setIconGroup] = useState(0);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });
  const [activeCatIds, setActiveCatIds] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const dismissingRef = useRef(false);

  // Reanimated apenas para overlay + slide de entrada/saída.
  // O teclado é gerenciado pelo NativeKeyboardAvoidingContainer (Kotlin).
  const overlayOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SH * 0.5);

  // Animação de entrada
  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) });
    sheetTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
  }, []);

  // Carrega categorias já em uso
  useEffect(() => {
    Promise.all([getAppData(), getCustomCategories()]).then(([allData, customs]) => {
      const ids = new Set();
      allData.filter(d => !d.isExample && d.category).forEach(d => ids.add(d.category));
      customs.forEach(c => ids.add(c.id));
      setActiveCatIds(ids);
    });
  }, []);

  // Pré-preenche o input se categoria atual é personalizada
  useEffect(() => {
    if (categoryId?.startsWith('custom_')) {
      const cat = customCategoriesAvailable.find(c => c.id === categoryId);
      if (cat) {
        setCustomName(cat.name || '');
        setCustomIcon(cat.icon || null);
      }
    }
  }, [categoryId, customCategoriesAvailable]);

  const goBackAnimated = useCallback((callback) => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    Keyboard.dismiss();
    overlayOpacity.value = withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) });
    const finish = () => {
      navigation.goBack();
      callback?.();
    };
    sheetTranslateY.value = withTiming(SH * 0.5, { duration: 240, easing: Easing.in(Easing.quad) }, (finished) => {
      if (finished) runOnJS(finish)();
    });
  }, [navigation, overlayOpacity, sheetTranslateY]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBackAnimated();
      return true;
    });
    return () => sub.remove();
  }, [goBackAnimated]);

  const canSave = (!!selectedId || !!customName.trim()) && !saving;

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const DEFAULT_ICON = 'folder-outline';

    if (selectedId && !customName.trim()) {
      const allData = await getAppData();
      await saveAppData(allData.map(d =>
        getDeckCatId(d) === categoryId ? { ...d, category: selectedId } : d
      ));
      const customs = await getCustomCategories();
      if (customs.find(c => c.id === categoryId)) {
        await saveCustomCategories(customs.filter(c => c.id !== categoryId));
      }
      const usedIds = await getUsedCategoryIds();
      usedIds.add(selectedId);
      usedIds.delete(categoryId);
      await saveUsedCategoryIds(usedIds);
    } else if (customName.trim()) {
      const icon = customIcon && customIcon !== '__picker__' ? customIcon : DEFAULT_ICON;
      const customs = await getCustomCategories();
      const nameLower = customName.trim().toLowerCase();
      const duplicateInCustom = customs.find(c => c.name?.trim().toLowerCase() === nameLower && c.id !== categoryId);
      const duplicateInPreset = presetCategoriesAvailable.find(c => c.name?.trim().toLowerCase() === nameLower);
      if (duplicateInCustom || duplicateInPreset) {
        setSaving(false);
        setAlertConfig({
          visible: true,
          title: 'Nome já existe',
          message: `Já existe uma categoria chamada "${customName.trim()}". Escolha um nome diferente.`,
          buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }],
        });
        return;
      }
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
        const usedIds = await getUsedCategoryIds();
        usedIds.add(newId);
        usedIds.delete(categoryId);
        await saveUsedCategoryIds(usedIds);
      }
    }

    goBackAnimated(onSaved);
  }, [selectedId, customName, customIcon, categoryId, page, onSaved, goBackAnimated, presetCategoriesAvailable, saving]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  // Categorias disponíveis na lista (padrão e personalizadas separadas, sem as em uso)
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

  // Bloqueio mútuo: input com texto bloqueia lista, lista com seleção bloqueia input
  const inputLocked = !!selectedId;
  const listLocked = customName.trim().length > 0;

  return (
    <View style={s.root} pointerEvents="box-none">
      {/* Overlay — fecha ao tocar fora do sheet */}
      <TouchableWithoutFeedback onPress={() => goBackAnimated()}>
        <Animated.View style={[s.overlay, overlayStyle]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View style={[s.sheetWrap, sheetStyle]} pointerEvents="box-none">
        <TouchableWithoutFeedback accessible={false}>
          <NativeKeyboardAvoidingContainer style={s.nativeContainer}>
            <View style={s.sheet}>
              <View style={s.handle} />

              {/* ── Header: categoria atual ── */}
              <View style={s.currentRow}>
                <View style={s.currentIconWrap}>
                  <CategoryIconGlow categoryId={categoryId} ionIcon={currentCatIonIcon} size={20} />
                </View>
                <Text style={s.currentName} numberOfLines={1}>{categoryName}</Text>
              </View>

              <View style={s.divider} />

              {/* ── Input + picker de ícone ── */}
              <View style={s.inputSection}>
                <View style={s.inputRow}>
                  <TouchableOpacity
                    style={[s.iconPreview, customIcon && customIcon !== '__picker__' && s.iconPreviewActive, inputLocked && s.inputLockedOpacity]}
                    onPress={() => { if (inputLocked) return; setCustomIcon(p => p === '__picker__' ? null : '__picker__'); }}
                    activeOpacity={inputLocked ? 1 : 0.75}
                  >
                    <Ionicons
                      name={customIcon && customIcon !== '__picker__' ? customIcon : 'folder-outline'}
                      size={20}
                      color={customIcon && customIcon !== '__picker__' ? theme.primary : theme.textMuted}
                    />
                  </TouchableOpacity>
                  <View style={[s.inputWrap, inputLocked && s.inputLockedOpacity]}>
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

                {/* Picker de ícones (toggle) */}
                {!inputLocked && customIcon === '__picker__' && (
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
                  <Text style={[s.tabText, page === 1 && s.tabTextActive]}>Personalizar</Text>
                </TouchableOpacity>
              </View>

              {/* ── Lista de categorias disponíveis ── */}
              <View style={[s.listWrap, listLocked && s.listLockedOverlay]}>
                {listItems.length === 0 ? (
                  <View style={s.empty}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={theme.textMuted} />
                    <Text style={s.emptyText}>
                      {page === 0
                        ? 'Nenhuma outra categoria padrão disponível.'
                        : 'Nenhuma categoria personalizada disponível.'}
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    style={s.listScroll}
                    contentContainerStyle={s.listContent}
                    scrollEnabled={true}
                  >
                    {listItems.map((cat, index) => {
                      const isSel = selectedId === cat.id;
                      const isLast = index === listItems.length - 1;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[s.listRow, isSel && s.listRowActive, isLast && { borderBottomWidth: 0 }]}
                          onPress={() => { if (listLocked) return; setSelectedId(p => p === cat.id ? null : cat.id); }}
                          activeOpacity={listLocked ? 1 : 0.75}
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

              {/* ── Botão Salvar ── */}
              <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <Pressable
                  style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
                  disabled={!canSave}
                  onPress={handleSave}
                >
                  <Text style={[s.saveBtnText, !canSave && s.saveBtnTextDisabled]}>
                    Salvar
                  </Text>
                </Pressable>
              </View>
            </View>
          </NativeKeyboardAvoidingContainer>
        </TouchableWithoutFeedback>
      </Animated.View>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(p => ({ ...p, visible: false }))}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '78%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  nativeContainer: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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

  // Header — categoria atual
  currentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingBottom: 10, gap: 8,
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
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },

  // Input + picker
  inputSection: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 0 },
  iconPreview: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconPreviewActive: { borderColor: theme.primary },
  inputLockedOpacity: { opacity: 0.35 },
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
  listLockedOverlay: { opacity: 0.4 },
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

  // Footer / salvar
  footer: {
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  saveBtn: {
    height: 48, borderRadius: 14, backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 6,
  },
  saveBtnDisabled: { backgroundColor: 'rgba(93,214,44,0.25)', shadowOpacity: 0, elevation: 0 },
  saveBtnText: { color: '#0F0F0F', fontSize: 15, fontFamily: theme.fontFamily.uiBold },
  saveBtnTextDisabled: { color: 'rgba(15,15,15,0.45)' },
});
