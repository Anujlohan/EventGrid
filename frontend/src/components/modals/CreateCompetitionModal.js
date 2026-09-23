import React, { useState } from 'react';
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

export const CreateCompetitionModal = ({ visible, onClose, onSuccess }) => {
  const now = new Date();
  const addHours = (d, h) => new Date(d.getTime() + h * 3600 * 1000);
  const addDays = (d, days) => new Date(d.getTime() + days * 24 * 3600 * 1000);
  const pad2 = (n) => String(n).padStart(2, '0');

  const formatDatePart = (d) => {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  };

  const formatTimePart = (d) => {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return '09:00';
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  };

  const combineDateTime = (dateStr, timeStr) => {
    if (!dateStr || !dateStr.trim()) return null;
    const cleanDate = dateStr.trim();
    let cleanTime = timeStr && timeStr.trim() ? timeStr.trim() : '00:00';
    if (cleanTime.length === 5) cleanTime = `${cleanTime}:00`;
    const dt = new Date(`${cleanDate}T${cleanTime}`);
    if (isNaN(dt.getTime())) {
      const fallback = new Date(cleanDate);
      return isNaN(fallback.getTime()) ? null : fallback;
    }
    return dt;
  };

  const formatPreview = (dateStr, timeStr) => {
    const dt = combineDateTime(dateStr, timeStr);
    if (!dt || isNaN(dt.getTime())) return 'Not set';
    return dt.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technology');
  const [organizer, setOrganizer] = useState('');
  const [image, setImage] = useState('');
  const [mode, setMode] = useState('Online');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  
  // Dates & Times
  const [regStartDate, setRegStartDate] = useState(formatDatePart(now));
  const [regStartTime, setRegStartTime] = useState(formatTimePart(now));

  const [regDeadlineDate, setRegDeadlineDate] = useState(formatDatePart(addDays(now, 5)));
  const [regDeadlineTime, setRegDeadlineTime] = useState(formatTimePart(addDays(now, 5)));

  const [startDateDate, setStartDateDate] = useState(formatDatePart(addDays(now, 7)));
  const [startDateTime, setStartDateTime] = useState(formatTimePart(addDays(now, 7)));

  const [endDateDate, setEndDateDate] = useState(formatDatePart(addDays(now, 10)));
  const [endDateTime, setEndDateTime] = useState(formatTimePart(addDays(now, 10)));

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
      setRegStartDate(formatDatePart(rStart));
      setRegStartTime(formatTimePart(rStart));
      setRegDeadlineDate(formatDatePart(rDeadline));
      setRegDeadlineTime(formatTimePart(rDeadline));
      setStartDateDate(formatDatePart(cStart));
      setStartDateTime(formatTimePart(cStart));
      setEndDateDate(formatDatePart(cEnd));
      setEndDateTime(formatTimePart(cEnd));
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');

    if (!title.trim() || title.trim().length < 3) {
      setErrorMsg('Please enter a valid competition title (minimum 3 characters).');
      return;
    }
    if (!description.trim() || description.trim().length < 5) {
      setErrorMsg('Please enter a description (minimum 5 characters).');
      return;
    }
    if (!organizer.trim()) {
      setErrorMsg('Organizer name is required.');
      return;
    }

    const spots = parseInt(totalSpots, 10);
    if (isNaN(spots) || spots <= 0) {
      setErrorMsg('Total available spots must be a positive number greater than 0.');
      return;
    }

    const dRegStart = combineDateTime(regStartDate, regStartTime);
    const dRegDeadline = combineDateTime(regDeadlineDate, regDeadlineTime);
    const dStart = combineDateTime(startDateDate, startDateTime);
    const dEnd = combineDateTime(endDateDate, endDateTime);

    if (!dRegStart || isNaN(dRegStart.getTime())) {
      setErrorMsg('Please enter a valid Registration Start Date and Time.');
      return;
    }
    if (!dRegDeadline || isNaN(dRegDeadline.getTime())) {
      setErrorMsg('Please enter a valid Registration Deadline Date and Time.');
      return;
    }
    if (!dStart || isNaN(dStart.getTime())) {
      setErrorMsg('Please enter a valid Competition Start Date and Time.');
      return;
    }
    if (!dEnd || isNaN(dEnd.getTime())) {
      setErrorMsg('Please enter a valid Competition End Date and Time.');
      return;
    }

    if (dRegStart > dRegDeadline) {
      setErrorMsg('Registration start date/time must be before or equal to the registration deadline.');
      return;
    }
    if (dRegDeadline >= dStart) {
      setErrorMsg('Registration deadline must be strictly before competition start date/time.');
      return;
    }
    if (dStart > dEnd) {
      setErrorMsg('Competition start date/time must be before or equal to competition end date/time.');
      return;
    }

    // Split rules into lines
    const parsedRules = rulesText
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category: category.trim() || 'General',
      organizer: organizer.trim(),
      image: image.trim(),
      location: {
        mode,
        venue: venue.trim(),
        city: city.trim(),
      },
      registrationStartDate: dRegStart.toISOString(),
      registrationDeadline: dRegDeadline.toISOString(),
      startDate: dStart.toISOString(),
      endDate: dEnd.toISOString(),
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

    setIsSubmitting(true);
    try {
      const created = await competitionService.createCompetition(payload);
      onSuccess(created);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create competition. Please check all fields.');
    } finally {
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

        <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionHeader}>Basic Information</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
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

          <Text style={styles.label}>Category</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Coding, Robotics, Hackathon, Design"
            placeholderTextColor="#94A3B8"
            value={category}
            onChangeText={setCategory}
          />

          <Text style={styles.label}>Organizer *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Tech Club / Organization"
            placeholderTextColor="#94A3B8"
            value={organizer}
            onChangeText={setOrganizer}
          />

          <Text style={styles.label}>Banner Image URL (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://... (Leave empty to omit image)"
            placeholderTextColor="#94A3B8"
            value={image}
            onChangeText={setImage}
            autoCapitalize="none"
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

          {/* 1. Registration Start */}
          <View style={styles.milestoneCard}>
            <View style={styles.milestoneHeader}>
              <Text style={styles.milestoneTitle}>Registration Start</Text>
              <Text style={styles.milestonePreview}>{formatPreview(regStartDate, regStartTime)}</Text>
            </View>
            <View style={styles.dateTimeRow}>
              <View style={styles.dateCol}>
                <Text style={styles.subLabel}>Date</Text>
                <TextInput
                  style={styles.dateTimeInput}
                  value={regStartDate}
                  onChangeText={setRegStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  {...(Platform.OS === 'web' ? { type: 'date' } : {})}
                />
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.subLabel}>Time</Text>
                <TextInput
                  style={styles.dateTimeInput}
                  value={regStartTime}
                  onChangeText={setRegStartTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#94A3B8"
                  {...(Platform.OS === 'web' ? { type: 'time' } : {})}
                />
              </View>
            </View>
          </View>

          {/* 2. Registration Deadline */}
          <View style={styles.milestoneCard}>
            <View style={styles.milestoneHeader}>
              <Text style={styles.milestoneTitle}>Registration Deadline *</Text>
              <Text style={styles.milestonePreview}>{formatPreview(regDeadlineDate, regDeadlineTime)}</Text>
            </View>
            <View style={styles.dateTimeRow}>
              <View style={styles.dateCol}>
                <Text style={styles.subLabel}>Date</Text>
                <TextInput
                  style={styles.dateTimeInput}
                  value={regDeadlineDate}
                  onChangeText={setRegDeadlineDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  {...(Platform.OS === 'web' ? { type: 'date' } : {})}
                />
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.subLabel}>Time</Text>
                <TextInput
                  style={styles.dateTimeInput}
                  value={regDeadlineTime}
                  onChangeText={setRegDeadlineTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#94A3B8"
                  {...(Platform.OS === 'web' ? { type: 'time' } : {})}
                />
              </View>
            </View>
          </View>

          {/* 3. Competition Start */}
          <View style={styles.milestoneCard}>
            <View style={styles.milestoneHeader}>
              <Text style={styles.milestoneTitle}>Competition Start Date & Time *</Text>
              <Text style={styles.milestonePreview}>{formatPreview(startDateDate, startDateTime)}</Text>
            </View>
            <View style={styles.dateTimeRow}>
              <View style={styles.dateCol}>
                <Text style={styles.subLabel}>Date</Text>
                <TextInput
                  style={styles.dateTimeInput}
                  value={startDateDate}
                  onChangeText={setStartDateDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  {...(Platform.OS === 'web' ? { type: 'date' } : {})}
                />
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.subLabel}>Time</Text>
                <TextInput
                  style={styles.dateTimeInput}
                  value={startDateTime}
                  onChangeText={setStartDateTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#94A3B8"
                  {...(Platform.OS === 'web' ? { type: 'time' } : {})}
                />
              </View>
            </View>
          </View>

          {/* 4. Competition End */}
          <View style={styles.milestoneCard}>
            <View style={styles.milestoneHeader}>
              <Text style={styles.milestoneTitle}>Competition End Date & Time *</Text>
              <Text style={styles.milestonePreview}>{formatPreview(endDateDate, endDateTime)}</Text>
            </View>
            <View style={styles.dateTimeRow}>
              <View style={styles.dateCol}>
                <Text style={styles.subLabel}>Date</Text>
                <TextInput
                  style={styles.dateTimeInput}
                  value={endDateDate}
                  onChangeText={setEndDateDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  {...(Platform.OS === 'web' ? { type: 'date' } : {})}
                />
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.subLabel}>Time</Text>
                <TextInput
                  style={styles.dateTimeInput}
                  value={endDateTime}
                  onChangeText={setEndDateTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#94A3B8"
                  {...(Platform.OS === 'web' ? { type: 'time' } : {})}
                />
              </View>
            </View>
          </View>

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

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textPrimary,
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
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  modeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modeBtnText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textSecondary,
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  helperText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
    gap: 8,
  },
  presetChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  presetChipText: {
    fontSize: 11,
    color: COLORS.textPrimary,
    fontWeight: '600',
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
  },
  reqChipsRow: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  reqChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  reqChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  reqChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  reqChipTextActive: {
    color: '#1D4ED8',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
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
});

