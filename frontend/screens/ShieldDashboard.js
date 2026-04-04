import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import CustomModal from '../components/CustomModal';
import ZoneBadge from '../components/ZoneBadge';
import DPDTMeter from '../components/DPDTMeter';
import CoverageBar from '../components/CoverageBar';
import SimulationConsole from '../components/SimulationConsole';
import colors from '../theme/colors';
import { triggerWebhook, fetchRiderProfile } from '../services/api';

const ZONE_DATA = {
  green:  { penalty: 0,  coverage: 50 },
  orange: { penalty: 24, coverage: 45 },
  red:    { penalty: 45, coverage: 35 },
};

export default function ShieldDashboard({ setScreen, riderContext, setRiderContext }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [consoleVisible, setConsoleVisible] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const zone = riderContext?.zone || 'orange';
  const dpdt = riderContext?.dpdt || 80;
  const riderName = riderContext?.name || 'Arjun';
  const hubName = riderContext?.hub || 'Zepto Hub - Koramangala';

  const zoneInfo = ZONE_DATA[zone];
  const basePremium = 60;
  const subtotal = basePremium + zoneInfo.penalty;
  const dpdtPenalty = ((100 - dpdt) / 100) * subtotal;
  const finalPremium = subtotal + dpdtPenalty;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    ).start();
  }, [pulseAnim]);

  // ON MOUNT: Refresh the rider's live data from the database (Hub, Zone, etc.)
  useEffect(() => {
    refreshRiderData();
  }, []);

  const refreshRiderData = async () => {
    if (!riderContext?.rider_id) return;
    const freshProfile = await fetchRiderProfile(riderContext.rider_id);
    if (freshProfile && freshProfile.id) {
       setRiderContext({
          ...riderContext,
          hub: freshProfile.hub_name,
          zone: freshProfile.zone_category?.toLowerCase() || 'green',
          dpdt: freshProfile.dpdt
       });
    }
  };

  const handleTrigger = async (id) => {
    setConsoleVisible(false);

    // Fetch the rider's active physical database location!
    const activeRiderId = riderContext?.rider_id || 1;
    const riderMeta = await fetchRiderProfile(activeRiderId);

    // Build the expected JSON payload based on Phase 2 Specification
    let payload = {
      source: "simulation_console",
      trigger_type: id.toUpperCase(),
      category: "ENVIRONMENTAL",
      geo_fence: {
        center_lat: riderMeta?.lat || 12.9352, 
        center_long: riderMeta?.lon || 77.6245,
        radius_km: 40.0
      },
      severity_multiplier: 1.0,
      estimated_duration_hours: 3.0,
      zone_category: zone.toUpperCase()
    };

    if (id === 'imd-weather') {
      payload.source = "imd_weather_api";
      payload.trigger_type = "SEVERE_FLOOD";
      payload.severity_multiplier = 2.0;
      payload.zone_category = "RED"; // Targeted shift
    } else if (id === 'imd-heat') {
      payload.source = "imd_heat_api";
      payload.trigger_type = "EXTREME_HEAT";
      payload.severity_multiplier = 1.2;
      payload.zone_category = "ORANGE"; // Targeted shift
    } else if (id === 'news-disruption') {
      payload.source = "news_nlp_api";
      payload.trigger_type = "STRIKE";
      payload.category = "SOCIOPOLITICAL";
      payload.severity_multiplier = 1.8;
      payload.zone_category = "RED"; // Targeted shift
    } else if (id === 'platform-status') {
      payload.source = "zepto_oracle";
      payload.trigger_type = "APP_SUSPENSION";
      payload.category = "APP_SUSPENSION_ORACLE";
      payload.severity_multiplier = 1.4;
      payload.zone_category = "ORANGE"; // Targeted shift
      payload.estimated_duration_hours = 2.0;
      payload.affected_pincode = "560034";
    }

    // Call the actual backend via api.js
    await triggerWebhook(id, payload);

    // Add small delay for realistic "Processing Oracle Signal" feel before jumping to history
    setTimeout(() => {
      setScreen(`Settlement:${id}`);
    }, 400);
  };

  return (
    <LinearGradient colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]} style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hello, {riderName}</Text>
          <Text style={styles.location}>{hubName}</Text>
        </View>
        <ZoneBadge zone={zone} compact showCoverage={false} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* Premium + Status Row */}
        <GlassCard style={styles.premiumCard}>
          <View style={styles.premiumHeader}>
            <Text style={styles.premiumLabel}>Weekly Premium</Text>
            <View style={styles.protectedBadge}>
              <View style={styles.protectedDot} />
              <Text style={styles.protectedText}>PROTECTED</Text>
            </View>
          </View>

          <Text style={styles.premiumAmount}>₹{finalPremium.toFixed(2)}</Text>
          <Text style={styles.premiumBreakdown}>
            Base ₹{basePremium} + Zone ₹{zoneInfo.penalty} + DPDT ₹{dpdtPenalty.toFixed(2)}
          </Text>
          <Text style={styles.premiumEngine}>Model 1 Dynamic Engine</Text>
          
          <TouchableOpacity style={styles.breakdownBtn} onPress={() => setScreen('PremiumBreakdown')} activeOpacity={0.7}>
            <FontAwesome5 name="chart-bar" size={14} color={colors.vibrant} />
            <Text style={styles.breakdownText}>View Full Breakdown</Text>
            <FontAwesome5 name="chevron-right" size={10} color={colors.vibrant} />
          </TouchableOpacity>
        </GlassCard>

        {/* Metrics Row — DPDT + Coverage side by side */}
        <View style={styles.metricsRow}>
          <GlassCard style={styles.dpdtCard}>
            <DPDTMeter percentage={dpdt} size={80} strokeWidth={6} />
          </GlassCard>
          <GlassCard style={styles.coverageSmallCard}>
            <CoverageBar zone={zone} showTiers={false} />
          </GlassCard>
        </View>

        {/* Simulation Section */}
        <Text style={styles.sectionTitle}>System Intelligence</Text>

        <TouchableOpacity onPress={() => setConsoleVisible(true)} activeOpacity={0.8}>
          <GlassCard style={styles.simulationLauncher}>
            <View style={styles.launcherContent}>
              <View style={styles.pulseContainer}>
                <Animated.View style={[styles.pulseCircle, {
                  opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                  transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }]
                }]} />
                <View style={styles.launcherIconBox}>
                  <FontAwesome5 name="satellite" size={18} color={colors.white} />
                </View>
              </View>
              <View style={styles.launcherInfo}>
                <Text style={styles.launcherTitle}>Simulation Centre</Text>
                <Text style={styles.launcherDesc}>Test real-world disaster triggers & payouts</Text>
              </View>
              <View style={styles.launcherBadge}>
                <Text style={styles.launcherBadgeText}>SYSTEM</Text>
              </View>
            </View>
          </GlassCard>
        </TouchableOpacity>

        {/* Security / History Row */}
        <View style={styles.secHistoryRow}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setScreen('TriggerStatus')} activeOpacity={0.7}>
            <GlassCard style={styles.miniSecCard}>
              <FontAwesome5 name="history" size={16} color={colors.accent} style={{ marginBottom: 6 }} />
              <Text style={styles.miniSecTitle}>History</Text>
            </GlassCard>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setScreen('FraudAlert')} activeOpacity={0.7}>
            <GlassCard style={styles.miniSecCard}>
              <FontAwesome5 name="shield-alt" size={16} color={colors.danger} style={{ marginBottom: 6 }} />
              <Text style={styles.miniSecTitle}>Security</Text>
            </GlassCard>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Simulation Console Modal */}
      <SimulationConsole 
        visible={consoleVisible} 
        onClose={() => setConsoleVisible(false)}
        onTrigger={handleTrigger}
      />

      <CustomModal visible={modalVisible} title="Anomaly Detected" 
        description="Claim frozen by Isolation Forest. 499 concurrent claims from same IP range." 
        onClose={() => setModalVisible(false)} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 55 },
  header: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 16,
  },
  greeting: { fontSize: 26, fontWeight: 'bold', color: colors.primary },
  location: { fontSize: 12, color: colors.primary, opacity: 0.5, marginTop: 2, fontWeight: '500' },

  // Premium card
  premiumCard: { marginBottom: 12, padding: 18 },
  premiumHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  premiumLabel: {
    fontSize: 11, color: colors.primary, opacity: 0.45,
    textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 'bold',
  },
  protectedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.safety + '15',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    borderWidth: 1, borderColor: colors.safety + '40',
  },
  protectedDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.safety, marginRight: 5,
  },
  protectedText: { color: colors.safety, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.8 },
  premiumAmount: { fontSize: 36, fontWeight: '900', color: colors.primary, letterSpacing: -1, marginBottom: 2 },
  premiumBreakdown: { fontSize: 12, color: colors.primary, opacity: 0.4, marginBottom: 2 },
  premiumEngine: { fontSize: 11, color: colors.vibrant, fontWeight: '600', marginBottom: 12 },
  breakdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.vibrant + '0A', paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: colors.vibrant + '20', gap: 8,
  },
  breakdownText: { color: colors.vibrant, fontSize: 13, fontWeight: '700' },

  // Metrics row
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dpdtCard: { flex: 1, padding: 14, alignItems: 'center' },
  coverageSmallCard: { flex: 1, padding: 14, justifyContent: 'center' },

  // Simulation Launcher
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 10 },
  simulationLauncher: { padding: 16, borderLeftWidth: 4, borderLeftColor: colors.vibrant },
  launcherContent: { flexDirection: 'row', alignItems: 'center' },
  pulseContainer: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pulseCircle: { position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: colors.vibrant },
  launcherIconBox: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: colors.vibrant,
    alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  launcherInfo: { flex: 1, marginLeft: 14 },
  launcherTitle: { fontSize: 15, fontWeight: 'bold', color: colors.primary },
  launcherDesc: { fontSize: 11, color: colors.primary, opacity: 0.45, marginTop: 1 },
  launcherBadge: { backgroundColor: colors.primary + '08', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  launcherBadgeText: { fontSize: 8, color: colors.vibrant, fontWeight: '900', letterSpacing: 0.5 },

  // Security/History row
  secHistoryRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  miniSecCard: { padding: 16, alignItems: 'center', justifyContent: 'center' },
  miniSecTitle: { fontSize: 12, fontWeight: 'bold', color: colors.primary, opacity: 0.7 },
});
