import React, { useRef } from 'react';
import { Animated, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import colors from '../theme/colors';

export default function AnimatedButton({ onPress, children, style, disableGlow = false, gradientColors = [colors.vibrant, '#005fa3'] }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) onPress();
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View style={[
        styles.container, 
        !disableGlow && styles.glow,
        style,
        { transform: [{ scale: scaleAnim }] }
      ]}>
        <LinearGradient 
          colors={gradientColors} 
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} 
          style={styles.gradient}
        >
          {children}
        </LinearGradient>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 16, width: '100%' },
  gradient: {
    paddingVertical: 14, paddingHorizontal: 28,
    borderRadius: 16, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row',
  },
  glow: {
    shadowColor: colors.vibrant,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  }
});
