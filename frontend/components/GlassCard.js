import React, { useRef, useEffect } from 'react';
import { StyleSheet, Animated } from 'react-native';
import colors from '../theme/colors';

export default function GlassCard({ children, style, animate = false }) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animate) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -5,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          })
        ])
      ).start();
    }
  }, [animate]);

  return (
    <Animated.View style={[
      styles.container, 
      style,
      animate && { transform: [{ translateY: floatAnim }] }
    ]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    elevation: 4,
    shadowColor: 'rgba(26, 58, 92, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  }
});
