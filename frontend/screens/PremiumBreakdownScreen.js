import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import BackButton from '../components/BackButton';
import ZoneBadge from '../components/ZoneBadge';
import DPDTMeter from '../components/DPDTMeter';
import colors from '../theme/colors';
import useApi from '../hooks/useApi';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const ZONE_DATA = {
  green:  { penalty: 0,  label: 'Green Zone',  color: colors.zoneGreen },
  orange: { penalty: 24, label: 'Orange Zone', color: colors.zoneOrange },
  red:    { penalty: 45, label: 'Red Zone',    color: colors.zoneRed },
};

export default function PremiumBreakdownScreen({ setScreen, riderContext }) {
  const { data: premiumData, loading, error, execute } = useApi(api.fetchPremium);

  const zone = riderContext?.zone || 'orange';
  const dpdt = riderContext?.dpdt || 80;
  const zoneInfo = ZONE_DATA[zone];

  // Derive initial values for animation, but override with backend data when ready
  const basePremium = premiumData?.base_premium || 60;
  const zonePenalty = premiumData?.zone_penalty || zoneInfo.penalty;
  const subtotal = premiumData?.subtotal || (basePremium + zonePenalty);
  const dpdtPenalty = premiumData?.dpdt_penalty || (((100 - dpdt) / 100) * subtotal);
  const finalPremium = premiumData?.final_premium || (subtotal + dpdtPenalty);

  const step1 = useRef(new Animated.Value(0)).current;
  const step2 = useRef(new Animated.Value(0)).current;
  const step3 = useRef(new Animated.Value(0)).current;
  const step4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fetch calculation from real backend on mount
    execute(riderContext?.rider_id || 1);
  }, []);

  useEffect(() => {
    // Trigger animations only once data is loaded (or on fallback if needed)
    if (!loading) {
      Animated.stagger(250, [
        Animated.spring(step1, { toValue: 1, useNativeDriver: true, friction: 7 }),
        Animated.spring(step2, { toValue: 1, useNativeDriver: true, friction: 7 }),
        Animated.spring(step3, { toValue: 1, useNativeDriver: true, friction: 7 }),
        Animated.spring(step4, { toValue: 1, useNativeDriver: true, friction: 7 }),
      ]).start();
    }
  }, [loading]);

  const stepStyle = (anim) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [25, 0] }) }],
  });

  return (
    <LinearGradient colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <BackButton onPress={() => setScreen('Dashboard')} label="Dashboard" />
        
        <Text style={styles.headerTitle}>Premium Breakdown</Text>
        <Text style={styles.headerSub}>Model 1: Dynamic Premium Engine</Text>
        
        {loading ? (
             <GlassCard style={{ marginTop: 20 }}>
                <LoadingSpinner message="Querying Premium Oracle..." />
             </GlassCard>
        ) : (
        <>

        <View style={styles.section}>
          <ZoneBadge zone={zone} />
        </View>

        {/* Step 1 */}
        <Animated.View style={stepStyle(step1)}>
          <GlassCard style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepBadge, { backgroundColor: colors.vibrant + '15' }]}>
                <Text style={[styles.stepNum, { color: colors.vibrant }]}>1</Text>
              </View>
              <Text style={styles.stepTitle}>Base Premium</Text>
            </View>
            <Text style={styles.stepDesc}>Fixed weekly floor for all Q-Commerce riders</Text>
            <Text style={styles.stepValue}>₹{basePremium}.00</Text>
          </GlassCard>
        </Animated.View>

        {/* Step 2 */}
        <Animated.View style={stepStyle(step2)}>
          <GlassCard style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepBadge, { backgroundColor: zoneInfo.color + '15' }]}>
                <Text style={[styles.stepNum, { color: zoneInfo.color }]}>2</Text>
              </View>
              <Text style={styles.stepTitle}>Zone Risk Penalty</Text>
            </View>
            <Text style={styles.stepDesc}>{zoneInfo.label} — IMD + News NLP + Platform signals</Text>
            <Text style={[styles.stepValue, { color: zoneInfo.color }]}>+₹{zonePenalty}.00</Text>
            <View style={styles.divider} />
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal</Text>
              <Text style={styles.subtotalValue}>₹{subtotal}.00</Text>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Step 3 */}
        <Animated.View style={stepStyle(step3)}>
          <GlassCard style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepBadge, { backgroundColor: colors.accent + '15' }]}>
                <Text style={[styles.stepNum, { color: colors.accent }]}>3</Text>
              </View>
              <Text style={styles.stepTitle}>DPDT Correction</Text>
            </View>
            <Text style={styles.stepDesc}>
              Penalty = (100% - {dpdt}%) × ₹{subtotal} = {100 - dpdt}% × ₹{subtotal}
            </Text>
            <View style={styles.dpdtSection}>
              <DPDTMeter percentage={dpdt} size={90} strokeWidth={7} />
            </View>
            <Text style={[styles.stepValue, { color: colors.warning }]}>+₹{dpdtPenalty.toFixed(2)}</Text>
            <Text style={styles.formulaText}>Formula: (100% - DPDT%) × Subtotal</Text>
          </GlassCard>
        </Animated.View>

        {/* Step 4: Final */}
        <Animated.View style={stepStyle(step4)}>
          <GlassCard style={[styles.stepCard, styles.finalCard]}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepBadge, { backgroundColor: colors.safety + '15' }]}>
                <FontAwesome5 name="check" size={12} color={colors.safety} />
              </View>
              <Text style={styles.stepTitle}>Final Weekly Premium</Text>
            </View>
            <View style={styles.finalRow}>
              <View>
                <Text style={styles.formulaBreakdown}>
                  ₹{basePremium} + ₹{zonePenalty} + ₹{dpdtPenalty.toFixed(2)}
                </Text>
                <Text style={styles.finalLabel}>Billed every Monday</Text>
              </View>
              <Text style={styles.finalValue}>₹{finalPremium.toFixed(2)}</Text>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Comparison */}
        <GlassCard style={styles.tableCard}>
          <Text style={styles.tableTitle}>DPDT Impact Comparison</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tCell, styles.tHeader, { flex: 1.5 }]}>Rider</Text>
            <Text style={[styles.tCell, styles.tHeader]}>DPDT</Text>
            <Text style={[styles.tCell, styles.tHeader]}>Premium</Text>
          </View>
          {[
            { name: 'Hustler', dpdt: '100%', premium: `₹${subtotal}.00`, hl: false },
            { name: riderContext?.name || 'Arjun', dpdt: `${dpdt}%`, premium: `₹${finalPremium.toFixed(2)}`, hl: true },
            { name: 'Fair-Weather', dpdt: '20%', premium: `₹${(subtotal + 0.8 * subtotal).toFixed(2)}`, hl: false },
          ].map((row, i) => (
            <View key={i} style={[styles.tableRow, row.hl && styles.tableRowHl]}>
              <Text style={[styles.tCell, { flex: 1.5, color: colors.primary }]}>{row.name}</Text>
              <Text style={[styles.tCell, { color: colors.vibrant, fontWeight: '600' }]}>{row.dpdt}</Text>
              <Text style={[styles.tCell, { color: colors.safety, fontWeight: 'bold' }]}>{row.premium}</Text>
            </View>
          ))}
        </GlassCard>

        <View style={{ height: 30 }} />
        </>
        )}

        {error && (
          <GlassCard style={styles.errorCard}>
             <FontAwesome5 name="exclamation-triangle" size={24} color={colors.danger} />
             <Text style={styles.errorText}>{error}</Text>
             <TouchableOpacity onPress={() => execute(riderContext?.rider_id || 1)} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry Calculation</Text>
             </TouchableOpacity>
          </GlassCard>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 50 },
  scrollContent: { paddingBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: colors.primary, letterSpacing: 0.3 },
  headerSub: { fontSize: 12, color: colors.vibrant, marginTop: 3, fontWeight: '600', marginBottom: 16 },
  section: { marginBottom: 14 },
  stepCard: { marginBottom: 12, padding: 18 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepBadge: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  stepNum: { fontSize: 13, fontWeight: 'bold' },
  stepTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  stepDesc: { color: colors.primary, opacity: 0.5, fontSize: 12, lineHeight: 17, marginBottom: 8, marginLeft: 36 },
  stepValue: { fontSize: 26, fontWeight: '900', color: colors.primary, textAlign: 'right', letterSpacing: -0.5 },
  divider: { height: 1, backgroundColor: 'rgba(26, 58, 92, 0.1)', marginVertical: 10 },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subtotalLabel: { color: colors.primary, opacity: 0.5, fontSize: 13, fontWeight: '600' },
  subtotalValue: { color: colors.primary, fontSize: 20, fontWeight: 'bold' },
  dpdtSection: { alignItems: 'center', marginVertical: 12 },
  formulaText: { color: colors.primary, opacity: 0.3, fontSize: 10, textAlign: 'right', marginTop: 3, fontStyle: 'italic' },
  finalCard: { borderColor: colors.safety + '40', borderWidth: 1.5 },
  finalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  formulaBreakdown: { color: colors.primary, opacity: 0.5, fontSize: 12 },
  finalLabel: { color: colors.primary, opacity: 0.35, fontSize: 10, marginTop: 3 },
  finalValue: { fontSize: 32, fontWeight: '900', color: colors.safety, letterSpacing: -1 },
  tableCard: { marginTop: 6, padding: 16 },
  tableTitle: { color: colors.primary, fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  tableHeader: {
    flexDirection: 'row', paddingBottom: 6,
    borderBottomWidth: 1, borderBottomColor: 'rgba(26, 58, 92, 0.1)',
  },
  tCell: { flex: 1, fontSize: 12, color: colors.primary, opacity: 0.5 },
  tHeader: { fontWeight: 'bold', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 },
  tableRow: {
    flexDirection: 'row', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(26, 58, 92, 0.05)',
  },
  tableRowHl: { backgroundColor: colors.accent + '10', borderRadius: 8, paddingHorizontal: 5 },
  errorCard: { marginTop: 20, padding: 20, alignItems: 'center', backgroundColor: 'rgba(230, 57, 70, 0.05)', borderColor: colors.danger, borderWidth: 1 },
  errorText: { color: colors.danger, fontSize: 14, textAlign: 'center', marginVertical: 15, fontWeight: '600' },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: colors.white || '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
});
