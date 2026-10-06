import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';
import { competitionService } from '../../services/competitionService';
import { DateTimePickerInput, validateCompetitionTimeline } from '../common/DateTimePickerInput';
import { ImagePickerInput } from '../common/ImagePickerInput';
import { canCreateCompetition } from '../../utils/roleUtils';
import { EVENT_CATEGORIES, SPORTS_GAMES_EXAMPLES } from '../../constants/eventCategories';

export const CreateCompetitionModal = ({ visible, onClose, onSuccess, activeUser }) => {
  const now = new Date();
  const addHours = (d, h) => new Date(d.getTime() + h * 3600 * 1000);
  const addDays = (d, days) => new Date(d.getTime() + days * 24 * 3600 * 1000);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Hackathons');
  const [customCategory, setCustomCategory] = useState('');
  const [sportType, setSportType] = useState('Cricket');
  const [customSport, setCustomSport] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [image, setImage] = useState('');
  const [mode, setMode] = useState('Online');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  
  // Dates & Times (Native Date Objects)
  const [regStart, setRegStart] = useState(() => now);
  const [regDeadline, setRegDeadline] = useState(() => addDays(now, 5));
  const [startDate, setStartDate] = useState(() => addDays(now, 7));
  const [endDate, setEndDate] = useState(() => addDays(now, 10));

  const [totalSpots, setTotalSpots] = useState('50');
  const [entryFee, setEntryFee] = useState('Free');
  const [prizePool, setPrizePool] = useState('');
  const [rulesText, setRulesText] = useState('');
  const [eligibility, setEligibility] = useState('');

  // Additional registration requirements configuration
  const [reqCollege, setReqCollege] = useState(false);
  const [reqTeamName, setReqTeamName] = useState(false);
  const [reqExperience, setReqExperience] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const scrollViewRef = useRef(null);
  const isSubmittingRef = useRef(false);

  // Auto-fill organizer name from active user if available and reset errors when modal opens
  useEffect(() => {
    if (visible) {
      setErrorMsg('');
      if (!organizer && (activeUser?.organization || activeUser?.name)) {
        setOrganizer(activeUser.organization || activeUser.name);
      }
    }
  }, [visible, activeUser]);

  // Preset Date Fillers for convenience
  const applyPresetDates = (preset) => {
    const cur = new Date();
    let rStart, rDeadline, cStart, cEnd;
    if (preset === 'OPEN_NOW') {
      rStart = addHours(cur, -2);
      rDeadline = addDays(cur, 3);
      cStart = addDays(cur, 5);
      cEnd = addDays(cur, 8);
    } else if (preset === 'UPCOMING') {
      rStart = addDays(cur, 2);
      rDeadline = addDays(cur, 5);
      cStart = addDays(cur, 7);
      cEnd = addDays(cur, 9);
    } else if (preset === 'LIVE_NOW') {
      rStart = addDays(cur, -5);
      rDeadline = addDays(cur, -1);
      cStart = addHours(cur, -2);
      cEnd = addDays(cur, 2);
    }

    if (rStart) {
      setRegStart(rStart);
      setRegDeadline(rDeadline);
      setStartDate(cStart);
      setEndDate(cEnd);
    }
  };

  const handleSubmit = async () => {
    // Prevent duplicate clicks or concurrent submissions synchronously
    if (isSubmittingRef.current || isSubmitting) {
      return;
    }

    setErrorMsg('');

    // Pre-check organizer role permission
    if (!canCreateCompetition(activeUser)) {
      const msg = 'Only accounts with the Organizer or Admin role can create genuine competitions. Please log in with an Organizer account.';
      setErrorMsg(msg);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    if (!title.trim() || title.trim().length < 3) {
      setErrorMsg('Please enter a valid competition title (minimum 3 characters).');
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    if (!description.trim() || description.trim().length < 5) {
      setErrorMsg('Please enter a description (minimum 5 characters).');
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    if (!organizer.trim() || organizer.trim().length < 2) {
      setErrorMsg('Organizer name is required (minimum 2 characters).');
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    const spots = parseInt(totalSpots, 10);
    if (isNaN(spots) || spots <= 0) {
      setErrorMsg('Total available spots must be a positive number greater than 0.');
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    const timelineCheck = validateCompetitionTimeline(regStart, regDeadline, startDate, endDate);
    if (!timelineCheck.isValid) {
      setErrorMsg(timelineCheck.error);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    // Split rules into lines
    const parsedRules = rulesText
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    let finalCategory = category;
    if (category === 'Other') {
      finalCategory = customCategory.trim() || 'Other';
    } else {
      finalCategory = category.trim() || 'General';
    }

    let finalSport = undefined;
    if (category === 'Sports & Games') {
      if (sportType === 'Other') {
        finalSport = customSport.trim() || undefined;
      } else {
        finalSport = sportType.trim() || undefined;
      }
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category: finalCategory,
      ...(finalSport
        ? { sportType: finalSport, subcategory: finalSport }
        : subcategory.trim()
        ? { subcategory: subcategory.trim() }
        : {}),
      organizer: organizer.trim(),
      image: image.trim(),
      location: {
        type: mode,
        mode,
        venue: venue.trim(),
        city: city.trim(),
      },
      registrationStartDate: regStart.toISOString(),
      registrationDeadline: regDeadline.toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalSpots: spots,
      entryFee: entryFee.trim() || 'Free',
      prizePool: prizePool.trim(),
      rules: parsedRules,
      eligibility: eligibility.trim(),
      customRegistrationFields: [
        ...(reqCollege
          ? [{ fieldName: 'collegeOrOrg', label: 'College / Organization', required: true, type: 'text' }]
          : []),
        ...(reqTeamName
          ? [{ fieldName: 'teamName', label: 'Team Name', required: false, type: 'text' }]
          : []),
        ...(reqExperience
          ? [{ fieldName: 'experienceLevel', label: 'Experience Level', required: false, type: 'text' }]
          : []),
      ],
    };

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const created = await competitionService.createCompetition(payload);
      if (onSuccess) {
        onSuccess(created);
      }
      onClose();
    } catch (err) {
      const detailedMessage =
        err.details && Array.isArray(err.details)
          ? `${err.message}: ${err.details.join(', ')}`
          : err.message || 'Failed to create competition. Please check all fields.';
      setErrorMsg(detailedMessage);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.error('[CreateCompetitionModal] Creation failed:', err.message);
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.closeText}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Real Competition</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.formScroll}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionHeader}>Basic Information</Text>

          {errorMsg ? (
            <View style={styles.errorBox} testID="create-comp-error-top">
              <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Competition Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. National Algorithm & AI Challenge"
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Event Category *</Text>
          <View style={styles.categorySelectContainer}>
            <View style={styles.categoryGrid}>
              {EVENT_CATEGORIES.map((cat) => {
                const isCatActive = category === cat.name;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    testID={`create-category-${cat.id}`}
                    style={[
                      styles.categorySelectChip,
                      isCatActive && styles.categorySelectChipActive,
                    ]}
                    onPress={() => setCategory(cat.name)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.categorySelectIcon}>{cat.icon}</Text>
                    <Text
                      style={[
                        styles.categorySelectLabel,
                        isCatActive && styles.categorySelectLabelActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {category === 'Other' ? (
            <View style={styles.subFieldBlock}>
              <Text style={styles.subLabel}>Specify Custom Category</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Gaming, Debate, Literature..."
                placeholderTextColor="#94A3B8"
                value={customCategory}
                onChangeText={setCustomCategory}
              />
            </View>
          ) : null}

          {category === 'Sports & Games' ? (
            <View style={styles.sportsSubSelectCard}>
              <Text style={styles.sportsCardTitle}>🏆 Sport / Game Type</Text>
              <Text style={styles.helperText}>
                Select the sport or esport for this tournament:
              </Text>
              <View style={styles.sportsPillGrid}>
                {[...SPORTS_GAMES_EXAMPLES, 'Other'].map((sport) => {
                  const isSportActive = sportType === sport;
                  const sportIcons = {
                    Cricket: '🏏',
                    Football: '⚽',
                    Basketball: '🏀',
                    Badminton: '🏸',
                    Chess: '♟️',
                    Esports: '🎮',
                    Other: '🏅',
                  };
                  const icon = sportIcons[sport] || '🏅';
                  return (
                    <TouchableOpacity
                      key={sport}
                      testID={`create-sport-${sport.toLowerCase()}`}
                      style={[
                        styles.sportSelectPill,
                        isSportActive && styles.sportSelectPillActive,
                      ]}
                      onPress={() => setSportType(sport)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.sportSelectPillText,
                          isSportActive && styles.sportSelectPillTextActive,
                        ]}
                      >
                        {icon} {sport}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {sportType === 'Other' ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.subLabel}>Custom Sport / Game Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Table Tennis, Athletics, VolleyBall..."
                    placeholderTextColor="#94A3B8"
                    value={customSport}
                    onChangeText={setCustomSport}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.label}>Organizer *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Tech Club / Organization"
            placeholderTextColor="#94A3B8"
            value={organizer}
            onChangeText={setOrganizer}
          />

          <ImagePickerInput
            value={image}
            onChange={setImage}
            onError={setErrorMsg}
          />

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Comprehensive description of the competition, objectives, and format..."
            placeholderTextColor="#94A3B8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.sectionHeader}>Location & Format</Text>
          <View style={styles.modeRow}>
            {['Online', 'In-person', 'Hybrid'].map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              >
                <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode !== 'Online' ? (
            <>
              <Text style={styles.label}>Venue</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Main Auditorium, Tech Hub"
                placeholderTextColor="#94A3B8"
                value={venue}
                onChangeText={setVenue}
              />
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Bengaluru, New York, London"
                placeholderTextColor="#94A3B8"
                value={city}
                onChangeText={setCity}
              />
            </>
          ) : null}

          <Text style={styles.sectionHeader}>Dates & Timeline</Text>
          <Text style={styles.helperText}>Quick Presets:</Text>
          <View style={styles.presetRow}>
            <TouchableOpacity onPress={() => applyPresetDates('OPEN_NOW')} style={styles.presetChip}>
              <Text style={styles.presetChipText}>🟢 Registration Open</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => applyPresetDates('UPCOMING')} style={styles.presetChip}>
              <Text style={styles.presetChipText}>🔵 Upcoming</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => applyPresetDates('LIVE_NOW')} style={styles.presetChip}>
              <Text style={styles.presetChipText}>🔴 Live Now</Text>
            </TouchableOpacity>
          </View>

          <DateTimePickerInput
            label="Registration Start"
            value={regStart}
            onChange={setRegStart}
            required
          />

          <DateTimePickerInput
            label="Registration Deadline"
            value={regDeadline}
            onChange={setRegDeadline}
            required
          />

          <DateTimePickerInput
            label="Competition Start Date & Time"
            value={startDate}
            onChange={setStartDate}
            required
          />

          <DateTimePickerInput
            label="Competition End Date & Time"
            value={endDate}
            onChange={setEndDate}
            required
          />

          <Text style={styles.sectionHeader}>Capacity & Fees</Text>

          <Text style={styles.label}>Total Spots *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 50"
            placeholderTextColor="#94A3B8"
            value={totalSpots}
            onChangeText={setTotalSpots}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Entry Fee</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Free or $25"
            placeholderTextColor="#94A3B8"
            value={entryFee}
            onChangeText={setEntryFee}
          />

          <Text style={styles.label}>Prize Information (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. $10,000 Cash Pool + Certificates"
            placeholderTextColor="#94A3B8"
            value={prizePool}
            onChangeText={setPrizePool}
          />

          <Text style={styles.sectionHeader}>Rules & Eligibility (Optional)</Text>

          <Text style={styles.label}>Rules (One rule per line)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Original code only&#10;Teams up to 3 members&#10;Submit GitHub repo before deadline"
            placeholderTextColor="#94A3B8"
            value={rulesText}
            onChangeText={setRulesText}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Eligibility Criteria</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. University students and early career developers"
            placeholderTextColor="#94A3B8"
            value={eligibility}
            onChangeText={setEligibility}
          />

          <Text style={styles.sectionHeader}>Additional Registration Fields (Optional)</Text>
          <Text style={styles.helperText}>
            Select additional participant details required during registration:
          </Text>

          <View style={styles.reqChipsRow}>
            <TouchableOpacity
              style={[styles.reqChip, reqCollege && styles.reqChipActive]}
              onPress={() => setReqCollege(!reqCollege)}
              activeOpacity={0.7}
            >
              <Text style={[styles.reqChipText, reqCollege && styles.reqChipTextActive]}>
                {reqCollege ? '✓ ' : '+ '}College / Organization (Required)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.reqChip, reqTeamName && styles.reqChipActive]}
              onPress={() => setReqTeamName(!reqTeamName)}
              activeOpacity={0.7}
            >
              <Text style={[styles.reqChipText, reqTeamName && styles.reqChipTextActive]}>
                {reqTeamName ? '✓ ' : '+ '}Team Name (Optional)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.reqChip, reqExperience && styles.reqChipActive]}
              onPress={() => setReqExperience(!reqExperience)}
              activeOpacity={0.7}
            >
              <Text style={[styles.reqChipText, reqExperience && styles.reqChipTextActive]}>
                {reqExperience ? '✓ ' : '+ '}Experience Level (Optional)
              </Text>
            </TouchableOpacity>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox} testID="create-comp-error-bottom">
              <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            testID="save-details-button"
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitButtonText}>  Creating Competition...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Save Details</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButton: {
    padding: 6,
  },
  closeText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 12,
  },
  label: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: TYPOGRAPHY.size.sm,
    color: '#F8FAFC',
    marginBottom: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modeRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 11,
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  modeBtnActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: COLORS.primary,
  },
  modeBtnText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textSecondary,
  },
  modeBtnTextActive: {
    color: '#F8FAFC',
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  helperText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginBottom: 10,
    lineHeight: 18,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  presetChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetChipText: {
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  reqChipsRow: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  reqChip: {
    backgroundColor: '#0B1120',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  reqChipActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: COLORS.primary,
  },
  reqChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  reqChipTextActive: {
    color: '#C4B5FD',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
  },
  milestonePreview: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateCol: {
    flex: 3,
  },
  timeCol: {
    flex: 2,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  dateTimeInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textPrimary,
  },
  categorySelectContainer: {
    marginBottom: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categorySelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  categorySelectChipActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8B5CF6',
  },
  categorySelectIcon: {
    fontSize: 14,
  },
  categorySelectLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  categorySelectLabelActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  subFieldBlock: {
    marginBottom: 14,
  },
  sportsSubSelectCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    marginBottom: 14,
  },
  sportsCardTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 4,
  },
  sportsPillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  sportSelectPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sportSelectPillActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
  },
  sportSelectPillText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  sportSelectPillTextActive: {
    color: '#FDE68A',
    fontWeight: '700',
  },
});

