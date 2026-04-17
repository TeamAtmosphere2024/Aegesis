import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, useWindowDimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import CustomModal from '../components/CustomModal';
import ZoneBadge from '../components/ZoneBadge';
import DPDTMeter from '../components/DPDTMeter';
import CoverageBar from '../components/CoverageBar';
import colors from '../theme/colors';
import api, { fetchRiderProfile } from '../services/api';

const ZONE_DATA = {
  green:  { penalty: 0,  coverage: 50 },
  orange: { penalty: 24, coverage: 45 },
  red:    { penalty: 45, coverage: 35 },
};

export default function ShieldDashboard({ setScreen, riderContext, setRiderContext }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [payoutVisible, setPayoutVisible] = useState(false);
  const [payoutOrder, setPayoutOrder] = useState(null);
  const lastZone = useRef(null);
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
    // Load Razorpay Script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
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
    // Poll every 10 seconds so zone changes from admin triggers are reflected instantly
    const interval = setInterval(refreshRiderData, 10000);
    return () => clearInterval(interval);
  }, []);

  const refreshRiderData = async () => {
    if (!riderContext?.rider_id) return;
    try {
        const freshProfile = await fetchRiderProfile(riderContext.rider_id);
        if (freshProfile && freshProfile.id) {
           const newZone = freshProfile.zone_category?.toLowerCase() || 'green';
           
           // TRIGGER DETECTION: If zone changed to ORANGE or RED, open Razorpay Payout
           const isHighRisk = newZone === 'red' || newZone === 'orange';
           const wasHighRisk = lastZone.current === 'red' || lastZone.current === 'orange';

           if (isHighRisk && !wasHighRisk) {
               handleAutoPayout(freshProfile);
           }
           lastZone.current = newZone;

           setRiderContext({
              ...riderContext,
              hub: freshProfile.hub_name,
              zone: newZone,
              dpdt: freshProfile.dpdt
           });
        }
    } catch (err) {
        console.warn("Refresh failed", err);
    }
  };

  const handleAutoPayout = async (profile) => {
    try {
        // Request order from backend for this specific rider
        const API_BASE = api.BASE_URL;
        const resp = await fetch(`${API_BASE}/admin/generate-payout-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                hub_name: profile.hub_name, 
                trigger_type: 'flood', 
                rider_id: profile.id,
                duration: 3.5, // Simulation: 3.5 hours disruption
                severity: 1.2  // Simulation: Moderate severity
            }) 
        });
        
        if (!resp.ok) return;
        const orderData = await resp.json();

        const options = {
            key: orderData.key,
            amount: orderData.amount_per_rider * 100, // Dynamic rider payout
            currency: "INR",
            name: "AEGESIS INSURANCE",
            description: `Instant ${profile.hub_name} Disruption Payout`,
            order_id: orderData.order_id,
            handler: function (response) {
                // In a real app, we'd update claim status here
                console.log("Rider received payment", response.razorpay_payment_id);
            },
            prefill: {
                name: profile.name,
                contact: profile.phone
            },
            theme: { color: colors.vibrant }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
    } catch (e) {
        console.error("Auto Payout Error", e);
    }
  };


  const { width } = useWindowDimensions();
  const isDesktop = width > 1024 && Platform.OS === 'web';

  const DashboardContent = (
    <View style={[styles.container, isDesktop && styles.webContainer]}>
      
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

        {/* History Row */}
        <View style={styles.secHistoryRow}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setScreen('SettlementHistory')} activeOpacity={0.7}>
            <GlassCard style={styles.miniSecCard}>
              <FontAwesome5 name="history" size={16} color={colors.accent} style={{ marginBottom: 6 }} />
              <Text style={styles.miniSecTitle}>Settlement History</Text>
            </GlassCard>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <CustomModal visible={modalVisible} title="Anomaly Detected" 
        description="Claim frozen by Isolation Forest. 499 concurrent claims from same IP range." 
        onClose={() => setModalVisible(false)} />
    </View>
  );

  if (isDesktop) {
    return DashboardContent;
  }

  return (
    <LinearGradient colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]} style={{ flex: 1 }}>
      {DashboardContent}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 55 },
  webContainer: {
    paddingTop: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 16,
  },
  greeting: { fontSize: 26, fontWeight: 'bold', color: colors.primary },
  location: { fontSize: 12, color: colors.primary, opacity: 0.5, marginTop: 2, fontWeight: '500' },

  // Premium card
  premiumCard: { marginBottom: 16, padding: 24, borderRadius: 24 },
  premiumHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  premiumLabel: {
    fontSize: 12, color: colors.primary, opacity: 0.45,
    textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 'bold',
  },
  protectedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.safety + '15',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
    borderWidth: 1, borderColor: colors.safety + '40',
  },
  protectedDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.safety, marginRight: 6,
  },
  protectedText: { color: colors.safety, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  premiumAmount: { fontSize: 48, fontWeight: '900', color: colors.primary, letterSpacing: -2, marginBottom: 4 },
  premiumBreakdown: { fontSize: 13, color: colors.primary, opacity: 0.4, marginBottom: 4 },
  premiumEngine: { fontSize: 11, color: colors.vibrant, fontWeight: '700', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  breakdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.vibrant + '10', paddingVertical: 14, borderRadius: 16,
    borderWidth: 1, borderColor: colors.vibrant + '30', gap: 10,
  },
  breakdownText: { color: colors.vibrant, fontSize: 14, fontWeight: '800' },

  // Metrics row
  metricsRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  dpdtCard: { flex: 1, padding: 20, alignItems: 'center', borderRadius: 24 },
  coverageSmallCard: { flex: 1, padding: 20, justifyContent: 'center', borderRadius: 24 },

  // Simulation Launcher
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.primary, marginBottom: 14, letterSpacing: -0.5 },
  simulationLauncher: { padding: 20, borderLeftWidth: 6, borderLeftColor: colors.vibrant, borderRadius: 24 },
  launcherContent: { flexDirection: 'row', alignItems: 'center' },
  pulseContainer: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  pulseCircle: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: colors.vibrant },
  launcherIconBox: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: colors.vibrant,
    alignItems: 'center', justifyContent: 'center', elevation: 6,
    shadowColor: colors.vibrant, shadowRadius: 10, shadowOpacity: 0.4,
  },
  launcherInfo: { flex: 1, marginLeft: 18 },
  launcherTitle: { fontSize: 17, fontWeight: 'bold', color: colors.primary },
  launcherDesc: { fontSize: 12, color: colors.primary, opacity: 0.5, marginTop: 2 },
  launcherBadge: { backgroundColor: colors.primary + '10', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  launcherBadgeText: { fontSize: 9, color: colors.vibrant, fontWeight: '900', letterSpacing: 1 },

  // Security/History row
  secHistoryRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
  miniSecCard: { padding: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  miniSecTitle: { fontSize: 14, fontWeight: 'bold', color: colors.primary, opacity: 0.8 },
});
