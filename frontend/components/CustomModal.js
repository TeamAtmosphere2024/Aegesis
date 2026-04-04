import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Animated } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import colors from '../theme/colors';
import * as Haptics from 'expo-haptics';

export default function CustomModal({ visible, title, description, onClose }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 300, useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={[styles.modalBox, { opacity: fadeAnim }]}>
          <FontAwesome5 name="exclamation-triangle" size={36} color={colors.danger} style={{ marginBottom: 14 }} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.desc}>{description}</Text>
          
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Acknowledge</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(26, 58, 92, 0.5)',
  },
  modalBox: {
    width: '85%',
    backgroundColor: colors.white,
    padding: 28,
    borderRadius: 22,
    alignItems: 'center',
    borderColor: colors.danger + '30',
    borderWidth: 1,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  desc: {
    color: colors.primary,
    opacity: 0.6,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 20,
  },
  closeBtn: {
    backgroundColor: colors.danger + '12',
    paddingVertical: 11,
    paddingHorizontal: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.danger + '40',
  },
  closeText: {
    color: colors.danger,
    fontWeight: 'bold',
    fontSize: 15,
  },
});
