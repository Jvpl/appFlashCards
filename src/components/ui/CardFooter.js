import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LEVEL_CONFIG } from '../../services/srs';
import styles from '../../styles/globalStyles';

export const CardFooter = ({level}) => {
    const currentLevel = level || 0;
    const progressPercent = (currentLevel / 5) * 100;
    const prevColor = LEVEL_CONFIG[Math.max(0, currentLevel - 1)].color;
    const currentColor = LEVEL_CONFIG[currentLevel].color;
    const gradientColors = currentLevel === 0 ? [currentColor, currentColor] : [prevColor, currentColor];

    return(
      <View style={styles.cardFooter}>
          <View style={[styles.levelCircle, { backgroundColor: currentColor }]}>
              <Text style={styles.levelText}>{currentLevel}</Text>
          </View>
          <View style={styles.flexOne}>
            <View style={styles.progressBarContainer}>
                <LinearGradient
                    colors={gradientColors}
                    style={{ width: `${progressPercent}%`, height: '100%', borderRadius: 50 }}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                />
                <Text style={styles.progressPercentageText}>{progressPercent}%</Text>
            </View>
            <View style={styles.levelNamesContainer}>
                <Text
                    style={[
                        styles.levelName,
                        {color: LEVEL_CONFIG[currentLevel].color, fontWeight: 'bold'}
                    ]}
                >
                    {LEVEL_CONFIG[currentLevel].name}
                </Text>
            </View>
          </View>
      </View>
    );
};

export default CardFooter;
