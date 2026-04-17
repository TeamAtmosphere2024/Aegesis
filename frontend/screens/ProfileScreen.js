import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import colors from '../theme/colors';

export default function ProfileScreen({ riderContext, setScreen }) {
  const [activeTab, setActiveTab] = useState('details');

  if (!riderContext) return null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header / Avatar Section */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarGlow} />
            <View style={styles.avatarBox}>
              <FontAwesome5 name="user-ninja" size={32} color={colors.white} />
            </View>
            <View style={styles.onlineBadge} />
          </View>
          
          <Text style={styles.userName}>{riderContext.name || 'Anonymous Rider'}</Text>
          <Text style={styles.userRole}>Level 4 Certified Partner</Text>
          
          <View style={styles.idBadge}>
            <Text style={styles.idText}>ID: AEGE-{riderContext.rider_id || '8291'}</Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'details' && styles.activeTab]} 
            onPress={() => setActiveTab('details')}
          >
            <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>Identity</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'stats' && styles.activeTab]} 
            onPress={() => setActiveTab('stats')}
          >
            <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>Performance</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'settings' && styles.activeTab]} 
            onPress={() => setActiveTab('settings')}
          >
            <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>Settings</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'details' && (
          <Animated.View style={styles.contentSection}>
            <GlassCard style={styles.infoCard}>
              <Text style={styles.cardHeader}>Personal Identity</Text>
              
              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <FontAwesome5 name="phone" size={14} color={colors.accent} />
                </View>
                <View style={styles.infoLabels}>
                  <Text style={styles.infoTitle}>Mobile Number</Text>
                  <Text style={styles.infoValue}>+91 {riderContext.phone || '9876543210'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <FontAwesome5 name="map-marker-alt" size={14} color={colors.accent} />
                </View>
                <View style={styles.infoLabels}>
                  <Text style={styles.infoTitle}>Home Hub</Text>
                  <Text style={styles.infoValue}>{riderContext.hub || 'Chennai Central Hub'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <FontAwesome5 name="briefcase" size={14} color={colors.accent} />
                </View>
                <View style={styles.infoLabels}>
                  <Text style={styles.infoTitle}>Delivery Platform</Text>
                  <Text style={styles.infoValue}>{riderContext.platform || 'Zepto Logistics'}</Text>
                </View>
              </View>
            </GlassCard>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Edit Identity Details</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {activeTab === 'stats' && (
          <View style={styles.contentSection}>
             <View style={styles.statsGrid}>
                <GlassCard style={styles.miniStat}>
                  <Text style={styles.miniStatLabel}>Protected Hrs</Text>
                  <Text style={styles.miniStatValue}>1,240</Text>
                </GlassCard>
                <GlassCard style={styles.miniStat}>
                  <Text style={styles.miniStatLabel}>Claims Paid</Text>
                  <Text style={styles.miniStatValue}>12</Text>
                </GlassCard>
             </View>
             
             <GlassCard style={styles.trustCard}>
               <View style={styles.trustHeader}>
                 <FontAwesome5 name="shield-check" size={24} color={colors.safety} />
                 <Text style={styles.trustTitle}>Trust Score: 98/100</Text>
               </View>
               <Text style={styles.trustDesc}>
                 Your DPDT consistency and zero-fraud history puts you in the top 5% of Aegesis protected riders in South India.
               </Text>
             </GlassCard>
          </View>
        )}

        {activeTab === 'settings' && (
          <View style={styles.contentSection}>
            <TouchableOpacity style={styles.settingsRow}>
              <FontAwesome5 name="bell" size={18} color={colors.primary} />
              <Text style={styles.settingsText}>Notifications</Text>
              <FontAwesome5 name="chevron-right" size={14} color={colors.primary} style={{ marginLeft: 'auto', opacity: 0.3 }} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsRow}>
              <FontAwesome5 name="lock" size={18} color={colors.primary} />
              <Text style={styles.settingsText}>Privacy & Security</Text>
              <FontAwesome5 name="chevron-right" size={14} color={colors.primary} style={{ marginLeft: 'auto', opacity: 0.3 }} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.settingsRow, { marginTop: 20 }]}>
              <FontAwesome5 name="sign-out-alt" size={18} color={colors.danger} />
              <Text style={[styles.settingsText, { color: colors.danger }]}>Logout of Command Center</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 30 },
  scrollContent: { paddingBottom: 20 },
  
  header: { alignItems: 'center', marginBottom: 30 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatarGlow: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#2099BA', opacity: 0.2, top: -5, left: -5
  },
  avatarBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#2099BA', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.white,
    boxShadow: '0 10px 20px rgba(32, 153, 186, 0.3)'
  },
  onlineBadge: {
    position: 'absolute', bottom: 5, right: 5, width: 16, height: 16,
    borderRadius: 8, backgroundColor: colors.safety, borderWidth: 3, borderColor: colors.white
  },
  userName: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  userRole: { fontSize: 13, color: colors.primary, opacity: 0.5, fontWeight: '600' },
  idBadge: { 
    marginTop: 10, paddingHorizontal: 12, paddingVertical: 4, 
    borderRadius: 20, backgroundColor: 'rgba(32, 153, 186, 0.1)',
  },
  idText: { fontSize: 11, fontWeight: 'bold', color: '#2099BA' },

  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 15, padding: 5, marginBottom: 25 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: colors.white, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.primary, opacity: 0.4 },
  activeTabText: { opacity: 1 },

  contentSection: { gap: 15 },
  infoCard: { padding: 20 },
  cardHeader: { fontSize: 15, fontWeight: '800', color: colors.primary, marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  infoIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(32, 153, 186, 0.08)', alignItems: 'center', justifyContent: 'center' },
  infoLabels: { marginLeft: 15 },
  infoTitle: { fontSize: 11, color: colors.primary, opacity: 0.4, fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '700', color: colors.primary },

  actionButton: { 
    backgroundColor: '#2099BA', paddingVertical: 15, borderRadius: 15, alignItems: 'center',
    boxShadow: '0 10px 20px rgba(32, 153, 186, 0.2)'
  },
  actionButtonText: { color: colors.white, fontWeight: 'bold', fontSize: 15 },

  statsGrid: { flexDirection: 'row', gap: 15 },
  miniStat: { flex: 1, padding: 15, alignItems: 'center' },
  miniStatLabel: { fontSize: 10, color: colors.primary, opacity: 0.4, fontWeight: '700', textTransform: 'uppercase', marginBottom: 5 },
  miniStatValue: { fontSize: 20, fontWeight: '900', color: colors.primary },
  
  trustCard: { padding: 20, backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.1)' },
  trustHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  trustTitle: { fontSize: 16, fontWeight: '800', color: colors.safety },
  trustDesc: { fontSize: 12, lineHeight: 18, color: colors.primary, opacity: 0.6 },

  settingsRow: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, 
    padding: 18, borderRadius: 15, gap: 15, borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)'
  },
  settingsText: { fontSize: 15, fontWeight: '600', color: colors.primary },
});
