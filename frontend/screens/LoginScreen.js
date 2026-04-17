import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Animated,
  KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
  TouchableOpacity, useWindowDimensions, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import GlassCard from '../components/GlassCard';
import AnimatedButton from '../components/AnimatedButton';
import colors from '../theme/colors';
import api from '../services/api';

const GENERATED_OTP = '1234'; // Simulated OTP for demo

export default function LoginScreen({ setScreen, setRiderContext }) {
  // Steps: 1 = phone input, 2 = OTP verify, 3 = verifying (loader), 4 = success
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [foundRider, setFoundRider] = useState(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const tickAnim = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;

  // OTP input refs
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  // Animate card transitions
  useEffect(() => {
    cardFade.setValue(0);
    Animated.timing(cardFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [step]);

  const handleSendOTP = () => {
    setError('');
    if (phone.length !== 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }
    setStep(2);
    setTimeout(() => otpRefs[0].current?.focus(), 300);
  };

  const handleOTPChange = (value, index) => {
    const newOtp = [...otp];
    if (value === '' && index > 0) {
      newOtp[index] = '';
      setOtp(newOtp);
      otpRefs[index - 1].current?.focus();
      return;
    }
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
    if (index === 3 && value) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleVerifyOTP = async (fullOtp) => {
    setError('');
    if (fullOtp !== GENERATED_OTP) {
      setError('Invalid OTP. Try 1234 for demo.');
      setOtp(['', '', '', '']);
      setTimeout(() => otpRefs[0].current?.focus(), 200);
      return;
    }
    // OTP valid — lookup rider by phone
    setStep(3);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    // Call live Postgres Backend via API
    const response = await api.loginByPhone(phone);

    if (response && response.status === 'found') {
      setFoundRider({
         rider_id: response.rider_id || response.id,
         name: response.name,
         hub_name: response.hub_name,
         zone_category: response.zone_category ? response.zone_category.toLowerCase() : 'green',
         platform: 'Zepto',
         dpdt_pct: response.dpdt !== undefined ? response.dpdt : 100,
         hourly_wage: response.hourly_wage || 120, // Default UI est
      });
      setStep(4);
      Animated.spring(tickAnim, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }).start();
    } else {
      // Phone not registered → redirect to registration with phone pre-filled
      setStep(5); // not-found step
    }
  };

  const handleContinue = () => {
    if (foundRider) {
      setRiderContext({
        rider_id: foundRider.rider_id,
        name: foundRider.name,
        hub: foundRider.hub_name,
        zone: foundRider.zone_category,
        platform: foundRider.platform,
        dpdt: foundRider.dpdt_pct,
        hourly_wage: foundRider.hourly_wage,
      });
      setScreen('Dashboard');
    }
  };

  const handleGoToRegister = () => {
    // Navigate to Onboarding (Registration) with the phone pre-filled
    setScreen('Onboarding:' + phone);
  };

  const ZONE_DISPLAY = {
    green:  { emoji: '🟢', label: 'Green Zone', color: colors.zoneGreen },
    orange: { emoji: '🟠', label: 'Orange Zone', color: colors.zoneOrange },
    red:    { emoji: '🔴', label: 'Red Zone', color: colors.zoneRed },
  };

  const { width } = useWindowDimensions();
  const isDesktop = width > 1024 && Platform.OS === 'web';

  const LoginContent = (
    <KeyboardAvoidingView style={[styles.inner, isDesktop && styles.webInner]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

          {/* Logo */}
          <Animated.View style={[styles.logoContainer, {
            opacity: fadeAnim,
            transform: [{ scale: logoScale }],
          }]}>
            <View style={styles.radialGlow} />
            <FontAwesome5 name="shield-alt" size={56} color={colors.primary} />
            <Text style={styles.logoText}>AEGESIS</Text>
            <Text style={styles.logoSub}>Q-Commerce Insurance</Text>
          </Animated.View>

          {/* Step 1: Phone Input */}
          {step === 1 && (
            <Animated.View style={{ opacity: cardFade }}>
              <GlassCard animate={false} style={styles.card}>
                <Text style={styles.cardTitle}>Welcome Back</Text>
                <Text style={styles.cardSub}>Enter your registered phone number</Text>

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
                    autoFocus
                  />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.hintRow}>
                  <FontAwesome5 name="info-circle" size={11} color={colors.textMuted} />
                  <Text style={styles.hintText}>Demo phones: 9876543210, 9123456789, 9988776655</Text>
                </View>

                <AnimatedButton onPress={handleSendOTP} gradientColors={[colors.vibrant, '#005fa3']}>
                  <FontAwesome5 name="paper-plane" size={16} color={colors.white} style={{ marginRight: 10 }} />
                  <Text style={styles.buttonText}>Send OTP</Text>
                </AnimatedButton>
              </GlassCard>

              {/* Sign up link */}
              <TouchableOpacity onPress={() => setScreen('Onboarding')} style={styles.signupLinkContainer}>
                <Text style={styles.signupText}>New rider? </Text>
                <Text style={styles.signupLink}>Create an account</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <Animated.View style={{ opacity: cardFade }}>
              <GlassCard animate={false} style={styles.card}>
                <View style={styles.otpIconContainer}>
                  <FontAwesome5 name="sms" size={28} color={colors.vibrant} />
                </View>
                <Text style={styles.cardTitle}>Verify OTP</Text>
                <Text style={styles.cardSub}>
                  A 4-digit code was sent to{'\n'}
                  <Text style={styles.phoneHighlight}>+91 {phone}</Text>
                </Text>

                <View style={styles.otpRow}>
                  {otp.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={otpRefs[i]}
                      style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                      value={digit}
                      onChangeText={(v) => handleOTPChange(v, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                    />
                  ))}
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.hintRow}>
                  <FontAwesome5 name="key" size={11} color={colors.textMuted} />
                  <Text style={styles.hintText}>Demo OTP: 1234</Text>
                </View>

                <TouchableOpacity onPress={() => { setStep(1); setOtp(['', '', '', '']); setError(''); }}>
                  <Text style={styles.changePhone}>← Change phone number</Text>
                </TouchableOpacity>
              </GlassCard>
            </Animated.View>
          )}

          {/* Step 3: Verifying / Looking up rider */}
          {step === 3 && (
            <Animated.View style={[styles.verifyingContainer, { opacity: cardFade }]}>
              <Animated.View style={[styles.loaderCircle, { transform: [{ scale: pulseAnim }] }]}>
                <FontAwesome5 name="user-check" size={32} color={colors.vibrant} />
              </Animated.View>
              <Text style={styles.verifyingTitle}>Verifying Identity</Text>
              <Text style={styles.verifyingSub}>Looking up rider profile...</Text>
            </Animated.View>
          )}

          {/* Step 4: Rider Found — Success Card */}
          {step === 4 && foundRider && (
            <Animated.View style={{ opacity: cardFade }}>
              <View style={styles.successHeader}>
                <Animated.View style={{ transform: [{ scale: tickAnim }] }}>
                  <View style={styles.successGlow}>
                    <FontAwesome5 name="check-circle" size={52} color={colors.safety} />
                  </View>
                </Animated.View>
                <Text style={styles.successTitle}>Welcome, {foundRider.name}!</Text>
                <Text style={styles.successSub}>Rider profile loaded successfully</Text>
              </View>

              <GlassCard style={styles.riderCard}>
                <View style={styles.riderRow}>
                  <Text style={styles.riderLabel}>Rider ID</Text>
                  <Text style={styles.riderValue}>{foundRider.rider_id}</Text>
                </View>
                <View style={styles.riderRow}>
                  <Text style={styles.riderLabel}>Hub</Text>
                  <Text style={styles.riderValue}>{foundRider.hub_name}</Text>
                </View>
                <View style={styles.riderRow}>
                  <Text style={styles.riderLabel}>Platform</Text>
                  <Text style={styles.riderValue}>{foundRider.platform}</Text>
                </View>
                <View style={styles.riderRow}>
                  <Text style={styles.riderLabel}>Zone</Text>
                  <View style={styles.zonePill}>
                    <Text style={[styles.zonePillText, { color: ZONE_DISPLAY[foundRider.zone_category].color }]}>
                      {ZONE_DISPLAY[foundRider.zone_category].emoji} {ZONE_DISPLAY[foundRider.zone_category].label}
                    </Text>
                  </View>
                </View>
                <View style={styles.riderRow}>
                  <Text style={styles.riderLabel}>DPDT Score</Text>
                  <Text style={[styles.riderValue, { color: colors.safety, fontWeight: 'bold' }]}>{foundRider.dpdt_pct}%</Text>
                </View>
                <View style={[styles.riderRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.riderLabel}>Hourly Wage</Text>
                  <Text style={styles.riderValue}>₹{foundRider.hourly_wage}/hr</Text>
                </View>
              </GlassCard>

              <AnimatedButton onPress={handleContinue} gradientColors={[colors.safety, '#1fa0a0']} style={{ marginTop: 8 }}>
                <FontAwesome5 name="tachometer-alt" size={16} color={colors.white} style={{ marginRight: 10 }} />
                <Text style={styles.buttonText}>Go to Dashboard</Text>
              </AnimatedButton>
            </Animated.View>
          )}

          {/* Step 5: Phone Not Registered */}
          {step === 5 && (
            <Animated.View style={{ opacity: cardFade }}>
              <GlassCard animate={false} style={styles.card}>
                <View style={styles.notFoundIcon}>
                  <FontAwesome5 name="user-plus" size={32} color={colors.warning} />
                </View>
                <Text style={styles.cardTitle}>Phone Not Registered</Text>
                <Text style={styles.cardSub}>
                  No rider found for{'\n'}
                  <Text style={styles.phoneHighlight}>+91 {phone}</Text>
                  {'\n'}Would you like to create a new account?
                </Text>

                <AnimatedButton onPress={handleGoToRegister} gradientColors={[colors.vibrant, '#005fa3']}>
                  <FontAwesome5 name="user-plus" size={16} color={colors.white} style={{ marginRight: 10 }} />
                  <Text style={styles.buttonText}>Register as New Rider</Text>
                </AnimatedButton>

                <TouchableOpacity 
                  onPress={() => { setStep(1); setOtp(['', '', '', '']); setError(''); setPhone(''); }}
                  style={{ marginTop: 16 }}
                >
                  <Text style={styles.changePhone}>← Try a different number</Text>
                </TouchableOpacity>
              </GlassCard>
            </Animated.View>
          )}

        </KeyboardAvoidingView>
  );

  if (isDesktop) {
    return LoginContent;
  }

  const Wrapper = Platform.OS === 'web' ? View : TouchableWithoutFeedback;
  const wrapperProps = Platform.OS === 'web' ? { style: { flex: 1 } } : { onPress: Keyboard.dismiss };

  return (
    <Wrapper {...wrapperProps}>
      <LinearGradient colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]} style={styles.container}>
        {LoginContent}
      </LinearGradient>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  webInner: { padding: 0 },

  // Logo
  logoContainer: { alignItems: 'center', marginBottom: 36 },
  radialGlow: {
    position: 'absolute', width: 110, height: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 55,
    shadowColor: colors.white, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 35, elevation: 12,
  },
  logoText: { fontSize: 32, fontWeight: 'bold', color: colors.primary, marginTop: 10, letterSpacing: 3 },
  logoSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, letterSpacing: 1 },

  // Card shared
  card: { padding: 24, alignItems: 'center' },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 6 },
  cardSub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 22, lineHeight: 19 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },

  // Phone input
  phoneRow: { flexDirection: 'row', width: '100%', marginBottom: 14 },
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

  // OTP
  otpIconContainer: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(0, 119, 182, 0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  otpRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 14, width: '100%',
  },
  otpBox: {
    width: 56, height: 62, borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1.5, borderColor: 'rgba(26, 58, 92, 0.12)',
    textAlign: 'center', fontSize: 24, fontWeight: 'bold',
    color: colors.primary,
  },
  otpBoxFilled: {
    borderColor: colors.vibrant,
    backgroundColor: 'rgba(0, 119, 182, 0.06)',
    shadowColor: colors.vibrant, shadowOpacity: 0.15, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  phoneHighlight: { fontWeight: 'bold', color: colors.primary },
  changePhone: { fontSize: 13, color: colors.vibrant, fontWeight: '600', marginTop: 8 },

  // Hints & errors
  hintRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 18, paddingHorizontal: 4,
  },
  hintText: { fontSize: 11, color: colors.textMuted, fontStyle: 'italic' },
  errorText: {
    fontSize: 12, color: colors.danger, fontWeight: '600',
    textAlign: 'center', marginBottom: 10,
  },

  // Signup link
  signupLinkContainer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginTop: 20,
  },
  signupText: { fontSize: 14, color: colors.textSecondary },
  signupLink: { fontSize: 14, color: colors.vibrant, fontWeight: 'bold' },

  // Verifying loader
  verifyingContainer: { alignItems: 'center' },
  loaderCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(0, 119, 182, 0.15)',
    shadowColor: colors.vibrant, shadowOpacity: 0.2, shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
    marginBottom: 18,
  },
  verifyingTitle: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  verifyingSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  // Success
  successHeader: { alignItems: 'center', marginBottom: 20 },
  successGlow: {
    shadowColor: colors.safety, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 10, marginBottom: 10,
  },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: colors.primary, letterSpacing: 0.3 },
  successSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  // Not found
  notFoundIcon: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(244, 162, 97, 0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    borderWidth: 2, borderColor: 'rgba(244, 162, 97, 0.2)',
  },

  // Rider card
  riderCard: { padding: 16, marginBottom: 14 },
  riderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(26, 58, 92, 0.08)',
  },
  riderLabel: { fontSize: 13, color: colors.primary, opacity: 0.5, fontWeight: '500' },
  riderValue: { fontSize: 13, color: colors.primary, fontWeight: 'bold' },
  zonePill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  zonePillText: { fontSize: 12, fontWeight: 'bold' },
});
