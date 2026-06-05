import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAppData, saveAppData } from '../services/storage';
import { CustomAlert } from '../components/ui/CustomAlert';
import theme from '../styles/theme';

export const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [], toggle: null });

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

  const handleResetAll = () => confirm(
    'Resetar tudo?',
    'Zera o progresso de todos os flashcards, incluindo comprados e criados por você. Ação irreversível.',
    resetCards(() => true), 'Resetar'
  );

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

  const handleRestoreUserDecks = () => confirm(
    'Restaurar seus decks?',
    'Restaura os decks criados por você que foram apagados. Matérias e flashcards existentes não são alterados.',
    async () => {
      closeAlert();
      success('Funcionalidade disponível em breve.');
    }, 'Restaurar'
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
          const kept = data.filter(d => !d.isUserCreated);
          await saveAppData(kept);
        },
        extraButton: {
          label: 'Apagar + comprados',
          fn: async () => {
            const data = await getAppData();
            const kept = data.filter(d => !d.isUserCreated && !d.isPurchased);
            await saveAppData(kept);
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
        <Row icon="person-outline" label="Restaurar meus decks" sub="Restaura decks criados por você que foram apagados" onPress={handleRestoreUserDecks} />
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

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={closeAlert}
        toggle={alertConfig.toggle}
      />
    </ScrollView>
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
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
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

export default SettingsScreen;
