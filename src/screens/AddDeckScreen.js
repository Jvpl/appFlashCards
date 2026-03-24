import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Dimensions, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { getAppData, saveAppData } from '../services/storage';
import { CustomAlert } from '../components/ui/CustomAlert';
import theme from '../styles/theme';

// SVG icons
import AdministrativoSvg from '../../svg-icones/Administrativo - icone.svg';
import EducacaoSvg from '../../svg-icones/Educação - icone.svg';
import FiscalSvg from '../../svg-icones/Fiscal & Controle - icone.svg';
import JusticaSvg from '../../svg-icones/Justiça & Direito - icone.svg';
import MilitarSvg from '../../svg-icones/Militar - icone.svg';
import OperacionalSvg from '../../svg-icones/Operacional & Logística - icone.svg';
import SaudeSvg from '../../svg-icones/Saúde - icone.svg';
import SegurancaSvg from '../../svg-icones/Segurança Pública - icone.svg';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
const COL_GAP = 10;


const CATEGORIES = [
  { id: 'seguranca',      name: 'Segurança Pública',  SvgIcon: SegurancaSvg },
  { id: 'justica',        name: 'Justiça & Direito',   SvgIcon: JusticaSvg },
  { id: 'administrativo', name: 'Administrativo',      SvgIcon: AdministrativoSvg },
  { id: 'fiscal',         name: 'Fiscal & Controle',   SvgIcon: FiscalSvg },
  { id: 'operacional',    name: 'Operacional & Log.',  SvgIcon: OperacionalSvg },
  { id: 'saude',          name: 'Saúde',               SvgIcon: SaudeSvg },
  { id: 'educacao',       name: 'Educação',            SvgIcon: EducacaoSvg },
  { id: 'militar',        name: 'Militar',             SvgIcon: MilitarSvg },
];

// ── Category tile (ícone em cima, nome embaixo) ───────────────────

const CategoryTile = ({ item, selected, onPress }) => {
  const SvgIcon = item.SvgIcon;
  return (
    <TouchableOpacity
      style={[s.catTile, selected && s.catTileSelected]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      {/* checkmark badge */}
      {selected && (
        <View style={s.catTileCheck}>
          <Ionicons name="checkmark" size={10} color="#0F0F0F" />
        </View>
      )}

      {/* icon bubble */}
      <View style={[s.catIconBg, selected && s.catIconBgSelected]}>
        <SvgIcon width={28} height={28} />
      </View>

      {/* name */}
      <Text
        style={[s.catTileLabel, selected && s.catTileLabelSelected]}
        numberOfLines={2}
        textBreakStrategy="balanced"
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );
};

// ── Main screen ───────────────────────────────────────────────────

export const AddDeckScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [customCatExpanded, setCustomCatExpanded] = useState(false);
  const [customCatName, setCustomCatName] = useState('');
  const [customCatIcon, setCustomCatIcon] = useState(null);
  const [alertConfig, setAlertConfig] = useState({
    visible: false, title: '', message: '', buttons: [],
  });

  const handleSave = async () => {
    if (name.trim().length === 0) {
      setAlertConfig({
        visible: true,
        title: 'Atenção',
        message: 'Por favor, insira um nome para o deck.',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }],
      });
      return;
    }
    const allData = await getAppData();
    const newDeck = {
      id: `deck_${Date.now()}`,
      name: name.trim(),
      category: selectedCategory || 'personalizados',
      subjects: [],
      isUserCreated: true,
    };
    await saveAppData([...allData, newDeck]);
    navigation.goBack();
  };

  const toggleCustomCat = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCustomCatExpanded(prev => !prev);
  };

  const ICON_OPTIONS = [
    'school-outline', 'trophy-outline', 'briefcase-outline', 'book-outline',
    'rocket-outline', 'star-outline', 'heart-outline', 'globe-outline',
    'code-slash-outline', 'calculator-outline', 'megaphone-outline', 'compass-outline',
  ];

  const leftCol = CATEGORIES.filter((_, i) => i % 2 === 0);
  const rightCol = CATEGORIES.filter((_, i) => i % 2 !== 0);

  return (
    <View style={s.root}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <View style={[s.headerWrapper, { paddingTop: insets.top }]}>
        <View style={s.headerInner}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn} hitSlop={HIT_SLOP}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Novo Deck</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.headerDivider} />
      </View>

      {/* ── Content ─────────────────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Nome do deck ────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { marginBottom: 10 }]}>NOME DO DECK</Text>
          <View style={s.inputWrap}>
            <Ionicons name="albums-outline" size={18} color={theme.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Ex: Concurso XYZ"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
              returnKeyType="done"
            />
          </View>
        </View>

        {/* ── Categoria ───────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <Text style={s.sectionTitle}>CATEGORIA</Text>
            {selectedCategory && !selectedCategory.startsWith('custom_') && (
              <TouchableOpacity onPress={() => setSelectedCategory(null)} hitSlop={HIT_SLOP}>
                <Text style={s.clearBtn}>Limpar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 2-column tile grid */}
          <View style={s.colsWrap}>
            <View style={s.col}>
              {leftCol.map(item => (
                <CategoryTile
                  key={item.id}
                  item={item}
                  selected={selectedCategory === item.id}
                  onPress={() => setSelectedCategory(p => p === item.id ? null : item.id)}
                />
              ))}
            </View>
            <View style={s.col}>
              {rightCol.map(item => (
                <CategoryTile
                  key={item.id}
                  item={item}
                  selected={selectedCategory === item.id}
                  onPress={() => setSelectedCategory(p => p === item.id ? null : item.id)}
                />
              ))}
            </View>
          </View>
        </View>

        {/* ── Criar nova categoria ─────────────────────────────── */}
        <View style={s.section}>
          <TouchableOpacity
            style={[s.newCatTrigger, customCatExpanded && s.newCatTriggerActive]}
            onPress={toggleCustomCat}
            activeOpacity={0.75}
          >
            <Ionicons
              name={customCatExpanded ? 'remove-circle-outline' : 'add-circle-outline'}
              size={18}
              color={customCatExpanded ? theme.primary : theme.textMuted}
            />
            <Text style={[s.newCatTriggerText, customCatExpanded && s.newCatTriggerTextActive]}>
              {customCatExpanded ? 'Cancelar criação' : 'Criar nova categoria'}
            </Text>
          </TouchableOpacity>

          {customCatExpanded && (
            <View style={s.newCatPanel}>
              <Text style={s.panelSubLabel}>NOME DA CATEGORIA</Text>
              <View style={s.panelInputWrap}>
                <TextInput
                  style={s.panelInput}
                  placeholder="Ex: Meu concurso especial"
                  placeholderTextColor={theme.textMuted}
                  value={customCatName}
                  onChangeText={setCustomCatName}
                  returnKeyType="done"
                />
              </View>

              <Text style={[s.panelSubLabel, { marginTop: 18 }]}>ESCOLHA UM ÍCONE</Text>
              <View style={s.iconPickerGrid}>
                {ICON_OPTIONS.map(icon => (
                  <TouchableOpacity
                    key={icon}
                    style={[s.iconOpt, customCatIcon === icon && s.iconOptSelected]}
                    onPress={() => setCustomCatIcon(p => p === icon ? null : icon)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={icon}
                      size={20}
                      color={customCatIcon === icon ? theme.primary : theme.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  s.saveCatBtn,
                  (!customCatName.trim() || !customCatIcon) && s.saveCatBtnOff,
                ]}
                onPress={() => {
                  if (!customCatName.trim() || !customCatIcon) return;
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSelectedCategory(`custom_${customCatName.trim().toLowerCase().replace(/\s+/g, '_')}`);
                  setCustomCatExpanded(false);
                  setCustomCatName('');
                  setCustomCatIcon(null);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={15} color="#0F0F0F" style={{ marginRight: 6 }} />
                <Text style={s.saveCatBtnText}>Salvar categoria</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Salvar deck ──────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.saveBtn, !name.trim() && s.saveBtnOff]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text style={s.saveBtnText}>Salvar deck</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 28 }} />
      </ScrollView>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(p => ({ ...p, visible: false }))}
      />
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },

  // ── Header
  headerWrapper: { backgroundColor: theme.background },
  headerInner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerDivider: { height: 1, backgroundColor: theme.backgroundSecondary },

  // ── Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24 },

  // ── Section
  section: { marginBottom: 24 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginBottom: 0,
  },
  clearBtn: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Name input
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: theme.backgroundTertiary,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 54,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
  },

  // ── 2-column tile grid
  colsWrap: {
    flexDirection: 'row',
    gap: COL_GAP,
  },
  col: {
    flex: 1,
    gap: 10,
  },

  // ── Category tile (vertical)
  catTile: {
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.backgroundTertiary,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    minHeight: 110,
    position: 'relative',
  },
  catTileSelected: {
    backgroundColor: 'rgba(93,214,44,0.08)',
    borderColor: theme.primary,
  },

  // icon bubble
  catIconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: theme.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  catIconBgSelected: {
    backgroundColor: 'rgba(93,214,44,0.18)',
  },

  // tile label
  catTileLabel: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
    lineHeight: 18,
  },
  catTileLabelSelected: {
    color: theme.primary,
    fontWeight: '700',
  },

  // checkmark badge
  catTileCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Create custom category trigger
  newCatTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.backgroundTertiary,
    borderStyle: 'dashed',
    paddingVertical: 15,
  },
  newCatTriggerActive: {
    borderColor: theme.primary,
    borderStyle: 'solid',
    backgroundColor: theme.primaryTransparent,
  },
  newCatTriggerIcon: {},
  newCatTriggerIconActive: {},
  newCatTriggerText: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  newCatTriggerTextActive: {
    color: theme.primary,
  },

  // ── Custom category panel
  newCatPanel: {
    marginTop: 10,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(93,214,44,0.25)',
    padding: 16,
  },
  panelSubLabel: {
    color: theme.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  panelInputWrap: {
    backgroundColor: theme.backgroundTertiary,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    justifyContent: 'center',
  },
  panelInput: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  iconPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOpt: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  iconOptSelected: {
    borderColor: theme.primary,
    backgroundColor: 'rgba(93,214,44,0.12)',
  },
  saveCatBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    borderRadius: 12,
    height: 44,
  },
  saveCatBtnOff: { opacity: 0.35 },
  saveCatBtnText: {
    color: '#0F0F0F',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Save deck
  saveBtn: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  saveBtnOff: { opacity: 0.4, shadowOpacity: 0 },
  saveBtnText: {
    color: '#0F0F0F',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

export default AddDeckScreen;
