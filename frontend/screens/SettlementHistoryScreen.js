import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import BackButton from '../components/BackButton';
import colors from '../theme/colors';
import { fetchClaimHistory } from '../services/api';

export default function SettlementHistoryScreen({ setScreen, riderContext }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnims = useRef([]).current;

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    try {
        const data = await fetchClaimHistory(riderContext.rider_id);
        setClaims(data);
        data.forEach((_, i) => { if (!fadeAnims[i]) fadeAnims[i] = new Animated.Value(0); });
        Animated.stagger(80,
          data.map((_, i) => Animated.spring(fadeAnims[i], { toValue: 1, useNativeDriver: true, friction: 8 }))
        ).start();
    } catch (err) {
        console.error("History fail", err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]} style={styles.container}>
      
      <BackButton onPress={() => setScreen('Dashboard')} label="Dashboard" />

      <Text style={styles.headerTitle}>Settlement History</Text>
      <Text style={styles.headerSub}>Audit of all parametric distributions</Text>

      {loading ? (
        <View style={styles.center}>
           <ActivityIndicator size="large" color={colors.vibrant} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
          {claims.length === 0 ? (
            <View style={styles.empty}>
               <FontAwesome5 name="receipt" size={40} color={colors.primary} opacity={0.2} />
               <Text style={styles.emptyText}>No settlements yet.</Text>
            </View>
          ) : (
            claims.map((claim, index) => (
              <Animated.View key={claim.id} style={
                fadeAnims[index] ? {
                  opacity: fadeAnims[index],
                  transform: [{ translateY: fadeAnims[index].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                } : {}
              }>
                <GlassCard style={styles.claimCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.amountBox}>
                      <Text style={styles.currency}>₹</Text>
                      <Text style={styles.amount}>{claim.payout_inr.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: claim.status === 'paid' ? 'rgba(76, 201, 240, 0.1)' : 'rgba(230, 57, 70, 0.1)' }]}>
                      <Text style={[styles.statusText, { color: claim.status === 'paid' ? colors.vibrant : colors.danger }]}>
                        {claim.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailsRow}>
                    <View style={styles.detail}>
                      <FontAwesome5 name="calendar-alt" size={12} color={colors.primary} opacity={0.4} />
                      <Text style={styles.detailText}>{new Date(claim.created_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.detail}>
                      <FontAwesome5 name="shield-alt" size={12} color={colors.primary} opacity={0.4} />
                      <Text style={styles.detailText}>{(claim.coverage_pct * 100).toFixed(0)}% Coverage</Text>
                    </View>
                  </View>

                  <Text style={styles.reason} numberOfLines={1}>{claim.reason || 'Parametric Disruption Settlement'}</Text>
                </GlassCard>
              </Animated.View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 50 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: colors.primary, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: colors.vibrant, marginTop: 4, fontWeight: '700', marginBottom: 24, textTransform: 'uppercase', letterSpacing: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { flex: 1 },
  claimCard: { marginBottom: 16, padding: 20, borderRadius: 24 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  amountBox: { flexDirection: 'row', alignItems: 'flex-end' },
  currency: { fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: 4, marginRight: 2 },
  amount: { fontSize: 32, fontWeight: '900', color: colors.primary, letterSpacing: -1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  detailsRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: colors.primary, opacity: 0.6, fontWeight: '500' },
  reason: { fontSize: 13, color: colors.primary, opacity: 0.4, fontStyle: 'italic' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, color: colors.primary, opacity: 0.3, fontSize: 16, fontWeight: '600' }
});
