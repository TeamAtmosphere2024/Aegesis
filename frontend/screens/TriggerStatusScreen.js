import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import BackButton from '../components/BackButton';
import colors from '../theme/colors';
import { fetchTriggers } from '../services/api';

const CATEGORY_COLORS = {
  ENVIRONMENTAL: colors.vibrant,
  SOCIO_POLITICAL: colors.warning,
  PLATFORM: colors.danger,
};

const STATUS_CONFIG = {
  ACTIVE:    { color: colors.danger, label: 'ACTIVE',    icon: 'bolt' },
  PROCESSING:{ color: colors.warning, label: 'PROCESSING', icon: 'spinner' },
  RESOLVED:  { color: colors.safety, label: 'RESOLVED',  icon: 'check-circle' },
};

export default function TriggerStatusScreen({ setScreen }) {
  const [triggers, setTriggers] = useState([]);
  const fadeAnims = useRef([]).current;

  useEffect(() => { loadTriggers(); }, []);

  const loadTriggers = async () => {
    const data = await fetchTriggers();
    setTriggers(data);
    data.forEach((_, i) => { if (!fadeAnims[i]) fadeAnims[i] = new Animated.Value(0); });
    Animated.stagger(120,
      data.map((_, i) => Animated.spring(fadeAnims[i], { toValue: 1, useNativeDriver: true, friction: 7 }))
    ).start();
  };

  const handleTriggerPress = (trigger) => {
    setScreen(trigger.type === 'APP_SUSPENSION' ? 'Settlement:app_suspension' : 'Settlement:flood');
  };

  return (
    <LinearGradient colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]} style={styles.container}>
      
      <BackButton onPress={() => setScreen('Dashboard')} label="Dashboard" />

      <Text style={styles.headerTitle}>Trigger Status</Text>
      <Text style={styles.headerSub}>Real-time disruption monitoring</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        <GlassCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.danger }]}>
            {triggers.filter(t => t.status === 'ACTIVE').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.safety }]}>
            {triggers.filter(t => t.status === 'RESOLVED').length}
          </Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </GlassCard>
        <GlassCard style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.vibrant }]}>
            {triggers.reduce((sum, t) => sum + t.affected_riders, 0)}
          </Text>
          <Text style={styles.statLabel}>Riders</Text>
        </GlassCard>
      </View>

      {/* Trigger List */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
        {triggers.map((trigger, index) => {
          const statusConf = STATUS_CONFIG[trigger.status] || STATUS_CONFIG.RESOLVED;
          const catColor = CATEGORY_COLORS[trigger.category] || colors.vibrant;

          // Compute missing fields that used to be mocked
          const triggerLabel = trigger.label || trigger.trigger_type || 'Unknown Alert';
          const triggerTypeLower = (trigger.trigger_type || '').toLowerCase();
          let iconName = 'exclamation-triangle';
          if (triggerTypeLower.includes('flood') || triggerTypeLower.includes('rain')) iconName = 'cloud-showers-heavy';
          else if (triggerTypeLower.includes('heat')) iconName = 'temperature-high';
          else if (triggerTypeLower.includes('strike') || triggerTypeLower.includes('protest')) iconName = 'fist-raised';
          else if (triggerTypeLower.includes('suspension') || triggerTypeLower.includes('app')) iconName = 'mobile-alt';

          return (
            <Animated.View key={trigger.id} style={
              fadeAnims[index] ? {
                opacity: fadeAnims[index],
                transform: [{ translateY: fadeAnims[index].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
              } : {}
            }>
              <TouchableOpacity onPress={() => handleTriggerPress(trigger)} activeOpacity={0.7}>
                <GlassCard style={styles.triggerCard}>
                  {/* Left status line */}
                  <View style={[styles.statusLine, { backgroundColor: statusConf.color }]} />
                  
                  <View style={styles.triggerContent}>
                    {/* Top */}
                    <View style={styles.topRow}>
                      <View style={[styles.triggerIcon, { backgroundColor: catColor + '12' }]}>
                        <FontAwesome5 name={iconName} size={18} color={catColor} />
                      </View>
                      <View style={styles.triggerInfo}>
                        <Text style={styles.triggerLabel}>{triggerLabel}</Text>
                        <Text style={styles.triggerSource}>via {trigger.source}</Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: statusConf.color + '12', borderColor: statusConf.color + '40' }]}>
                        <FontAwesome5 name={statusConf.icon} size={9} color={statusConf.color} />
                        <Text style={[styles.statusText, { color: statusConf.color }]}>{statusConf.label}</Text>
                      </View>
                    </View>

                    {/* Details */}
                    <View style={styles.detailsGrid}>
                      <View style={styles.detailItem}>
                        <FontAwesome5 name="map-marker-alt" size={10} color={colors.vibrant} />
                        <Text style={styles.detailText}>{trigger.epicenter?.lat?.toFixed(4) || 'N/A'}, {trigger.epicenter?.lon?.toFixed(4) || 'N/A'}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <FontAwesome5 name="bullseye" size={10} color={colors.vibrant} />
                        <Text style={styles.detailText}>{trigger.radius_km}km radius</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <FontAwesome5 name="users" size={10} color={colors.warning} />
                        <Text style={styles.detailText}>{trigger.affected_riders} riders</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <FontAwesome5 name="clock" size={10} color={colors.warning} />
                        <Text style={styles.detailText}>{trigger.duration_hours}h</Text>
                      </View>
                    </View>

                    {/* Severity */}
                    <View style={styles.severityRow}>
                      <Text style={styles.severityLabel}>Severity: {trigger.severity_multiplier}x</Text>
                      <View style={styles.severityTrack}>
                        <View style={[styles.severityFill, { 
                          width: `${Math.min(trigger.severity_multiplier / 2 * 100, 100)}%`,
                          backgroundColor: trigger.severity_multiplier >= 1.5 ? colors.danger : 
                                          trigger.severity_multiplier >= 1.0 ? colors.warning : colors.safety,
                        }]} />
                      </View>
                    </View>

                    <Text style={styles.timestamp}>{new Date(trigger.created_at || trigger.timestamp).toLocaleString()}</Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 50 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: colors.primary, letterSpacing: 0.3 },
  headerSub: { fontSize: 12, color: colors.vibrant, marginTop: 3, fontWeight: '600', marginBottom: 16 },
  statsRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  statCard: { flex: 1, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: {
    fontSize: 9, color: colors.primary, opacity: 0.45, marginTop: 2,
    textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600',
  },
  list: { flex: 1 },
  triggerCard: {
    marginBottom: 12, padding: 0, overflow: 'hidden', flexDirection: 'row',
  },
  statusLine: {
    width: 4, borderTopLeftRadius: 18, borderBottomLeftRadius: 18,
  },
  triggerContent: { flex: 1, padding: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  triggerIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  triggerInfo: { flex: 1, marginLeft: 10 },
  triggerLabel: { fontSize: 15, fontWeight: 'bold', color: colors.primary },
  triggerSource: { fontSize: 10, color: colors.primary, opacity: 0.35, marginTop: 1 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, gap: 4,
  },
  statusText: { fontSize: 9, fontWeight: 'bold', letterSpacing: 0.3 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  detailItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(26, 58, 92, 0.04)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, gap: 4,
  },
  detailText: { fontSize: 10, color: colors.primary, opacity: 0.6 },
  severityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  severityLabel: { fontSize: 10, color: colors.primary, opacity: 0.45, fontWeight: '600', width: 75 },
  severityTrack: {
    flex: 1, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(26, 58, 92, 0.06)', overflow: 'hidden',
  },
  severityFill: { height: '100%', borderRadius: 3 },
  timestamp: { fontSize: 9, color: colors.primary, opacity: 0.3, textAlign: 'right' },
});
