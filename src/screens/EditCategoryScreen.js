/**
 * EditCategoryScreen
 *
 * Tela dedicada para edição de categoria — substitui o BottomSheet de edição.
 * Por ser uma tela normal (não Modal), o useAnimatedKeyboard do Reanimated
 * funciona diretamente na UI thread, sem Window separada, sem bridge, sem delay.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { ScrollView as RNGHScrollView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import theme from '../styles/theme';
import GlowIcon from '../components/ui/GlowIcon';
import {
  administrativoIcon, educacaoIcon, fiscalIcon, justicaIcon,
  militarIcon, operacionalIcon, saudeIcon, segurancaIcon,
} from '../assets/svgIconPaths';
import {
  getCustomCategories, saveCustomCategories, getDeckCatId,
} from '../config/categories';
import { getAppData, saveAppData } from '../services/storage';

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

const CategoryIconGlow = ({ categoryId, size = 22 }) => {
  const iconData = CATEGORY_SVG_ICONS[categoryId];
  if (!iconData) return <Ionicons name="folder-outline" size={size} color={theme.primary} />;
  return <GlowIcon iconData={iconData} size={size} color={theme.primary} glowBlur={5} />;
};

const ICON_GROUPS = [
  { label: 'Estudo', icons: ['book-outline', 'school-outline', 'document-text-outline', 'library-outline', 'pencil-outline', 'calculator-outline', 'flask-outline', 'language-outline', 'reader-outline', 'journal-outline', 'clipboard-outline', 'easel-outline'] },
  { label: 'Objetivo', icons: ['trophy-outline', 'star-outline', 'ribbon-outline', 'flag-outline', 'podium-outline', 'rocket-outline', 'diamond-outline', 'sparkles-outline', 'medal-outline', 'trending-up-outline', 'flame-outline', 'compass-outline'] },
  { label: 'Trabalho', icons: ['briefcase-outline', 'business-outline', 'construct-outline', 'hammer-outline', 'build-outline', 'cog-outline', 'settings-outline', 'analytics-outline', 'bar-chart-outline', 'clipboard-outline', 'folder-outline', 'server-outline'] },
  { label: 'Pessoas', icons: ['people-outline', 'person-outline', 'person-add-outline', 'man-outline', 'woman-outline', 'body-outline', 'hand-left-outline', 'heart-outline', 'happy-outline', 'thumbs-up-outline', 'accessibility-outline', 'walk-outline'] },
  { label: 'Natureza', icons: ['leaf-outline', 'flower-outline', 'earth-outline', 'planet-outline', 'cloudy-outline', 'rainy-outline', 'sunny-outline', 'snow-outline', 'thunderstorm-outline', 'water-outline', 'bonfire-outline', 'globe-outline'] },
  { label: 'Tech', icons: ['phone-portrait-outline', 'laptop-outline', 'desktop-outline', 'tablet-portrait-outline', 'wifi-outline', 'bluetooth-outline', 'radio-outline', 'tv-outline', 'camera-outline', 'mic-outline', 'headset-outline', 'game-controller-outline'] },
];

const AnimatedScrollView = Animated.createAnimatedComponent(RNGHScrollView);

export function EditCategoryScreen({ route, navigation }) {
  const { categoryId, categoryName, presetCategoriesAvailable } = route.params;
  const insets = useSafeAreaInsets();
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState(null);
  const [activeIconGroup, setActiveIconGroup] = useState(0);

  // UI thread, zero bridge, zero delay
  // isStatusBarTranslucent necessário pois StatusBar é translucent neste app
  const keyboard = useAnimatedKeyboard({ isStatusBarTranslucent: true });

  const scrollStyle = useAnimatedStyle(() => ({
    flex: 1,
    paddingBottom: keyboard.height.value,
  }));

  const canSave = !!selectedPresetId || !!customName.trim();

  const handleSave = useCallback(async () => {
    const DEFAULT_CAT_ICON = 'folder-outline';

    if (selectedPresetId) {
      const allData = await getAppData();
      const updated = allData.map(d =>
        getDeckCatId(d) === categoryId ? { ...d, category: selectedPresetId } : d
      );
      await saveAppData(updated);
      const customCats = await getCustomCategories();
      if (customCats.find(c => c.id === categoryId)) {
        await saveCustomCategories(customCats.filter(c => c.id !== categoryId));
      }
      navigation.goBack();

    } else if (customName.trim()) {
      const resolvedIcon = customIcon && customIcon !== '__picker__' ? customIcon : DEFAULT_CAT_ICON;
      const customCats = await getCustomCategories();
      const isExistingCustom = customCats.find(c => c.id === categoryId);

      if (isExistingCustom) {
        await saveCustomCategories(customCats.map(c =>
          c.id === categoryId ? { ...c, name: customName.trim(), icon: resolvedIcon } : c
        ));
        navigation.goBack();
      } else {
        const newId = `custom_${Date.now()}`;
        await saveCustomCategories([...customCats, {
          id: newId, name: customName.trim(), icon: resolvedIcon,
          color: theme.primary, keywords: [], isCustom: true,
        }]);
        const allData = await getAppData();
        await saveAppData(allData.map(d =>
          getDeckCatId(d) === categoryId ? { ...d, category: newId } : d
        ));
        navigation.goBack();
      }
    }
  }, [selectedPresetId, customName, customIcon, categoryId, navigation]);

  return (
    <View style={styles.container}>
      {/* Header customizado igual ao padrão do app */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Categoria</Text>
        <View style={styles.headerRight} />
      </View>
      <View style={styles.headerDivider} />

      <AnimatedScrollView
        style={scrollStyle}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* Info atual */}
        <View style={edit.currentInfo}>
          <View style={edit.currentIconWrap}>
            <CategoryIconGlow categoryId={categoryId} size={26} />
          </View>
          <Text style={edit.currentName}>{categoryName}</Text>
          <Text style={edit.currentTag}>atual</Text>
        </View>

        {/* Categorias padrão */}
        <View style={edit.sectionHeader}>
          <Text style={edit.sectionLabel}>CATEGORIAS DISPONÍVEIS</Text>
          {presetCategoriesAvailable.length > 0 && (
            <Text style={edit.sectionCount}>{presetCategoriesAvailable.length} categorias</Text>
          )}
        </View>

        {presetCategoriesAvailable.length === 0 ? (
          <View style={[edit.emptyPreset, { marginBottom: 20 }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color={theme.textMuted} />
            <Text style={edit.emptyPresetTxt}>Todas as categorias padrão já estão em uso.</Text>
          </View>
        ) : (
          <LinearGradient colors={['#1E2420', '#181818']} style={[edit.presetList, { marginBottom: 20 }]}>
            {presetCategoriesAvailable.map((cat, index) => {
              const isSelected = selectedPresetId === cat.id;
              const isLast = index === presetCategoriesAvailable.length - 1;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[edit.presetRowList, isSelected && edit.presetRowListActive, isLast && { borderBottomWidth: 0 }]}
                  onPress={() => { setSelectedPresetId(p => p === cat.id ? null : cat.id); setCustomName(''); }}
                  activeOpacity={0.75}
                  delayPressIn={60}
                >
                  <View style={[edit.presetIconWrapList, isSelected && edit.presetIconWrapListActive]}>
                    <CategoryIconGlow categoryId={cat.id} size={22} />
                  </View>
                  <Text style={[edit.presetRowNameList, isSelected && edit.presetRowNameListActive]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  {isSelected
                    ? <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                    : <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                  }
                </TouchableOpacity>
              );
            })}
          </LinearGradient>
        )}

        {/* Personalizada */}
        <View style={edit.sectionHeader}>
          <Text style={edit.sectionLabel}>PERSONALIZADA</Text>
        </View>
        <View style={edit.customPanel}>
          <View style={edit.panelNameRow}>
            <TouchableOpacity
              style={[edit.panelIconPreview, customIcon && customIcon !== '__picker__' && edit.panelIconPreviewActive]}
              onPress={() => setCustomIcon(p => p === '__picker__' ? null : '__picker__')}
              activeOpacity={0.75}
              delayPressIn={60}
            >
              <Ionicons
                name={customIcon && customIcon !== '__picker__' ? customIcon : 'folder-outline'}
                size={22}
                color={customIcon && customIcon !== '__picker__' ? theme.primary : theme.textMuted}
              />
            </TouchableOpacity>
            <View style={edit.panelInputWrap}>
              <TextInput
                style={edit.panelInput}
                value={customName}
                onChangeText={t => { setCustomName(t); setSelectedPresetId(null); }}
                placeholder="Nome da categoria"
                placeholderTextColor={theme.textMuted}
                maxLength={25}
              />
              {customName.length > 0 && (
                <Text style={[edit.charCount, customName.length >= 20 && edit.charCountWarn]}>
                  {customName.length}/25
                </Text>
              )}
            </View>
          </View>
          <View style={edit.panelIconHint}>
            <Ionicons name="information-circle-outline" size={13} color={theme.textMuted} />
            <Text style={edit.panelIconHintText}>
              Toque no ícone para escolher. Sem escolha, será usado o ícone genérico.
            </Text>
          </View>
        </View>

        {/* Icon Picker */}
        {customIcon === '__picker__' && (
          <View style={edit.iconPicker}>
            <RNGHScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={edit.iconTabsScroll}
              contentContainerStyle={edit.iconTabsContent}
              activeOffsetX={[-20, 20]}
            >
              {ICON_GROUPS.map((group, i) => (
                <TouchableOpacity
                  key={group.label}
                  style={[edit.iconTab, activeIconGroup === i && edit.iconTabActive]}
                  onPress={() => setActiveIconGroup(i)}
                  activeOpacity={0.75}
                  delayPressIn={60}
                >
                  <Text style={[edit.iconTabText, activeIconGroup === i && edit.iconTabTextActive]}>
                    {group.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </RNGHScrollView>
            <View style={edit.iconGrid}>
              {ICON_GROUPS[activeIconGroup].icons.map(ic => (
                <TouchableOpacity
                  key={ic}
                  style={[edit.iconOpt, customIcon === ic && edit.iconOptSelected]}
                  onPress={() => setCustomIcon(ic)}
                  activeOpacity={0.75}
                  delayPressIn={60}
                >
                  <Ionicons name={ic} size={20} color={customIcon === ic ? theme.primary : theme.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Botão Salvar */}
        <TouchableOpacity
          style={[edit.saveBtn, !canSave && edit.saveBtnDisabled]}
          disabled={!canSave}
          onPress={handleSave}
          activeOpacity={0.85}
          delayPressIn={60}
        >
          <Text style={[edit.saveBtnTxt, !canSave && edit.saveBtnTxtDisabled]}>Salvar</Text>
        </TouchableOpacity>
      </AnimatedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: theme.background,
  },
  headerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  headerBack: { width: 36, alignItems: 'flex-start' },
  headerTitle: {
    flex: 1, textAlign: 'center',
    color: theme.textPrimary,
    fontFamily: theme.fontFamily.headingSemiBold,
    fontSize: 17,
  },
  headerRight: { width: 36 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
});

const edit = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 20 },
  sectionLabel: { color: theme.primary, fontSize: 11, fontFamily: theme.fontFamily.headingSemiBold, letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionCount: { color: theme.textSecondary, fontSize: 11, fontFamily: theme.fontFamily.uiMedium },
  currentInfo: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: 'rgba(93,214,44,0.4)', borderRadius: 16, padding: 14, marginBottom: 8 },
  currentIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  currentName: { flex: 1, color: theme.textPrimary, fontFamily: theme.fontFamily.headingSemiBold, fontSize: 17 },
  currentTag: { color: theme.primary, fontFamily: theme.fontFamily.uiBold, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', backgroundColor: 'rgba(93,214,44,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden' },
  emptyPreset: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 24, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  emptyPresetTxt: { color: theme.textSecondary, fontFamily: theme.fontFamily.uiMedium, fontSize: 14 },
  presetList: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  presetRowList: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  presetRowListActive: { backgroundColor: 'rgba(93,214,44,0.05)' },
  presetIconWrapList: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  presetIconWrapListActive: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' },
  presetRowNameList: { flex: 1, color: theme.textPrimary, fontFamily: theme.fontFamily.uiMedium, fontSize: 15 },
  presetRowNameListActive: { color: theme.primary, fontFamily: theme.fontFamily.uiBold },
  customPanel: { backgroundColor: theme.backgroundSecondary, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(93,214,44,0.4)', padding: 16, marginBottom: 8 },
  panelNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  panelIconPreview: { width: 46, height: 46, borderRadius: 12, backgroundColor: theme.backgroundTertiary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  panelIconPreviewActive: { borderColor: theme.primary },
  panelInputWrap: { flex: 1, backgroundColor: theme.backgroundTertiary, borderRadius: 12, paddingHorizontal: 14, height: 46, flexDirection: 'row', alignItems: 'center' },
  panelInput: { flex: 1, color: theme.textPrimary, fontFamily: theme.fontFamily.uiMedium, fontSize: 14, paddingVertical: 0 },
  charCount: { fontSize: 11, fontWeight: '600', color: theme.primaryDark },
  charCountWarn: { color: theme.primary },
  panelIconHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  panelIconHintText: { flex: 1, color: theme.textMuted, fontSize: 11, lineHeight: 15 },
  iconPicker: { marginTop: 4, gap: 8 },
  iconTabsScroll: { flexGrow: 0 },
  iconTabsContent: { gap: 6, paddingBottom: 2 },
  iconTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: theme.backgroundTertiary },
  iconTabActive: { backgroundColor: theme.backgroundTertiary, borderWidth: 1, borderColor: 'rgba(93,214,44,0.5)' },
  iconTabText: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
  iconTabTextActive: { color: theme.primary },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  iconOpt: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.backgroundTertiary, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  iconOptSelected: { borderColor: theme.primary, backgroundColor: 'rgba(255,255,255,0.1)' },
  saveBtn: { borderRadius: 16, paddingVertical: 16, backgroundColor: theme.primary, alignItems: 'center', marginTop: 28, shadowColor: theme.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  saveBtnDisabled: { backgroundColor: 'rgba(93,214,44,0.35)', shadowOpacity: 0, elevation: 0 },
  saveBtnTxt: { color: '#0F0F0F', fontFamily: theme.fontFamily.uiBold, fontSize: 16 },
  saveBtnTxtDisabled: { color: 'rgba(15,15,15,0.5)', fontFamily: theme.fontFamily.uiBold, fontSize: 16 },
});
