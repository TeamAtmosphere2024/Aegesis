import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import BackButton from '../components/BackButton';
import AnimatedButton from '../components/AnimatedButton';
import ZoneBadge from '../components/ZoneBadge';
import CoverageBar from '../components/CoverageBar';
import colors from '../theme/colors';
import * as Haptics from 'expo-haptics';
import { fetchSettlement } from '../services/api';

export default function SettlementScreen({ setScreen, riderContext, triggerType = 'flood' }) {
  const [loading, setLoading] = useState(true);
  const [settlement, setSettlement] = useState(null);
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayAmount, setDisplayAmount] = useState('0.00');
  const scaleIcon = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadSettlementWithRetry(); }, []);

  const loadSettlementWithRetry = async (retryCount = 0) => {
    const activeRiderId = riderContext?.rider_id;
    
    // Initial wait to let background tasks start
    if (retryCount === 0) await new Promise(r => setTimeout(r, 2200));

    const data = await fetchSettlement(triggerType, activeRiderId);
    
    // Check if the claim was created within the last 60 seconds
    const isFresh = data && (new Date() - new Date(data.created_at)) < 60000;

    if (isFresh || retryCount >= 4 || !activeRiderId) {
      setSettlement(data);
      setTimeout(() => {
        setLoading(false);
        if (data?.status === 'paid' || data?.status === 'approved') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }, 1000);
    } else {
      // Retry for up to 10 seconds total
      setTimeout(() => loadSettlementWithRetry(retryCount + 1), 2000);
    }
  };

  useEffect(() => {
    if (!loading && settlement) {
      const payoutVal = settlement.payout_inr || 0.0;
      Animated.parallel([
        Animated.spring(scaleIcon, { toValue: 1, friction: 4, useNativeDriver: true }),
        Animated.timing(countAnim, { toValue: payoutVal, duration: 2000, useNativeDriver: false }),
      ]).start();
      const id = countAnim.addListener(({ value }) => setDisplayAmount(value.toFixed(2)));
      return () => countAnim.removeListener(id);
    }
  }, [loading, settlement]);

  // Derived state from Live Data (Safe Fallbacks so it doesn't crash)
  const isApproved = settlement && (settlement.status === "approved" || settlement.status === "paid");
  const finalPayout = settlement?.payout_inr || 0.0;
  // Backend returns fraction (0.45). We store as dedicated variable for safety.
  const coverageFrac = settlement?.coverage_pct || 0.35; 
  const coverageDisplay = (coverageFrac * 100).toFixed(0); 
  
  // Base Loss = Payout / Coverage (e.g. 270 / 0.45 = 600)
  const baseLoss = (finalPayout > 0 && coverageFrac > 0) ? (finalPayout / coverageFrac) : 0.0;
  
  const distance = (settlement?.distance_km !== undefined) ? settlement.distance_km.toFixed(2) : '0.00';
  const claimStatusMsg = settlement?.reason || 'Auto-approved by Aegesis Engine';

  return (
    <LinearGradient colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]} style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.vibrant} />
          <Text style={styles.loadingText}>Validating GPS Radius & Trigger Match...</Text>
          <Text style={styles.loadingSub}>Haversine 2.5km check in progress</Text>
        </View>
      ) : settlement ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <BackButton onPress={() => setScreen('Dashboard')} label="Dashboard" />

          {/* Success / Rejected Icon */}
          <View style={styles.successSection}>
            <View style={styles.glowContainer}>
              <View style={[styles.successGlow, !isApproved && { backgroundColor: 'rgba(230, 57, 70, 0.2)', shadowColor: colors.danger }]} />
              <Animated.View style={{ transform: [{ scale: scaleIcon }], zIndex: 10 }}>
                {isApproved ? (
                  <Ionicons name="checkmark-circle" size={80} color={colors.safety} />
                ) : (
                  <Ionicons name="close-circle" size={80} color={colors.danger} />
                )}
              </Animated.View>
            </View>
            <Text style={[styles.successTitle, !isApproved && { color: colors.danger }]}>
              {isApproved ? "Parametric Payout Approved" : "Settlement Denied"}
            </Text>
            {!isApproved && <Text style={{ color: colors.primary, opacity: 0.6, fontSize: 13, marginTop: 4 }}>{claimStatusMsg}</Text>}
          </View>
          
          {/* Receipt */}
          <GlassCard style={styles.receiptCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Trigger:</Text>
              <Text style={styles.value}>{triggerType.toUpperCase()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Distance:</Text>
              <Text style={[styles.value, isApproved ? { color: colors.safety } : { color: colors.danger }]}>{distance}km from epicenter</Text>
            </View>
            <View style={styles.separator} />

            <Text style={styles.formulaTitle}>MODEL 2: PAYOUT CALCULATION</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Base Loss (Estimated):</Text>
              <Text style={styles.value}>₹{baseLoss.toFixed(2)}</Text>
            </View>
            <View style={styles.separator} />
            
            <View style={styles.zoneRow}>
              <ZoneBadge zone={riderContext?.zone || 'orange'} compact showCoverage={false} />
              <Text style={styles.coverageText}>× {coverageDisplay}%</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.row}>
              <Text style={styles.label}>UPI Credit:</Text>
              <Text style={[styles.payoutValue, !isApproved && { color: colors.danger }]}>₹{displayAmount}</Text>
            </View>

            <Text style={styles.formulaNote}>
              Base Loss × {coverageDisplay}% = ₹{finalPayout.toFixed(2)}
            </Text>
          </GlassCard>

          <GlassCard style={styles.coverageCard}>
            <CoverageBar zone={riderContext?.zone || 'orange'} showTiers={true} />
          </GlassCard>

          <AnimatedButton 
            onPress={() => setScreen('Dashboard')}
            gradientColors={[colors.vibrant, '#005fa3']}
          >
            <Text style={styles.buttonText}>Return to Dashboard</Text>
          </AnimatedButton>

          <View style={{ height: 30 }} />
        </ScrollView>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 50 },
  scrollContent: { paddingBottom: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.vibrant, marginTop: 18, fontSize: 15, fontWeight: '600' },
  loadingSub: { color: colors.vibrant, opacity: 0.5, marginTop: 4, fontSize: 12 },
  successSection: { alignItems: 'center', marginBottom: 20 },
  glowContainer: {
    alignItems: 'center', justifyContent: 'center',
    width: 120, height: 120, marginBottom: 8, position: 'relative',
  },
  successGlow: {
    position: 'absolute', width: 80, height: 80,
    backgroundColor: 'rgba(46, 196, 178, 0.2)',
    borderRadius: 40,
    shadowColor: colors.safety,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 30, elevation: 15, zIndex: 1,
  },
  successTitle: {
    fontSize: 22, fontWeight: 'bold', color: colors.primary,
    textAlign: 'center',
  },
  receiptCard: { width: '100%', padding: 20, marginBottom: 12 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginVertical: 5, alignItems: 'center',
  },
  label: { color: colors.primary, opacity: 0.5, fontSize: 13 },
  value: { color: colors.primary, fontSize: 13, fontWeight: 'bold' },
  formulaTitle: {
    color: colors.vibrant, fontSize: 10, fontWeight: 'bold',
    letterSpacing: 1, marginBottom: 6,
  },
  zoneRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginVertical: 6,
  },
  coverageText: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
  payoutValue: { color: colors.safety, fontSize: 28, fontWeight: '900', letterSpacing: 0.5 },
  formulaNote: {
    color: colors.primary, opacity: 0.3,
    fontSize: 10, textAlign: 'center', marginTop: 8, fontStyle: 'italic',
  },
  separator: { height: 1, backgroundColor: 'rgba(26, 58, 92, 0.08)', marginVertical: 10 },
  coverageCard: { width: '100%', padding: 14, marginBottom: 18 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
});
