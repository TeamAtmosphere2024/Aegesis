import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import colors from '../theme/colors';

/**
 * Production-ready loading overlay/spinner for API transitions.
 */
export const LoadingSpinner = ({ message = "Processing Oracle Signals..." }) => (
  <View style={styles.overlay}>
    <ActivityIndicator size="large" color={colors.vibrant} />
    {message && <Text style={styles.text}>{message}</Text>}
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 15,
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
    textAlign: 'center',
  }
});

export default LoadingSpinner;
