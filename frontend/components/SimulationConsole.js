import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import colors from '../theme/colors';

const REAL_WORLD_TRIGGERS = [
  { 
    id: 'imd-weather', 
    name: 'IMD Severe Weather', 
    source: 'imd_weather_api', 
    desc: 'Simulate >60mm continuous rain or flash flood event matching rider radius.', 
    icon: 'cloud-showers-heavy', 
    color: '#0077B6',
    category: 'CATEGORY A'
  },
  { 
    id: 'imd-heat', 
    name: 'IMD Extreme Heat', 
    source: 'imd_heat_api', 
    desc: 'Simulate >45°C urban heatwave alert trigger.', 
    icon: 'temperature-high', 
    color: '#E63946',
    category: 'CATEGORY A'
  },
  { 
    id: 'news-disruption', 
    name: 'News NLP Strike', 
    source: 'news_nlp_api', 
    desc: 'Simulate socio-political disruption (strikes/protests) detected via NLP.', 
    icon: 'fist-raised', 
    color: '#F4A261',
    category: 'CATEGORY B'
  },
  { 
    id: 'platform-status', 
    name: 'Platform App Outage', 
    source: 'zepto_oracle', 
    desc: 'Simulate Zepto/Blinkit application suspension in specific pincode.', 
    icon: 'mobile-alt', 
    color: '#E63946',
    category: 'CATEGORY B'
  },
];

export default function SimulationConsole({ visible, onClose, onTrigger, onReset }) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
        
        <View style={styles.consoleContainer}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Simulation Centre</Text>
              <Text style={styles.subtitle}>Test system response in real environments</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <FontAwesome5 name="times" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.resetSimulationBtn} onPress={onReset}>
            <FontAwesome5 name="undo-alt" size={14} color={colors.vibrant} />
            <Text style={styles.resetSimulationText}>Reset Simulation (Return all to GREEN)</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <View style={styles.warningBox}>
              <FontAwesome5 name="info-circle" size={14} color={colors.warning} />
              <Text style={styles.warningText}>
                Simulation mode bypasses real weather sensors to test payout logic and fraud isolation.
              </Text>
            </View>

            {REAL_WORLD_TRIGGERS.map((trigger) => (
              <TouchableOpacity 
                key={trigger.id} 
                style={styles.triggerCard} 
                onPress={() => onTrigger(trigger.id)}
              >
                <View style={[styles.iconBox, { backgroundColor: trigger.color + '20' }]}>
                  <FontAwesome5 name={trigger.icon} size={22} color={trigger.color} />
                </View>
                
                <View style={styles.info}>
                  <View style={styles.metaRow}>
                    <Text style={styles.catText}>{trigger.category}</Text>
                    <Text style={styles.sourceText}>{trigger.source}</Text>
                  </View>
                  <Text style={styles.triggerName}>{trigger.name}</Text>
                  <Text style={styles.triggerDesc}>{trigger.desc}</Text>
                </View>
                
                <View style={styles.fireBtn}>
                  <Text style={styles.fireText}>FIRE</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>System Status: <Text style={{ color: colors.safety }}>ONLINE</Text></Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  consoleContainer: {
    height: '80%',
    backgroundColor: '#0A1628',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingBottom: 30,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(244,162,97,0.08)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(244,162,97,0.15)',
  },
  warningText: {
    flex: 1,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 18,
  },
  triggerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  catText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  sourceText: {
    color: colors.vibrant,
    fontSize: 9,
    fontWeight: 'bold',
  },
  triggerName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  triggerDesc: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  fireBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(230,57,70,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(230,57,70,0.3)',
  },
  fireText: {
    color: '#E63946',
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  resetSimulationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,119,182,0.1)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,119,182,0.2)',
    marginHorizontal: 4,
  },
  resetSimulationText: {
    color: colors.vibrant,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
