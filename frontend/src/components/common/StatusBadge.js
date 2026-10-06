import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TYPOGRAPHY } from '../../constants/typography';

const STATUS_CONFIG = {
  REGISTRATION_OPEN: {
    label: 'Open',
    bg: 'rgba(163, 230, 53, 0.12)',
    border: 'rgba(163, 230, 53, 0.35)',
    text: '#A3E635',
    dot: '#A3E635',
  },
  FULL: {
    label: 'Full',
    bg: 'rgba(245, 158, 11, 0.14)',
    border: 'rgba(245, 158, 11, 0.35)',
    text: '#FCD34D',
    dot: '#F59E0B',
  },
  REGISTRATION_CLOSED: {
    label: 'Closed',
    bg: 'rgba(100, 116, 139, 0.15)',
    border: 'rgba(100, 116, 139, 0.3)',
    text: '#94A3B8',
    dot: '#64748B',
  },
  LIVE: {
    label: 'Live Now',
    bg: 'rgba(244, 63, 94, 0.14)',
    border: 'rgba(244, 63, 94, 0.35)',
    text: '#FDA4AF',
    dot: '#F43F5E',
  },
  COMPLETED: {
    label: 'Concluded',
    bg: 'rgba(71, 85, 105, 0.15)',
    border: 'rgba(71, 85, 105, 0.3)',
    text: '#94A3B8',
    dot: '#64748B',
  },
  UPCOMING: {
    label: 'Upcoming',
    bg: 'rgba(139, 92, 246, 0.14)',
    border: 'rgba(139, 92, 246, 0.35)',
    text: '#C4B5FD',
    dot: '#A78BFA',
  },
  WAITLISTED: {
    label: 'Waitlisted',
    bg: 'rgba(245, 158, 11, 0.14)',
    border: 'rgba(245, 158, 11, 0.35)',
    text: '#FCD34D',
    dot: '#F59E0B',
  },
  CONFIRMED: {
    label: 'Confirmed',
    bg: 'rgba(34, 197, 94, 0.14)',
    border: 'rgba(34, 197, 94, 0.35)',
    text: '#86EFAC',
    dot: '#22C55E',
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.25)',
    text: '#FCA5A5',
    dot: '#EF4444',
  },
};

export const StatusBadge = ({ status, style }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.UPCOMING;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.border },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${config.label}`}
    >
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    letterSpacing: 0.2,
  },
});
