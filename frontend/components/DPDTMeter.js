import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import colors from '../theme/colors';

function getDPDTColor(pct) {
  if (pct < 40) return colors.dpdtLow;
  if (pct < 70) return colors.dpdtMid;
  return colors.dpdtHigh;
}

function getDPDTLabel(pct) {
  if (pct >= 90) return 'Hustler';
  if (pct >= 70) return 'Strong';
  if (pct >= 40) return 'Average';
  return 'Fair-Weather';
}

export default function DPDTMeter({ percentage = 80, size = 120, strokeWidth = 10 }) {
  const animValue = useRef(new Animated.Value(0)).current;
  const [displayPct, setDisplayPct] = React.useState(0);

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: percentage, duration: 1800, useNativeDriver: false,
    }).start();
    const id = animValue.addListener(({ value }) => setDisplayPct(Math.round(value)));
    return () => animValue.removeListener(id);
  }, [percentage]);

  const meterColor = getDPDTColor(percentage);
  const label = getDPDTLabel(percentage);
  const radius = size / 2;
  const innerSize = size - strokeWidth * 2;

  return (
    <View style={styles.container}>
      {/* Outer ring (track) */}
      <View style={[styles.outerRing, { 
        width: size, height: size, borderRadius: radius,
        borderWidth: strokeWidth, borderColor: 'rgba(26, 58, 92, 0.06)',
      }]}>
        {/* Colored progress ring */}
        <Animated.View style={[styles.progressRing, {
          width: size, height: size, borderRadius: radius,
          borderWidth: strokeWidth, borderColor: meterColor,
          opacity: animValue.interpolate({ inputRange: [0, 100], outputRange: [0.3, 1] }),
        }]} />
        
        {/* Inner circle — transparent/white, NOT dark */}
        <View style={[styles.innerCircle, {
          width: innerSize, height: innerSize, borderRadius: innerSize / 2,
        }]}>
          <Text style={[styles.percentText, { color: meterColor }]}>{displayPct}%</Text>
          <Text style={[styles.ratingText, { color: meterColor }]}>{label}</Text>
        </View>
      </View>

      <Text style={styles.meterLabel}>DPDT Score</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  outerRing: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  progressRing: { position: 'absolute', top: -10, left: -10 },
  innerCircle: {
    // Transparent so the glass card shows through — NO dark fill
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center', justifyContent: 'center', position: 'absolute',
  },
  percentText: { fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  ratingText: {
    fontSize: 8, fontWeight: '700', letterSpacing: 0.6,
    textTransform: 'uppercase', marginTop: 1,
  },
  meterLabel: {
    color: colors.primary, opacity: 0.45,
    fontSize: 10, fontWeight: '600', marginTop: 8, letterSpacing: 0.3,
  },
});
