import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { InfoCard } from '../common/InfoCard';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';

export const CompetitionDescription = ({ description, rules = [], eligibility }) => {
  const [expanded, setExpanded] = useState(false);

  const shouldTruncate = description && description.length > 280;
  const displayText = shouldTruncate && !expanded
    ? `${description.slice(0, 280)}...`
    : description;

  return (
    <InfoCard title="About the Competition">
      <Text style={styles.descriptionText}>{displayText}</Text>

      {shouldTruncate ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setExpanded(!expanded)}
          style={styles.expandButton}
        >
          <Text style={styles.expandText}>{expanded ? 'Read Less ▲' : 'Read More ▼'}</Text>
        </TouchableOpacity>
      ) : null}

      {eligibility ? (
        <View style={styles.section}>
          <Text style={styles.subHeading}>Eligibility</Text>
          <Text style={styles.bodyText}>{eligibility}</Text>
        </View>
      ) : null}

      {rules && rules.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.subHeading}>Key Guidelines & Rules</Text>
          {rules.map((rule, index) => (
            <View key={index} style={styles.ruleRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </InfoCard>
  );
};

const styles = StyleSheet.create({
  descriptionText: {
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.textSecondary,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed,
  },
  expandButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  expandText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  section: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  subHeading: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bodyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    lineHeight: TYPOGRAPHY.lineHeight.normal,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 3,
  },
  bullet: {
    fontSize: 16,
    color: COLORS.primary,
    marginRight: 8,
    lineHeight: 20,
  },
  ruleText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
