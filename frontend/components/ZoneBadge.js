import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import colors from '../theme/colors';

const ZONE_CONFIG = {
  green:  { color: colors.zoneGreen,  label: 'Green Zone',  coverage: '50%', icon: 'shield-alt' },
  orange: { color: colors.zoneOrange, label: 'Orange Zone', coverage: '45%', icon: 'exclamation-triangle' },
  red:    { color: colors.zoneRed,    label: 'Red Zone',    coverage: '35%', icon: 'radiation' },
};

export default function ZoneBadge({ zone = 'green', showCoverage = true, compact = false }) {
  const config = ZONE_CONFIG[zone] || ZONE_CONFIG.green;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1800, useNativeDriver: false }),
      ])
    ).start();
  }, [pulseAnim]);

  const glowStyle = {
    shadowColor: config.color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] }),
    shadowRadius: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 10] }),
    elevation: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 6] }),
  };

  if (compact) {
    return (
      <Animated.View style={[styles.compactBadge, { backgroundColor: config.color + '18', borderColor: config.color + '50' }, glowStyle]}>
        <View style={[styles.dot, { backgroundColor: config.color }]} />
        <Text style={[styles.compactLabel, { color: config.color }]}>{config.label}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.badge, { borderColor: config.color + '40' }, glowStyle]}>
      <View style={[styles.iconWrap, { backgroundColor: config.color + '18' }]}>
        <FontAwesome5 name={config.icon} size={16} color={config.color} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
        {showCoverage && (
          <Text style={styles.coverageText}>Coverage: {config.coverage}</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  coverageText: {
    fontSize: 11,
    color: colors.primary,
    opacity: 0.5,
    marginTop: 1,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});
