import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TYPOGRAPHY } from '../../constants/typography';

const STATUS_CONFIG = {
  REGISTRATION_OPEN: {
    label: 'Open',
    bg: '#DCFCE7',
    text: '#15803D',
    dot: '#16A34A',
  },
  FULL: {
    label: 'Full',
    bg: '#FEF3C7',
    text: '#B45309',
    dot: '#D97706',
  },
  REGISTRATION_CLOSED: {
    label: 'Closed',
    bg: '#FEE2E2',
    text: '#B91C1C',
    dot: '#DC2626',
  },
  LIVE: {
    label: 'Live Now',
    bg: '#DBEAFE',
    text: '#1D4ED8',
    dot: '#2563EB',
  },
  COMPLETED: {
    label: 'Concluded',
    bg: '#F1F5F9',
    text: '#475569',
    dot: '#64748B',
  },
  UPCOMING: {
    label: 'Upcoming',
    bg: '#F3E8FF',
    text: '#7E22CE',
    dot: '#9333EA',
  },
};

export const StatusBadge = ({ status, style }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.UPCOMING;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.fontFamily,
  },
});
