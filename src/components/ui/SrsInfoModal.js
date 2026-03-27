import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../styles/theme';

const LEVELS = [
  { level: 0, name: 'Marco Zero',   color: '#EF4444', interval: 'Aparece sempre'          },
  { level: 1, name: 'Aprendiz',     color: '#F59E0B', interval: 'Volta em 10 minutos'     },
  { level: 2, name: 'Em Progresso', color: '#EAB308', interval: 'Volta em 1 hora'         },
  { level: 3, name: 'Consolidando', color: '#3B82F6', interval: 'Volta em 6 horas'        },
  { level: 4, name: 'Confiante',    color: '#8B5CF6', interval: 'Volta em 1 dia'          },
  { level: 5, name: 'Dominado',     color: '#22C55E', interval: 'Volta em 7, 14 ou 30 dias' },
];

export const SrsInfoModal = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback>
            <View style={{ backgroundColor: theme.backgroundSecondary, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 }}>

              {/* Handle */}
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.backgroundTertiary }} />
              </View>

              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }}>
                <Text style={{ color: theme.textPrimary, fontSize: 18, fontWeight: 'bold' }}>Como funciona o sistema de níveis</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>

                {/* Explicação */}
                <Text style={{ color: theme.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 20 }}>
                  O app usa repetição espaçada (SRS) para te ajudar a memorizar de forma eficiente.
                  Cada card tem um nível que determina quando ele vai aparecer novamente.
                </Text>

                {/* Tabela de níveis */}
                {LEVELS.map((lvl) => (
                  <View key={lvl.level} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.backgroundTertiary }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: lvl.color, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{lvl.level}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: lvl.color, fontWeight: 'bold', fontSize: 14 }}>{lvl.name}</Text>
                      <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>{lvl.interval}</Text>
                    </View>
                  </View>
                ))}

                {/* Regras */}
                <View style={{ marginTop: 20, backgroundColor: theme.background, borderRadius: 10, padding: 14 }}>
                  <Text style={{ color: theme.textPrimary, fontWeight: 'bold', fontSize: 14, marginBottom: 10 }}>Regras</Text>
                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    <Text style={{ fontSize: 16, marginRight: 8 }}>👆</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 13, flex: 1 }}>
                      <Text style={{ color: theme.success, fontWeight: 'bold' }}>Acertou 2x seguidas</Text> → sobe 1 nível
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    <Text style={{ fontSize: 16, marginRight: 8 }}>👆</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 13, flex: 1 }}>
                      <Text style={{ color: theme.warning, fontWeight: 'bold' }}>Quase lembrou</Text> → mantém o nível
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <Text style={{ fontSize: 16, marginRight: 8 }}>👆</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 13, flex: 1 }}>
                      <Text style={{ color: theme.danger, fontWeight: 'bold' }}>Errou</Text> → volta para Marco Zero ou Aprendiz
                    </Text>
                  </View>
                </View>

                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default SrsInfoModal;
