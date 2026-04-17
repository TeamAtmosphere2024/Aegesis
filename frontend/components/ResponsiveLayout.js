import React from 'react';
import { View, useWindowDimensions, StyleSheet, ScrollView, Platform, Text, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import colors from '../theme/colors';

export default function ResponsiveLayout({ children, currentScreen, setScreen, hideSidebar }) {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024 && Platform.OS === 'web';

  if (!isDesktop) {
    return <>{children}</>;
  }

  const showNav = !hideSidebar && currentScreen !== 'Login' && !currentScreen.includes('Onboarding');

  return (
    <View style={styles.webContainer}>
      {/* Background Aesthetic */}
      <View style={styles.webBackground}>
        <View style={[styles.glow, styles.glow1]} />
        <View style={[styles.glow, styles.glow2]} />
        <View style={styles.gridOverlay} />
      </View>

      {/* Sidebar - Desktop Only */}
      {showNav && (
        <View style={styles.sidebar}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>AEGESIS</Text>
            <View style={styles.logoDot} />
          </View>
          
          {/* Main Navigation */}
          <View style={styles.navSection}>
            {currentScreen.startsWith('Admin') || currentScreen === 'Weather' ? (
              <>
                <NavItem icon="tachometer-alt" label="Admin Dashboard" active={currentScreen === 'Admin' || currentScreen === 'Admin:Overview'} onPress={() => setScreen('Admin:Overview')} />
                <NavItem icon="users" label="Rider Fleet" active={currentScreen === 'Admin:Riders'} onPress={() => setScreen('Admin:Riders')} />
                <NavItem icon="warehouse" label="Hub Network" active={currentScreen === 'Admin:Hubs'} onPress={() => setScreen('Admin:Hubs')} />
                <NavItem icon="brain" label="Predictive Lab" active={currentScreen === 'Admin:Predictive'} onPress={() => setScreen('Admin:Predictive')} />
                <NavItem icon="file-invoice-dollar" label="Loss Analysis" active={currentScreen === 'Admin:LossAnalysis'} onPress={() => setScreen('Admin:LossAnalysis')} />
                <NavItem icon="user-shield" label="Security Insights" active={currentScreen === 'Admin:Security'} onPress={() => setScreen('Admin:Security')} />
                <NavItem icon="cloud-sun" label="Weather Intelligence" active={currentScreen === 'Weather'} onPress={() => setScreen('Weather')} />
                <NavItem icon="file-invoice-dollar" label="Claims Audit" />
                <NavItem icon="cog" label="System Settings" />
                <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 20 }}>
                   <NavItem icon="arrow-left" label="Back to Rider App" onPress={() => setScreen('Dashboard')} />
                </View>
              </>
            ) : (
              <>
                <NavItem icon="shield-alt" label="Shield Center" active={currentScreen === 'Dashboard'} onPress={() => setScreen('Dashboard')} />
                <NavItem icon="history" label="Settlements" active={currentScreen === 'TriggerStatus'} onPress={() => setScreen('TriggerStatus')} />
                <NavItem icon="chart-line" label="Market Risk" />
                <NavItem icon="user-shield" label="Security" active={currentScreen === 'FraudAlert'} onPress={() => setScreen('FraudAlert')} />
                <NavItem icon="user-circle" label="My Profile" active={currentScreen === 'Profile'} onPress={() => setScreen('Profile')} />
                <NavItem icon="satellite" label="Oracle Feed" />
              </>
            )}
          </View>

          <View style={styles.sidebarFooter}>
            <View style={styles.systemStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>ORACLE LIVE</Text>
            </View>
            <Text style={styles.versionText}>v2.4.0 Production</Text>
          </View>
        </View>
      )}

      {/* Main Content Area */}
      <View style={[styles.mainContent, !showNav && { paddingHorizontal: width * 0.1 }]}>
        <View style={[styles.contentWrapper, !showNav && { maxWidth: 1000 }]}>
          {!showNav && currentScreen === 'Login' ? (
            <View style={styles.splitLogin}>
              <View style={styles.loginHero}>
                <View style={[styles.glow, { opacity: 0.3, width: 400, height: 400 }]} />
                <FontAwesome5 name="shield-alt" size={80} color={colors.white} />
                <Text style={styles.heroTitle}>The Future of Delivery Protection</Text>
                <Text style={styles.heroSub}>AI-Powered Parametric Insurance for the Next Generation of Gig Workers.</Text>
                <View style={styles.featureList}>
                  <FeatureItem icon="bolt" text="Instant Oracle Payouts" />
                  <FeatureItem icon="microchip" text="Hyperlocal Risk Detection" />
                  <FeatureItem icon="shield-virus" text="Fraud Protection" />
                </View>
              </View>
              <View style={styles.loginFormContainer}>
                {children}
              </View>
            </View>
          ) : (
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={{ flexGrow: 1 }}
            >
              {children}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Right Panel - System Intelligence Ticker */}
      {showNav && (
        <View style={styles.rightPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Network Activity</Text>
            <TouchableOpacity>
              <FontAwesome5 name="sync" size={12} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <ActivityItem icon="cloud-showers-heavy" label="Payout Triggered" sub="Flood Detected in Sector 7" time="2m ago" type="alert" />
            <ActivityItem icon="database" label="Oracle Check" sub="IMD Data Synced" time="5m ago" />
            <ActivityItem icon="biohazard" label="Isolation Forest" sub="Anomalies 0.02%" time="12m ago" />
            <ActivityItem icon="home" label="New Hub Online" sub="HSR Layout - Zone Green" time="1h ago" />
            <ActivityItem icon="users" label="Social Signal" sub="Potential Strike in Sector 4" time="3h ago" type="warning" />
            <ActivityItem icon="shield-alt" label="Security Audit" sub="All systems nominal" time="5h ago" />
          </ScrollView>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active Coverage</Text>
            <Text style={styles.statValue}>₹45,280,000</Text>
            <View style={styles.statBar}>
              <View style={[styles.statFill, { width: '75%' }]} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function FeatureItem({ icon, text }) {
  return (
    <View style={styles.featureItem}>
      <FontAwesome5 name={icon} size={14} color={colors.accent} style={{ marginRight: 12, width: 20 }} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function NavItem({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.navItem, active && styles.navItemActive]}>
      <FontAwesome5 name={icon} size={16} color={active ? colors.white : 'rgba(255,255,255,0.4)'} style={styles.navIcon} />
      <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ActivityItem({ icon, label, sub, time, type }) {
  let color = colors.accent;
  if (type === 'alert') color = colors.danger;
  if (type === 'warning') color = colors.warning;

  return (
    <View style={styles.activityItem}>
      <View style={[styles.activityIconBox, { backgroundColor: color + '15' }]}>
        <FontAwesome5 name={icon} size={10} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.activityLabel}>{label}</Text>
        <Text style={styles.activitySub}>{sub}</Text>
      </View>
      <Text style={styles.activityTime}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  webBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC', 
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.03,
    backgroundColor: 'transparent',
    backgroundImage: `linear-gradient(90deg, #2099BA05 1px, transparent 1px), linear-gradient(#2099BA05 1px, transparent 1px)`,
    backgroundSize: '40px 40px',
  },
  glow: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    opacity: 0.15,
  },
  glow1: {
    top: -150,
    left: '20%',
    backgroundColor: '#2099BA',
  },
  glow2: {
    bottom: -150,
    right: '20%',
    backgroundColor: '#38BDF8',
  },
  sidebar: {
    width: 280,
    backgroundImage: 'linear-gradient(180deg, #134E5E 0%, #2099BA 100%)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    padding: 40,
    justifyContent: 'space-between',
    zIndex: 10,
    boxShadow: '10px 0 30px rgba(0,0,0,0.05)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 50,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '950',
    color: colors.white,
    letterSpacing: 3,
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginLeft: 6,
    marginTop: 10,
    shadowColor: colors.accent,
    shadowRadius: 10,
    shadowOpacity: 0.8,
  },
  navSection: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  navItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  navIcon: {
    width: 24,
    marginRight: 12,
  },
  navText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 15,
    fontWeight: '600',
  },
  navTextActive: {
    color: colors.white,
  },
  sidebarFooter: {
    marginTop: 'auto',
  },
  systemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.safety,
    marginRight: 8,
    shadowColor: colors.safety,
    shadowRadius: 4,
    shadowOpacity: 1,
  },
  statusText: {
    color: colors.safety,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 10,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 900, // Expanded for desktop dashboard look
    height: '100%',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  rightPanel: {
    width: 340,
    backgroundImage: 'linear-gradient(180deg, #2099BA 0%, #134E5E 100%)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    padding: 35,
    boxShadow: '-10px 0 30px rgba(0,0,0,0.05)',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  panelTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activityIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  activityLabel: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  activitySub: {
    color: 'rgba(248, 250, 252, 0.4)',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  activityTime: {
    color: 'rgba(248, 250, 252, 0.25)',
    fontSize: 10,
    marginLeft: 8,
    fontWeight: '500',
  },
  statCard: {
    marginTop: 'auto',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  statBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  statFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  // Split Login Styles
  splitLogin: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  loginHero: {
    flex: 1.2,
    backgroundColor: colors.vibrant,
    padding: 60,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  loginFormContainer: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 40,
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.white,
    marginTop: 30,
    lineHeight: 42,
  },
  heroSub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 15,
    lineHeight: 24,
    marginBottom: 40,
  },
  featureList: {
    gap: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
