import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LEVEL_CONFIG } from '../../services/srs';
import theme from '../../styles/theme';

// Cada nível precisa de 2 consecutiveCorrect para subir
const CORRECT_TO_LEVEL_UP = 2;

export const CardFooter = ({ level, consecutiveCorrect = 0 }) => {
    const currentLevel = level || 0;
    const config = LEVEL_CONFIG[currentLevel];
    const isDominated = currentLevel === 5;

    return (
        <View style={fts.footer}>
            {/* Badge: número do nível + cor */}
            <View style={[fts.badge, { backgroundColor: config.color + '22', borderColor: config.color + '55' }]}>
                <Text style={[fts.badgeNum, { color: config.color }]}>{currentLevel}</Text>
            </View>

            {/* Nome do nível */}
            <Text style={[fts.levelName, { color: config.color }]}>{config.name}</Text>

            {/* Progresso até o próximo nível */}
            {isDominated ? (
                <View style={fts.dominatedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={config.color} />
                    <Text style={[fts.dominatedText, { color: config.color }]}>Dominado</Text>
                </View>
            ) : (
                <View style={fts.progressSection}>
                    <Text style={fts.progressLabel}>próx. nível</Text>
                    <View style={fts.pips}>
                        {Array.from({ length: CORRECT_TO_LEVEL_UP }).map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    fts.pip,
                                    i < consecutiveCorrect
                                        ? { backgroundColor: config.color }
                                        : { backgroundColor: 'rgba(255,255,255,0.12)' }
                                ]}
                            />
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
};

const fts = StyleSheet.create({
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
        gap: 8,
    },
    badge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeNum: {
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 16,
    },
    levelName: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
        letterSpacing: 0.1,
    },
    progressSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    progressLabel: {
        fontSize: 10,
        color: theme.textMuted,
        fontWeight: '500',
        letterSpacing: 0.2,
    },
    pips: {
        flexDirection: 'row',
        gap: 5,
        alignItems: 'center',
    },
    pip: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    dominatedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dominatedText: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
});

export default CardFooter;
