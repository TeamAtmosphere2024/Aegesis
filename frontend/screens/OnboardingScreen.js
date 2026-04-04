import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Animated,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import AnimatedButton from '../components/AnimatedButton';
import ZoneBadge from '../components/ZoneBadge';
import colors from '../theme/colors';
import api from '../services/api';
import * as Location from 'expo-location';

// ML Model 0 takes care of this dynamically via the backend! 

const ZONE_INFO = {
  green:  { emoji: '🟢', label: 'Green Zone', color: colors.zoneGreen, risk: 'Low risk area', coverage: '50%' },
  orange: { emoji: '🟠', label: 'Orange Zone', color: colors.zoneOrange, risk: 'Moderate risk area', coverage: '45%' },
  red:    { emoji: '🔴', label: 'Red Zone', color: colors.zoneRed, risk: 'High risk area', coverage: '35%' },
};

export default function OnboardingScreen({ setScreen, setRiderContext, prefillPhone }) {
  // Steps: 1 = name+phone form, 2 = GPS access, 3 = detecting hub, 4 = hub found confirmation
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(prefillPhone || '');
  const [error, setError] = useState('');
  const [assignedHub, setAssignedHub] = useState(null);
  const [detectPhase, setDetectPhase] = useState('gps');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const hubRevealAnim = useRef(new Animated.Value(0)).current;
  const tickAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    cardFade.setValue(0);
    Animated.timing(cardFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [step]);

  const handleContinue = () => {
    setError('');
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (phone.length !== 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }
    // Move to GPS access step
    setStep(2);
  };

  const handleGrantGPS = async () => {
    // Request hardware permission
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission to access location was denied. Aegesis requires GPS to operate.');
      setStep(1); // kick back so they see the error
      return;
    }
    
    // Fetch live device coordinates
    try {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setStep(3);
      startDetection(location.coords.latitude, location.coords.longitude);
    } catch (err) {
      setError('Could not fetch GPS. Please ensure your location services are turned on.');
      setStep(1);
    }
  };

  const startDetection = async (real_lat, real_lon) => {
    // 1. We now use the real hardware GPS coordinates!
    setDetectPhase('gps');
    Animated.timing(progressAnim, { toValue: 33, duration: 1200, useNativeDriver: false }).start();

    // Radar pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    // Call ML Backend Model 0
    const liveHubData = await api.fetchClosestHub(real_lat, real_lon);

    setDetectPhase('hub');
    Animated.timing(progressAnim, { toValue: 66, duration: 1000, useNativeDriver: false }).start();

    setTimeout(() => {
      setDetectPhase('zone');
      Animated.timing(progressAnim, { toValue: 100, duration: 800, useNativeDriver: false }).start();
    }, 1000);

    setTimeout(() => {
      // Detection complete — map real data to UI format
      setAssignedHub({
         hub_name: liveHubData?.hub_name || 'Unknown Hub',
         zone: liveHubData?.current_zone?.toLowerCase() || 'green',
         distance_km: liveHubData?.distance_km || 0.0,
         platform: 'Zepto', // Because our datase is entirely Zepto lines currently
         coords: { lat: real_lat, lng: real_lon },
      });
      setDetectPhase('done');
      setStep(4);
      // Animate hub card reveal
      Animated.spring(hubRevealAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
      Animated.spring(tickAnim, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }).start();
    }, 2000);
  };

  const handleActivate = async () => {
    if (!assignedHub) return;

    // Build the payload mapping exactly to the backend's RiderCreate Pydantic schema
    const payload = {
      name: name.trim(),
      phone: phone,
      zone_risk: 0.55,      // Generic Base Risk for new accounts
      lat: assignedHub.coords.lat,
      lon: assignedHub.coords.lng,
      dpdt: 100.0,          // Perfect DPDT score for brand new accounts
    };

    // 1. Send to Backend Database
    const newRider = await api.registerRider(payload);

    if (newRider && !newRider.error) {
      // 2. Set UI Context to use actual Database Data + the auto-assigned hub logic from Model 0
      setRiderContext({
        rider_id: newRider.id || assignedHub.rider_id,
        name: newRider.name,
        hub: newRider.hub_name || assignedHub.hub_name,
        zone: newRider.zone_category ? newRider.zone_category.toLowerCase() : assignedHub.zone,
        platform: assignedHub.platform,
        dpdt: newRider.dpdt_pct !== undefined ? newRider.dpdt_pct : 100, 
        hourly_wage: 120, // Default estimated wage for frontend rendering
      });
      setScreen('Dashboard');
    } else {
      let errorMessage = "Failed to register. Please try again.";
      if (newRider && newRider.error) {
        // If it says "Phone number already registered", make it user-facing
        if (newRider.error.includes("Phone number already")) {
           errorMessage = "This phone number is already registered! Please login instead.";
        } else {
           errorMessage = newRider.error;
        }
      }
      setError(errorMessage);
      setStep(1); // go back to the first step so the user can fix the input and see the error
    }
  };

  const DETECT_PHASES = {
    gps:  { icon: 'satellite', text: 'Acquiring GPS signal...', color: colors.vibrant },
    hub:  { icon: 'store', text: 'Model 0: Clustering to nearest hub...', color: colors.warning },
    zone: { icon: 'map-marked-alt', text: 'Classifying risk zone...', color: colors.safety },
    done: { icon: 'check-circle', text: 'Hub detected!', color: colors.safety },
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <LinearGradient colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]} style={styles.container}>
        <KeyboardAvoidingView style={styles.inner} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

          {/* Step 1: Name + Phone Registration Form */}
          {step === 1 && (
            <Animated.View style={{ opacity: cardFade, flex: 1, justifyContent: 'center' }}>
              {/* Header */}
              <View style={styles.headerSection}>
                <View style={styles.iconCircle}>
                  <FontAwesome5 name="user-plus" size={28} color={colors.vibrant} />
                </View>
                <Text style={styles.screenTitle}>Create Account</Text>
                <Text style={styles.screenSub}>Join Aegesis in under 30 seconds</Text>
              </View>

              <GlassCard animate={false} style={styles.formCard}>
                {/* Full Name */}
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputContainer}>
                  <FontAwesome5 name="user" size={14} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={name}
                    onChangeText={(t) => { setName(t); setError(''); }}
                    placeholder="e.g. Arjun Kumar"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    autoFocus={!prefillPhone}
                  />
                </View>

                {/* Phone Number */}
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Phone Number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    value={phone}
                    onChangeText={(t) => { setPhone(t.replace(/[^0-9]/g, '').slice(0, 10)); setError(''); }}
                    placeholder="9876543210"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                    autoFocus={!!prefillPhone}
                  />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.infoBox}>
                  <FontAwesome5 name="info-circle" size={12} color={colors.vibrant} />
                  <Text style={styles.infoText}>
                    Your hub and zone will be auto-detected via GPS. No manual selection needed.
                  </Text>
                </View>

                <AnimatedButton onPress={handleContinue} gradientColors={[colors.vibrant, '#005fa3']}>
                  <Text style={styles.buttonText}>Continue</Text>
                  <FontAwesome5 name="arrow-right" size={14} color={colors.white} style={{ marginLeft: 10 }} />
                </AnimatedButton>
              </GlassCard>

              {/* Already have account */}
              <TouchableOpacity onPress={() => setScreen('Login')} style={styles.loginLinkContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Step 2: GPS Access Request */}
          {step === 2 && (
            <Animated.View style={{ opacity: cardFade, flex: 1, justifyContent: 'center' }}>
              <View style={styles.gpsSection}>
                <View style={styles.gpsIconOuter}>
                  <View style={styles.gpsIconInner}>
                    <FontAwesome5 name="map-marker-alt" size={40} color={colors.vibrant} />
                  </View>
                </View>

                <Text style={styles.gpsTitle}>Enable Location</Text>
                <Text style={styles.gpsSub}>
                  Aegesis needs your location to automatically detect your nearest Q-Commerce hub and assign your risk zone.
                </Text>

                <GlassCard style={styles.permissionCard}>
                  <View style={styles.permRow}>
                    <FontAwesome5 name="store" size={14} color={colors.warning} />
                    <Text style={styles.permText}>Auto-detect nearest dark store hub</Text>
                  </View>
                  <View style={styles.permRow}>
                    <FontAwesome5 name="map-marked-alt" size={14} color={colors.safety} />
                    <Text style={styles.permText}>Classify your Green / Orange / Red zone</Text>
                  </View>
                  <View style={[styles.permRow, { borderBottomWidth: 0 }]}>
                    <FontAwesome5 name="broadcast-tower" size={14} color={colors.vibrant} />
                    <Text style={styles.permText}>Stream GPS for trigger verification</Text>
                  </View>
                </GlassCard>

                <AnimatedButton onPress={handleGrantGPS} gradientColors={[colors.vibrant, '#005fa3']}>
                  <FontAwesome5 name="location-arrow" size={16} color={colors.white} style={{ marginRight: 10 }} />
                  <Text style={styles.buttonText}>Grant Location Access</Text>
                </AnimatedButton>

                <TouchableOpacity onPress={() => setStep(1)} style={{ marginTop: 14 }}>
                  <Text style={styles.backLink}>← Back</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Step 3: Detecting Hub (Animated 3-phase) */}
          {step === 3 && (
            <Animated.View style={[styles.detectContainer, { opacity: cardFade }]}>
              {/* Radar pulse */}
              <View style={styles.radarContainer}>
                <Animated.View style={[styles.radarRing3, { transform: [{ scale: pulseAnim }] }]} />
                <Animated.View style={[styles.radarRing2, { transform: [{ scale: pulseAnim }], opacity: 0.5 }]} />
                <View style={styles.radarCenter}>
                  <FontAwesome5 
                    name={DETECT_PHASES[detectPhase].icon} 
                    size={28} 
                    color={DETECT_PHASES[detectPhase].color} 
                  />
                </View>
              </View>

              <Text style={styles.detectTitle}>Detecting Your Hub</Text>
              <Text style={[styles.detectPhaseText, { color: DETECT_PHASES[detectPhase].color }]}>
                {DETECT_PHASES[detectPhase].text}
              </Text>

              {/* Progress bar */}
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, {
                  width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                }]}>
                  <LinearGradient 
                    colors={[colors.vibrant, colors.safety]} 
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.progressGradient} 
                  />
                </Animated.View>
              </View>

              {/* Detection steps */}
              <View style={styles.stepsColumn}>
                {[
                  { key: 'gps', label: 'GPS Signal', sub: `${assignedHub?.coords?.lat?.toFixed(4) || '13.0827'}°N, ${assignedHub?.coords?.lng?.toFixed(4) || '80.2707'}°E` },
                  { key: 'hub', label: 'Model 0 — Hub Match', sub: `${assignedHub?.hub_name || 'Loading...'} (${assignedHub?.distance_km}km)` },
                  { key: 'zone', label: 'Zone Classification', sub: `Assigned: ${assignedHub?.zone?.toUpperCase() || 'GREEN'}` },
                ].map((item, i) => {
                  const isActive = ['gps', 'hub', 'zone', 'done'].indexOf(detectPhase) >= i;
                  const isDone = ['gps', 'hub', 'zone', 'done'].indexOf(detectPhase) > i;
                  return (
                    <View key={item.key} style={styles.stepRow}>
                      <View style={[styles.stepDot, { 
                        backgroundColor: isDone ? colors.safety : isActive ? colors.vibrant : 'rgba(26,58,92,0.15)' 
                      }]}>
                        {isDone && <FontAwesome5 name="check" size={8} color={colors.white} />}
                      </View>
                      <View style={styles.stepInfo}>
                        <Text style={[styles.stepLabel, isActive && { color: colors.primary, opacity: 1 }]}>
                          {item.label}
                        </Text>
                        {(isDone || isActive) && (
                          <Text style={styles.stepSub} numberOfLines={1}>{item.sub}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Step 4: Hub Detected — Confirmation */}
          {step === 4 && assignedHub && (
            <Animated.View style={{ opacity: cardFade, flex: 1, justifyContent: 'center' }}>
              {/* Success header */}
              <View style={styles.hubFoundHeader}>
                <Animated.View style={{ transform: [{ scale: tickAnim }] }}>
                  <View style={styles.hubFoundGlow}>
                    <FontAwesome5 name="check-circle" size={52} color={colors.safety} />
                  </View>
                </Animated.View>
                <Text style={styles.hubFoundTitle}>
                  {assignedHub.hub_name.split(' - ')[1]} Hub Detected!
                </Text>
                <Text style={styles.hubFoundSub}>
                  <FontAwesome5 name="store" size={11} color={colors.warning} />  {assignedHub.hub_name}
                </Text>
              </View>

              {/* Rider details card */}
              <Animated.View style={{ transform: [{ scale: hubRevealAnim }] }}>
                <GlassCard style={styles.confirmCard}>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Rider</Text>
                    <Text style={styles.confirmValue}>{name}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Phone</Text>
                    <Text style={styles.confirmValue}>+91 {phone}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>GPS</Text>
                    <Text style={styles.confirmValue}>{assignedHub.coords.lat}°N, {assignedHub.coords.lng}°E</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Nearest Hub</Text>
                    <Text style={[styles.confirmValue, { color: colors.vibrant }]}>{assignedHub.hub_name}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Distance</Text>
                    <Text style={[styles.confirmValue, { color: colors.safety }]}>{assignedHub.distance_km}km away</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Platform</Text>
                    <Text style={styles.confirmValue}>{assignedHub.platform}</Text>
                  </View>
                  <View style={[styles.confirmRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.confirmLabel}>Zone</Text>
                    <ZoneBadge zone={assignedHub.zone} compact showCoverage={false} />
                  </View>
                </GlassCard>
              </Animated.View>

              {/* Zone info callout */}
              <View style={[styles.zoneCallout, { borderLeftColor: ZONE_INFO[assignedHub.zone].color }]}>
                <Text style={styles.zoneCalloutText}>
                  {ZONE_INFO[assignedHub.zone].emoji} {ZONE_INFO[assignedHub.zone].label} — {ZONE_INFO[assignedHub.zone].risk}
                </Text>
                <Text style={styles.zoneCalloutSub}>
                  Coverage: {ZONE_INFO[assignedHub.zone].coverage} · DPDT: 100% (new rider bonus)
                </Text>
              </View>

              <AnimatedButton onPress={handleActivate} gradientColors={[colors.safety, '#1fa0a0']}>
                <FontAwesome5 name="rocket" size={16} color={colors.white} style={{ marginRight: 10 }} />
                <Text style={styles.buttonText}>Activate Shield</Text>
              </AnimatedButton>
            </Animated.View>
          )}

        </KeyboardAvoidingView>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: 20 },

  // Header
  headerSection: { alignItems: 'center', marginBottom: 24 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0, 119, 182, 0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    borderWidth: 2, borderColor: 'rgba(0, 119, 182, 0.12)',
  },
  screenTitle: { fontSize: 26, fontWeight: 'bold', color: colors.primary, letterSpacing: 0.3 },
  screenSub: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },

  // Form card
  formCard: { padding: 22 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 6, opacity: 0.7 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(26, 58, 92, 0.1)',
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  textInput: {
    flex: 1, paddingVertical: 14,
    fontSize: 16, fontWeight: '600', color: colors.primary,
  },
  phoneRow: { flexDirection: 'row', marginBottom: 14 },
  countryCode: {
    backgroundColor: 'rgba(26, 58, 92, 0.06)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(26, 58, 92, 0.1)',
    marginRight: 8,
  },
  countryCodeText: { fontSize: 16, fontWeight: '700', color: colors.primary, letterSpacing: 1 },
  phoneInput: {
    flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 18, fontWeight: '600', color: colors.primary,
    borderWidth: 1, borderColor: 'rgba(26, 58, 92, 0.1)',
    letterSpacing: 2,
  },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(0, 119, 182, 0.04)',
    borderRadius: 10, padding: 12, marginBottom: 18,
    borderWidth: 1, borderColor: 'rgba(0, 119, 182, 0.08)',
  },
  infoText: { flex: 1, fontSize: 11, color: colors.textSecondary, lineHeight: 16 },

  errorText: {
    fontSize: 12, color: colors.danger, fontWeight: '600',
    textAlign: 'center', marginBottom: 10,
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },

  // Login link
  loginLinkContainer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20,
  },
  loginText: { fontSize: 14, color: colors.textSecondary },
  loginLink: { fontSize: 14, color: colors.vibrant, fontWeight: 'bold' },

  // GPS Access
  gpsSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gpsIconOuter: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(0, 119, 182, 0.06)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    borderWidth: 2, borderColor: 'rgba(0, 119, 182, 0.1)',
  },
  gpsIconInner: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: colors.vibrant, shadowOpacity: 0.2, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  gpsTitle: { fontSize: 24, fontWeight: 'bold', color: colors.primary, marginBottom: 8 },
  gpsSub: {
    fontSize: 13, color: colors.textSecondary, textAlign: 'center',
    lineHeight: 19, paddingHorizontal: 20, marginBottom: 24,
  },
  permissionCard: { padding: 16, marginBottom: 24, width: '100%' },
  permRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(26, 58, 92, 0.06)',
  },
  permText: { fontSize: 13, color: colors.primary, fontWeight: '500', flex: 1 },
  backLink: { fontSize: 13, color: colors.vibrant, fontWeight: '600' },

  // Detection
  detectContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  radarContainer: {
    width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  radarRing3: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, borderColor: colors.vibrant + '20',
  },
  radarRing2: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: colors.vibrant + '30',
  },
  radarCenter: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
    elevation: 4, shadowColor: colors.vibrant, shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  detectTitle: { fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 6 },
  detectPhaseText: { fontSize: 13, fontWeight: '600', marginBottom: 20 },

  progressTrack: {
    width: '80%', height: 6, borderRadius: 3,
    backgroundColor: 'rgba(26, 58, 92, 0.08)', overflow: 'hidden', marginBottom: 28,
  },
  progressFill: { height: '100%', borderRadius: 3, overflow: 'hidden' },
  progressGradient: { flex: 1 },

  stepsColumn: { width: '80%' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  stepDot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2,
  },
  stepInfo: { flex: 1 },
  stepLabel: { fontSize: 14, fontWeight: '600', color: colors.primary, opacity: 0.4 },
  stepSub: { fontSize: 11, color: colors.primary, opacity: 0.45, marginTop: 2 },

  // Hub Found Confirmation
  hubFoundHeader: { alignItems: 'center', marginBottom: 18 },
  hubFoundGlow: {
    shadowColor: colors.safety, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 10, marginBottom: 8,
  },
  hubFoundTitle: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  hubFoundSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  confirmCard: { padding: 16, marginBottom: 12 },
  confirmRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(26, 58, 92, 0.08)',
  },
  confirmLabel: { fontSize: 12, color: colors.primary, opacity: 0.5, fontWeight: '500' },
  confirmValue: { fontSize: 12, color: colors.primary, fontWeight: 'bold', maxWidth: '60%', textAlign: 'right' },

  zoneCallout: {
    borderLeftWidth: 3, backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 16,
  },
  zoneCalloutText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  zoneCalloutSub: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
});
