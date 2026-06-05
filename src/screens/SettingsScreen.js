import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, ActivityIndicator, TouchableWithoutFeedback, Dimensions,
} from 'react-native';
import Reanimated, {
  useSharedValue, useAnimatedStyle, withTiming, runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAppData, saveAppData, getTrash, restoreFromTrash, purgeFromTrash } from '../services/storage';
import { CONCURSO_CATEGORIES, getCustomCategories, saveCustomCategories } from '../config/categories';
import { CustomAlert } from '../components/ui/CustomAlert';
import theme from '../styles/theme';

const { height: SH } = Dimensions.get('window');
const TRASH_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function daysLeft(deletedAt) {
  const remaining = deletedAt + TRASH_TTL_MS - Date.now();
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

function cardCount(deck) {
  return (deck.subjects || []).reduce((acc, sub) => {
    const cards = sub.topics?.length > 0
      ? sub.topics.flatMap(t => t.flashcards || [])
      : (sub.flashcards || []);
    return acc + cards.length;
  }, 0);
}

// ── Lixeira Modal ──────────────────────────────────────────────────

function TrashModal({ visible, onDismiss, onAlert }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [localVisible, setLocalVisible] = useState(false);
  const [sheetReady, setSheetReady] = useState(false);
  const isDismissing = useRef(false);

  const translateY = useSharedValue(SH);
  const overlayOp = useSharedValue(0);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOp.value }));

  useEffect(() => { if (visible) setLocalVisible(true); }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    getTrash().then(data => {
      setItems(data.sort((a, b) => b.deletedAt - a.deletedAt));
      setLoading(false);
    });
  }, [visible]);

  const handleShow = useCallback(() => {
    setSheetReady(true);
    translateY.value = withTiming(0, { duration: 320 });
    overlayOp.value = withTiming(1, { duration: 280 });
  }, [translateY, overlayOp]);

  const finishDismiss = useCallback(() => {
    isDismissing.current = false;
    setLocalVisible(false);
    setSheetReady(false);
    onDismiss();
  }, [onDismiss]);

  const handleDismiss = useCallback(() => {
    if (isDismissing.current) return;
    isDismissing.current = true;
    overlayOp.value = withTiming(0, { duration: 220 });
    translateY.value = withTiming(SH + 100, { duration: 240 }, () => runOnJS(finishDismiss)());
  }, [translateY, overlayOp, finishDismiss]);

  const handleRestore = useCallback(async (deckId) => {
    const entry = await restoreFromTrash(deckId);
    if (!entry) return;
    const { deck, categoryMeta } = entry;

    // Restaura categoria customizada se foi removida
    if (categoryMeta?.isCustom) {
      const customCats = await getCustomCategories();
      if (!customCats.some(c => c.id === categoryMeta.id)) {
        await saveCustomCategories([...customCats, {
          id: categoryMeta.id,
          name: categoryMeta.name,
          icon: categoryMeta.icon || 'folder-outline',
          color: categoryMeta.color || theme.primary,
          isCustom: true,
          keywords: [],
        }]);
      }
    }

    const allData = await getAppData();
    if (!allData.some(d => d.id === deckId)) {
      await saveAppData([...allData, deck]);
    }
    setItems(prev => prev.filter(i => i.deck.id !== deckId));
  }, []);

  const handlePurge = useCallback((deckId, deckName) => {
    onAlert({
      visible: true,
      title: 'Apagar permanentemente?',
      message: `"${deckName}" será excluído definitivamente e não poderá ser recuperado.`,
      buttons: [
        { text: 'Cancelar', style: 'cancel', onPress: () => onAlert(p => ({ ...p, visible: false })) },
        { text: 'Apagar', style: 'destructive', onPress: async () => {
          await purgeFromTrash(deckId);
          setItems(prev => prev.filter(i => i.deck.id !== deckId));
          onAlert(p => ({ ...p, visible: false }));
        }},
      ],
    });
  }, [onAlert]);

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
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <Reanimated.View style={[StyleSheet.absoluteFillObject, ts.overlay, overlayStyle]} />
      </TouchableWithoutFeedback>

      <Reanimated.View style={[ts.sheetWrap, sheetStyle, !sheetReady && { opacity: 0 }]}>
        <View style={ts.sheet}>
          <View style={ts.handle} />

          {/* Header */}
          <View style={ts.header}>
            <View style={ts.headerLeft}>
              <View style={ts.headerIcon}>
                <Ionicons name="trash-outline" size={18} color={theme.primary} />
              </View>
              <View>
                <Text style={ts.title}>Lixeira</Text>
                <Text style={ts.subtitle}>Decks apagados ficam aqui por 14 dias</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleDismiss} hitSlop={12} style={ts.closeBtn}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={ts.divider} />

          {/* Content */}
          {loading ? (
            <View style={ts.emptyWrap}>
              <ActivityIndicator color={theme.primary} size="large" />
            </View>
          ) : items.length === 0 ? (
            <View style={ts.emptyWrap}>
              <View style={ts.emptyIconRing}>
                <Ionicons name="trash-outline" size={28} color={theme.textMuted} />
              </View>
              <Text style={ts.emptyTitle}>Lixeira vazia</Text>
              <Text style={ts.emptyHint}>Decks que você apagar aparecerão aqui por 14 dias antes de serem removidos definitivamente.</Text>
            </View>
          ) : (
            <ScrollView
              style={ts.list}
              contentContainerStyle={[ts.listContent, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
              showsVerticalScrollIndicator={false}
            >
              {items.map((item, idx) => {
                const days = daysLeft(item.deletedAt);
                const cards = cardCount(item.deck);
                const subjects = item.deck.subjects?.length || 0;
                const urgent = days <= 2;
                return (
                  <View key={item.deck.id}>
                    <View style={ts.item}>
                      {/* Linha superior: ícone + info */}
                      <View style={ts.itemTop}>
                        <View style={ts.itemIcon}>
                          <Ionicons name="layers-outline" size={18} color={theme.primary} />
                        </View>
                        <View style={ts.itemTitleBlock}>
                          {/* Nome + badge de expiração na mesma linha */}
                          <View style={ts.itemNameRow}>
                            <Text style={ts.itemName} numberOfLines={1}>{item.deck.name}</Text>
                            <View style={[ts.expiryBadge, urgent && ts.expiryBadgeUrgent]}>
                              <Text style={[ts.expiryTxt, urgent && ts.expiryTxtUrgent]}>
                                {days === 0 ? 'Expira hoje' : `${days} dia${days !== 1 ? 's' : ''}`}
                              </Text>
                            </View>
                          </View>
                          {/* Categoria como label pill */}
                          {item.categoryMeta && (
                            <View style={ts.catPill}>
                              <Ionicons name="folder-outline" size={10} color={theme.primary} />
                              <Text style={ts.catPillTxt} numberOfLines={1}>{item.categoryMeta.name}</Text>
                            </View>
                          )}
                          {/* Metadados */}
                          <Text style={ts.itemMeta}>
                            {subjects} matéria{subjects !== 1 ? 's' : ''} · {cards} card{cards !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>

                      {/* Linha inferior: botões */}
                      <View style={ts.itemActions}>
                        <TouchableOpacity
                          style={ts.purgeBtn}
                          onPress={() => handlePurge(item.deck.id, item.deck.name)}
                          activeOpacity={0.75}
                        >
                          <Ionicons name="trash-outline" size={14} color={theme.danger} />
                          <Text style={ts.purgeTxt}>Apagar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={ts.restoreBtn}
                          onPress={() => handleRestore(item.deck.id)}
                          activeOpacity={0.75}
                        >
                          <Ionicons name="refresh-outline" size={14} color="#0F0F0F" />
                          <Text style={ts.restoreTxt}>Restaurar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Reanimated.View>
    </Modal>
  );
}

// ── Settings Screen ────────────────────────────────────────────────

export const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [], toggle: null });
  const [trashVisible, setTrashVisible] = useState(false);

  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const confirm = (title, message, onConfirm, confirmLabel = 'Confirmar') => {
    setAlertConfig({
      visible: true, title, message,
      buttons: [
        { text: 'Cancelar', style: 'cancel', onPress: closeAlert },
        { text: confirmLabel, style: 'destructive', onPress: onConfirm },
      ],
    });
  };

  const success = (message) => setAlertConfig({
    visible: true, title: 'Pronto!', message,
    buttons: [{ text: 'OK', onPress: closeAlert }],
  });

  const resetCards = (filterFn) => async () => {
    const data = await getAppData();
    data.forEach(deck => deck.subjects.forEach(sub => {
      const cards = sub.topics?.length > 0
        ? sub.topics.flatMap(t => t.flashcards || [])
        : (sub.flashcards || []);
      cards.forEach(card => {
        if (filterFn(card, deck)) {
          card.level = 0; card.points = 0;
          card.lastReview = null; card.nextReview = null;
          card.consecutiveCorrect = 0;
        }
      });
    }));
    await saveAppData(data);
    closeAlert();
    success('Progresso resetado com sucesso.');
  };

  const handleResetPurchased = () => confirm(
    'Resetar flashcards comprados?',
    'Zera o progresso apenas dos decks comprados. Seu conteúdo criado não é afetado.',
    resetCards((_, deck) => deck.isPurchased && !deck.isUserCreated), 'Resetar'
  );

  const handleResetUserCreated = () => confirm(
    'Resetar flashcards criados?',
    'Zera o progresso apenas dos flashcards que você criou. Decks comprados não são afetados.',
    resetCards((card) => card.isUserCreated), 'Resetar'
  );

  const handleRestorePurchasedDecks = () => confirm(
    'Restaurar decks comprados?',
    'Restaura os decks comprados que foram removidos do app.',
    async () => {
      closeAlert();
      success('Funcionalidade disponível em breve.');
    }, 'Restaurar'
  );

  const handleDelete = (type) => {
    const config = {
      decks: {
        title: 'Apagar tudo que criei?',
        message: 'Remove permanentemente todos os decks, matérias e flashcards criados por você. Ação irreversível.',
        fn: async () => {
          const data = await getAppData();
          await saveAppData(data.filter(d => !d.isUserCreated));
        },
        extraButton: {
          label: 'Apagar + comprados',
          fn: async () => {
            const data = await getAppData();
            await saveAppData(data.filter(d => !d.isUserCreated && !d.isPurchased));
          },
        },
      },
      subjects: {
        title: 'Apagar matérias e flashcards?',
        message: 'Remove permanentemente todas as matérias e flashcards criados por você. Seus decks criados são mantidos (vazios).',
        fn: async () => {
          const data = await getAppData();
          data.forEach(deck => { if (deck.isUserCreated) deck.subjects = []; });
          await saveAppData(data);
        },
      },
      flashcards: {
        title: 'Apagar somente flashcards?',
        message: 'Remove permanentemente todos os flashcards criados por você. Suas matérias são mantidas (vazias).',
        fn: async () => {
          const data = await getAppData();
          data.forEach(deck => deck.subjects.forEach(sub => {
            sub.flashcards = (sub.flashcards || []).filter(c => !c.isUserCreated);
            (sub.topics || []).forEach(t => { t.flashcards = (t.flashcards || []).filter(c => !c.isUserCreated); });
          }));
          await saveAppData(data);
        },
      },
    };
    const { title, message, fn, extraButton } = config[type];
    const buttons = [
      { text: 'Cancelar', style: 'cancel', onPress: closeAlert },
      {
        text: 'Apagar', style: 'destructive', _useToggle: !!extraButton,
        onPress: extraButton
          ? async (includeExtra) => { await (includeExtra ? extraButton.fn : fn)(); closeAlert(); success('Conteúdo apagado.'); }
          : async () => { await fn(); closeAlert(); success('Conteúdo apagado.'); },
      },
    ];
    setAlertConfig({
      visible: true, title, message, buttons,
      toggle: extraButton ? { label: extraButton.label } : null,
    });
  };

  return (
    <>
      <ScrollView
        style={s.root}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Resetar progresso ── */}
        <Text style={s.sectionTitle}>Resetar progresso</Text>
        <View style={s.group}>
          <Row icon="bag-outline" label="Resetar flashcards comprados" sub="Zera apenas os decks que você adquiriu" onPress={handleResetPurchased} />
          <Div />
          <Row icon="person-outline" label="Resetar flashcards criados" sub="Zera apenas os flashcards que você criou" onPress={handleResetUserCreated} />
        </View>

        {/* ── Restaurar ── */}
        <Text style={s.sectionTitle}>Restaurar</Text>
        <View style={s.group}>
          <Row icon="trash-outline" label="Lixeira" sub="Decks apagados ficam aqui por 14 dias" onPress={() => setTrashVisible(true)} />
          <Div />
          <Row icon="bag-outline" label="Restaurar decks comprados" sub="Restaura decks adquiridos que foram removidos" onPress={handleRestorePurchasedDecks} />
        </View>

        {/* ── Apagar conteúdo ── */}
        <Text style={s.sectionTitle}>Apagar conteúdo</Text>
        <View style={s.group}>
          <Row icon="trash-outline" label="Apagar tudo que criei" sub="Remove decks, matérias e flashcards criados por você" onPress={() => handleDelete('decks')} danger />
          <Div danger />
          <Row icon="layers-outline" label="Apagar matérias e flashcards" sub="Mantém seus decks, remove o conteúdo interno" onPress={() => handleDelete('subjects')} danger />
          <Div danger />
          <Row icon="document-text-outline" label="Apagar somente flashcards" sub="Mantém suas matérias, remove apenas os cards" onPress={() => handleDelete('flashcards')} danger />
        </View>
      </ScrollView>

      <TrashModal
        visible={trashVisible}
        onDismiss={() => setTrashVisible(false)}
        onAlert={setAlertConfig}
      />

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={closeAlert}
        toggle={alertConfig.toggle}
      />
    </>
  );
};

const Row = ({ icon, label, sub, onPress, danger }) => (
  <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
    <View style={[s.iconBox, { backgroundColor: danger ? 'rgba(248,81,73,0.10)' : 'rgba(93,214,44,0.10)' }]}>
      <Ionicons name={icon} size={20} color={danger ? theme.danger : theme.primary} />
    </View>
    <View style={s.rowText}>
      <Text style={[s.rowLabel, danger && { color: theme.danger }]}>{label}</Text>
      <Text style={s.rowSub}>{sub}</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
  </TouchableOpacity>
);

const Div = ({ danger }) => (
  <View style={[s.divider, danger && { backgroundColor: 'rgba(248,81,73,0.12)' }]} />
);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  sectionTitle: {
    color: theme.textMuted,
    fontSize: 11,
    fontFamily: theme.fontFamily.uiBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  group: {
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.backgroundTertiary,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: theme.backgroundTertiary,
    marginLeft: 14 + 36 + 12,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: {
    color: theme.textPrimary,
    fontSize: 14,
    fontFamily: theme.fontFamily.uiBold,
  },
  rowSub: {
    color: theme.textMuted,
    fontSize: 12,
    fontFamily: theme.fontFamily.ui,
    marginTop: 2,
  },
});

// ── Trash Modal Styles ─────────────────────────────────────────────

const ts = StyleSheet.create({
  overlay: { backgroundColor: 'rgba(0,0,0,0.6)' },
  sheetWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: Math.round(SH * 0.72),
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
    alignSelf: 'center', marginTop: 8, marginBottom: 12,
  },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(93,214,44,0.1)',
    borderWidth: 1, borderColor: 'rgba(93,214,44,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    color: theme.textPrimary,
    fontSize: 16, fontFamily: theme.fontFamily.uiBold,
  },
  subtitle: {
    color: theme.textMuted,
    fontSize: 11, fontFamily: theme.fontFamily.ui,
    marginTop: 1,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },

  // Empty
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 12,
  },
  emptyIconRing: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: {
    color: theme.textPrimary,
    fontSize: 15, fontFamily: theme.fontFamily.uiBold,
  },
  emptyHint: {
    color: theme.textMuted,
    fontSize: 13, fontFamily: theme.fontFamily.ui,
    textAlign: 'center', lineHeight: 19,
  },

  // List
  list: { flex: 1 },
  listContent: { paddingHorizontal: 18, paddingTop: 8 },
  sep: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 2 },

  // Item card
  item: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 14,
    gap: 12,
    marginVertical: 4,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: 'rgba(93,214,44,0.08)',
    borderWidth: 1, borderColor: 'rgba(93,214,44,0.18)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  itemTitleBlock: { flex: 1, gap: 5 },
  itemNameRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 8,
  },
  itemName: {
    color: theme.textPrimary,
    fontSize: 14, fontFamily: theme.fontFamily.uiBold,
    flex: 1,
  },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    alignSelf: 'flex-start',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  catPillTxt: {
    color: theme.textSecondary,
    fontSize: 11, fontFamily: theme.fontFamily.uiMedium,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  itemMeta: {
    color: theme.textMuted,
    fontSize: 11, fontFamily: theme.fontFamily.ui,
  },
  metaDot: {
    width: 2.5, height: 2.5, borderRadius: 1.5,
    backgroundColor: theme.textMuted, opacity: 0.4,
  },
  expiryBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  expiryBadgeUrgent: {
    backgroundColor: 'rgba(248,81,73,0.1)',
    borderColor: 'rgba(248,81,73,0.25)',
  },
  expiryTxt: {
    color: theme.textMuted,
    fontSize: 10, fontFamily: theme.fontFamily.uiBold,
  },
  expiryTxtUrgent: { color: theme.danger },

  // Botões em linha separada
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  purgeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    flex: 1, justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(248,81,73,0.07)',
    borderWidth: 1, borderColor: 'rgba(248,81,73,0.15)',
  },
  purgeTxt: {
    color: theme.danger,
    fontSize: 12, fontFamily: theme.fontFamily.uiBold,
  },
  restoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    flex: 2, justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.primary,
  },
  restoreTxt: {
    color: '#0F0F0F',
    fontSize: 12, fontFamily: theme.fontFamily.uiBold,
  },
});

export default SettingsScreen;
