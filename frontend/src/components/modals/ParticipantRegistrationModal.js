import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';

export const ParticipantRegistrationModal = ({
  visible,
  onClose,
  competition,
  activeUser,
  onSubmitRegistration,
  isSubmitting,
}) => {
  // Steps: 'FORM' | 'REVIEW'
  const [step, setStep] = useState('FORM');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState({});

  const [formError, setFormError] = useState('');

  // Pre-fill active user data whenever modal opens
  useEffect(() => {
    if (visible) {
      setStep('FORM');
      setFormError('');
      if (activeUser) {
        setFullName(activeUser.name || '');
        setEmail(activeUser.email || '');
        setPhone(activeUser.phoneNumber || '');
      } else {
        setPhone('');
      }
      setCustomFieldValues({});
    }
  }, [visible, activeUser]);

  const handleCustomFieldChange = (fieldName, value) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleGoToReview = () => {
    setFormError('');

    // 1. Validate Full Name
    if (!fullName.trim() || fullName.trim().length < 2) {
      setFormError('Please enter your full name (minimum 2 characters).');
      return;
    }

    // 2. Validate Email
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }

    // 3. Validate Phone Number (minimum 7 digits, digits/dashes/parentheses/plus)
    const phoneRegex = /^[0-9+()\s-]{7,20}$/;
    if (!phone.trim() || !phoneRegex.test(phone.trim())) {
      setFormError('Please enter a valid phone number (minimum 7 digits).');
      return;
    }

    // 4. Validate Competition-Specific Custom Fields
    if (competition?.customRegistrationFields && competition.customRegistrationFields.length > 0) {
      for (const field of competition.customRegistrationFields) {
        const val = customFieldValues[field.fieldName];
        if (field.required && (!val || !val.toString().trim())) {
          setFormError(`Please fill in the required field: "${field.label || field.fieldName}".`);
          return;
        }
      }
    }

    // Proceed to Review step
    setStep('REVIEW');
  };

  const handleConfirmSubmit = async () => {
    setFormError('');
    const participantDetails = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      customFields: customFieldValues,
    };

    try {
      await onSubmitRegistration(participantDetails);
      onClose();
    } catch (err) {
      setFormError(err.message || 'Registration failed. Please check your information.');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerStepIndicator}>
                {step === 'FORM' ? 'STEP 1 OF 2: PARTICIPANT DETAILS' : 'STEP 2 OF 2: REVIEW & CONFIRM'}
              </Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {step === 'FORM' ? 'Registration Form' : 'Confirm Registration'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={isSubmitting}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Event Mini-Banner */}
          {competition ? (
            <View style={styles.eventInfoBanner}>
              <Text style={styles.eventTitle} numberOfLines={1}>{competition.title}</Text>
              <Text style={styles.eventMeta}>
                {competition.category} • Organizer: {competition.organizer} • {competition.remainingSpots} spots left
              </Text>
            </View>
          ) : null}

          {/* Body */}
          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {formError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}

            {step === 'FORM' ? (
              /* Step 1: Input Form */
              <View>
                <Text style={styles.sectionHeader}>Basic Participant Information</Text>

                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Alex Johnson"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={setFullName}
                />

                <Text style={styles.label}>Email Address *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. alex.johnson@example.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. +1 555-0199 or 9876543210"
                  placeholderTextColor="#94A3B8"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />

                {/* Competition-Specific Dynamic Fields */}
                {competition?.customRegistrationFields && competition.customRegistrationFields.length > 0 ? (
                  <View style={styles.customSection}>
                    <Text style={styles.sectionHeader}>Competition Specific Information</Text>
                    {competition.customRegistrationFields.map((field, idx) => (
                      <View key={field.fieldName || idx} style={styles.fieldGroup}>
                        <Text style={styles.label}>
                          {field.label} {field.required ? '*' : '(Optional)'}
                        </Text>
                        <TextInput
                          style={styles.input}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          placeholderTextColor="#94A3B8"
                          value={customFieldValues[field.fieldName] || ''}
                          onChangeText={(val) => handleCustomFieldChange(field.fieldName, val)}
                        />
                      </View>
                    ))}
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleGoToReview}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Review Details →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Step 2: Review & Confirm */
              <View>
                <View style={styles.reviewCard}>
                  <Text style={styles.reviewSectionTitle}>PARTICIPANT SUMMARY</Text>

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Full Name:</Text>
                    <Text style={styles.reviewValue}>{fullName}</Text>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Email:</Text>
                    <Text style={styles.reviewValue}>{email}</Text>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Phone Number:</Text>
                    <Text style={styles.reviewValue}>{phone}</Text>
                  </View>

                  {competition?.customRegistrationFields && competition.customRegistrationFields.length > 0 ? (
                    <>
                      <View style={styles.divider} />
                      <Text style={styles.reviewSectionTitle}>EVENT-SPECIFIC DETAILS</Text>
                      {competition.customRegistrationFields.map((field) => (
                        <View key={field.fieldName} style={styles.reviewRow}>
                          <Text style={styles.reviewLabel}>{field.label}:</Text>
                          <Text style={styles.reviewValue}>
                            {customFieldValues[field.fieldName] || 'None specified'}
                          </Text>
                        </View>
                      ))}
                    </>
                  ) : null}
                </View>

                {/* Spot Capacity Confirmation Notice */}
                <View style={styles.noticeCard}>
                  <Text style={styles.noticeIcon}>ℹ️</Text>
                  <Text style={styles.noticeText}>
                    Confirming this registration will atomically reserve 1 of {competition?.remainingSpots} available spots. You can cancel your registration anytime before the competition start date.
                  </Text>
                </View>

                {/* Button Actions */}
                <View style={styles.actionButtonGroup}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setStep('FORM')}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.secondaryButtonText}>← Edit Information</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
                    onPress={handleConfirmSubmit}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Confirm Registration ✓</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerStepIndicator: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  eventInfoBanner: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  eventTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  eventMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 28,
  },
  sectionHeader: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 6,
  },
  customSection: {
    marginTop: 12,
  },
  fieldGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weight.bold,
    fontSize: TYPOGRAPHY.size.sm,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    lineHeight: 18,
  },
  reviewCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
  },
  reviewSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weight.medium,
    width: '40%',
  },
  reviewValue: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    textAlign: 'right',
    width: '60%',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  noticeIcon: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },
  actionButtonGroup: {
    gap: 10,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontSize: TYPOGRAPHY.size.sm,
  },
});
