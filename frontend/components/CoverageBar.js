import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../theme/colors';

const ZONE_COVERAGE = {
  green:  { pct: 50, color: colors.zoneGreen,  label: 'Green' },
  orange: { pct: 45, color: colors.zoneOrange, label: 'Orange' },
  red:    { pct: 35, color: colors.zoneRed,    label: 'Red' },
};

export default function CoverageBar({ zone = 'green', showTiers = true }) {
  const config = ZONE_COVERAGE[zone] || ZONE_COVERAGE.green;
  const fillAnim = useRef(new Animated.Value(0)).current;
  const [displayPct, setDisplayPct] = React.useState(0);

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: config.pct, duration: 1500, useNativeDriver: false,
    }).start();
    const id = fillAnim.addListener(({ value }) => setDisplayPct(Math.round(value)));
    return () => fillAnim.removeListener(id);
  }, [zone]);

  const fillWidth = fillAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Coverage</Text>
        <Text style={[styles.pctValue, { color: config.color }]}>{displayPct}%</Text>
      </View>
      
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: fillWidth }]}>
          <LinearGradient
            colors={[config.color + 'AA', config.color]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.fillGradient}
          />
        </Animated.View>
      </View>

      {showTiers && (
        <View style={styles.tierRow}>
          {Object.entries(ZONE_COVERAGE).map(([key, tier]) => (
            <View key={key} style={styles.tierItem}>
              <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
              <Text style={[styles.tierText, zone === key && { color: tier.color, fontWeight: 'bold' }]}>
                {tier.label} {tier.pct}%
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  title: { color: colors.primary, opacity: 0.55, fontSize: 12, fontWeight: '600' },
  pctValue: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  track: {
    height: 8, borderRadius: 4,
    backgroundColor: 'rgba(26, 58, 92, 0.08)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 4, overflow: 'hidden' },
  fillGradient: { flex: 1, borderRadius: 4 },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  tierItem: { flexDirection: 'row', alignItems: 'center' },
  tierDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  tierText: { fontSize: 10, color: colors.primary, opacity: 0.4, fontWeight: '500' },
});
