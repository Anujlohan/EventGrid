import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { InfoCard } from '../common/InfoCard';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';

export const CompetitionLocation = ({ location }) => {
  if (!location) return null;

  const type = location.type || 'Online';
  const venue = location.venue?.trim();
  const city = location.city?.trim();
  const address = location.address?.trim();

  return (
    <InfoCard title="Location & Format">
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>
            {type === 'Online' ? '🌐' : '📍'}
          </Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.typeText}>{type}</Text>
          {venue ? <Text style={styles.venueText}>{venue}</Text> : null}
          {address ? <Text style={styles.venueText}>{address}</Text> : null}
          {city ? <Text style={styles.cityText}>{city}</Text> : null}
        </View>
      </View>
    </InfoCard>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 22,
  },
  details: {
    flex: 1,
  },
  typeText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  venueText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  cityText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
