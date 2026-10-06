import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';

const pad2 = (n) => String(n).padStart(2, '0');

export const formatDateString = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export const formatTimeString = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '09:00';
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

export const formatDisplayDateTime = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Validate chronological milestone order for competitions
 * @returns {{ isValid: boolean, error: string | null }}
 */
export const validateCompetitionTimeline = (regStart, regDeadline, startDate, endDate) => {
  if (!regStart || isNaN(regStart.getTime())) {
    return { isValid: false, error: 'Registration start date is required and must be valid.' };
  }
  if (!regDeadline || isNaN(regDeadline.getTime())) {
    return { isValid: false, error: 'Registration deadline is required and must be valid.' };
  }
  if (!startDate || isNaN(startDate.getTime())) {
    return { isValid: false, error: 'Competition start date is required and must be valid.' };
  }
  if (!endDate || isNaN(endDate.getTime())) {
    return { isValid: false, error: 'Competition end date is required and must be valid.' };
  }

  if (regStart.getTime() > regDeadline.getTime()) {
    return {
      isValid: false,
      error: 'Registration start date must be less than or equal to registration deadline.',
    };
  }

  if (regDeadline.getTime() >= startDate.getTime()) {
    return {
      isValid: false,
      error: 'Registration deadline must be strictly before competition start date.',
    };
  }

  if (startDate.getTime() > endDate.getTime()) {
    return {
      isValid: false,
      error: 'Competition start date must be less than or equal to competition end date.',
    };
  }

  return { isValid: true, error: null };
};

export const DateTimePickerInput = ({
  label,
  value,
  onChange,
  required = false,
  error = null,
}) => {
  const currentDate = value instanceof Date && !isNaN(value.getTime()) ? value : new Date();

  // Native Picker Modal States
  const [showNativePicker, setShowNativePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date'); // 'date' | 'time'

  const handleOpenPicker = (mode) => {
    setPickerMode(mode);
    setShowNativePicker(true);
  };

  const handleNativeChange = (event, selectedDate) => {
    // On Android, dismissing returns event.type === 'dismissed'
    if (event?.type === 'dismissed') {
      setShowNativePicker(false);
      return;
    }

    if (Platform.OS === 'android') {
      setShowNativePicker(false);
    }

    if (selectedDate) {
      const updated = new Date(currentDate.getTime());
      if (pickerMode === 'date') {
        updated.setFullYear(selectedDate.getFullYear());
        updated.setMonth(selectedDate.getMonth());
        updated.setDate(selectedDate.getDate());
      } else {
        updated.setHours(selectedDate.getHours());
        updated.setMinutes(selectedDate.getMinutes());
        updated.setSeconds(0);
      }
      onChange(updated);
    }
  };

  // Web input handlers with strict range validation
  const handleWebDateChange = (dateStr) => {
    if (!dateStr) return;
    const parts = String(dateStr).trim().split('-');
    if (parts.length !== 3) return;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return;
    if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return;
    const updated = new Date(currentDate.getTime());
    updated.setFullYear(y, m - 1, d);
    if (!isNaN(updated.getTime())) {
      onChange(updated);
    }
  };

  const handleWebTimeChange = (timeStr) => {
    if (!timeStr) return;
    const parts = String(timeStr).trim().split(':');
    if (parts.length < 2) return;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return;
    const updated = new Date(currentDate.getTime());
    updated.setHours(hours, minutes, 0, 0);
    if (!isNaN(updated.getTime())) {
      onChange(updated);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {label} {required ? <Text style={styles.requiredStar}>*</Text> : null}
        </Text>
        <Text style={styles.previewText}>{formatDisplayDateTime(currentDate)}</Text>
      </View>

      {Platform.OS === 'web' ? (
        // Web Form Fallback with native HTML5 pickers
        <View style={styles.controlsRow}>
          <View style={styles.col}>
            <Text style={styles.subLabel}>Date</Text>
            <input
              type="date"
              style={{
                backgroundColor: '#0F172A',
                border: '1px solid #475569',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '14px',
                color: '#F8FAFC',
                colorScheme: 'dark',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
              value={formatDateString(currentDate)}
              onChange={(e) => handleWebDateChange(e.target.value)}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.subLabel}>Time</Text>
            <input
              type="time"
              style={{
                backgroundColor: '#0F172A',
                border: '1px solid #475569',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '14px',
                color: '#F8FAFC',
                colorScheme: 'dark',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
              value={formatTimeString(currentDate)}
              onChange={(e) => handleWebTimeChange(e.target.value)}
            />
          </View>
        </View>
      ) : (
        // Native iOS & Android Pickers
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => handleOpenPicker('date')}
            activeOpacity={0.7}
          >
            <Text style={styles.pickerIcon}>📅</Text>
            <Text style={styles.pickerValueText}>{formatDateString(currentDate)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => handleOpenPicker('time')}
            activeOpacity={0.7}
          >
            <Text style={styles.pickerIcon}>⏰</Text>
            <Text style={styles.pickerValueText}>{formatTimeString(currentDate)}</Text>
          </TouchableOpacity>

          {showNativePicker && (
            <DateTimePicker
              value={currentDate}
              mode={pickerMode}
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleNativeChange}
            />
          )}
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#F1F5F9',
  },
  requiredStar: {
    color: COLORS.danger,
  },
  previewText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
  },
  subLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: '#94A3B8',
    marginBottom: 4,
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  webPickerInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: TYPOGRAPHY.size.sm,
    color: '#F8FAFC',
    fontWeight: TYPOGRAPHY.weight.medium,
    outlineStyle: 'none',
  },
  pickerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  pickerValueText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: '#F8FAFC',
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: 6,
  },
});

export { styles as dateTimePickerStyles };
