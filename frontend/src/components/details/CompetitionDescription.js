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
    lineHeight: 24,
  },
  expandButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  expandText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  section: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  subHeading: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 8,
    borderRadius: 8,
  },
  bullet: {
    fontSize: 14,
    color: COLORS.primary,
    marginRight: 10,
    lineHeight: 20,
    fontWeight: 'bold',
  },
  ruleText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
