import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { InfoCard } from '../common/InfoCard';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';

export const RegistrationInformation = ({ entryFee = 'Free', prizePool }) => {
  return (
    <InfoCard title="Registration Details">
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={styles.label}>Entry Fee</Text>
          <Text style={styles.value}>{entryFee}</Text>
        </View>

        {prizePool ? (
          <View style={[styles.item, styles.itemRight]}>
            <Text style={styles.label}>Prize Pool</Text>
            <Text style={[styles.value, styles.prizeValue]}>{prizePool}</Text>
          </View>
        ) : null}
      </View>
    </InfoCard>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    flex: 1,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  label: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  value: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  prizeValue: {
    color: '#059669',
  },
});
