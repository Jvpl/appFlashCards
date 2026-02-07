import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

export const SkeletonItem = ({ width = '100%', height = 20, style }) => {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withTiming(0.6, { duration: 800 }), // Pulsa de 0.3 a 0.6
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                { backgroundColor: '#4A5568', width, height, borderRadius: 4 },
                style,
                animatedStyle,
            ]}
        />
    );
};

export default SkeletonItem;
