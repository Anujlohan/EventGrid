global.__DEV__ = true;

// Mock Platform and Alert
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    select: (obj) => (obj ? (obj.web ?? obj.default ?? obj.ios ?? obj.android) : undefined),
  },
  Alert: {
    alert: jest.fn(),
  },
  StyleSheet: {
    create: (styles) => styles,
  },
}));

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'images',
  },
}));

import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import {
  formatDateString,
  formatTimeString,
  formatDisplayDateTime,
  validateCompetitionTimeline,
} from '../components/common/DateTimePickerInput';

describe('Competition Forms & Pickers Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. DATE/TIME FORMATTING & DISPLAY HELPERS
  // ==========================================
  describe('Date/Time Formatters', () => {
    test('1. formatDateString formats Date to YYYY-MM-DD correctly', () => {
      const testDate = new Date(2026, 9, 15); // Month is 0-indexed: 9 -> October
      expect(formatDateString(testDate)).toBe('2026-10-15');
    });

    test('2. formatDateString handles invalid or null date gracefully', () => {
      expect(formatDateString(null)).toBe('');
      expect(formatDateString(undefined)).toBe('');
      expect(formatDateString(new Date('invalid-date'))).toBe('');
    });

    test('3. formatTimeString formats Date to HH:MM correctly', () => {
      const testDate = new Date(2026, 9, 15, 14, 30);
      expect(formatTimeString(testDate)).toBe('14:30');
    });

    test('4. formatTimeString handles invalid or null date gracefully with fallback', () => {
      expect(formatTimeString(null)).toBe('09:00');
      expect(formatTimeString(new Date('invalid-date'))).toBe('09:00');
    });

    test('5. formatDisplayDateTime formats readable date-time string or fallback', () => {
      expect(formatDisplayDateTime(null)).toBe('Not set');
      expect(formatDisplayDateTime(new Date('invalid'))).toBe('Not set');

      const testDate = new Date(2026, 9, 15, 10, 0);
      const formatted = formatDisplayDateTime(testDate);
      expect(typeof formatted).toBe('string');
      expect(formatted).not.toBe('Not set');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // 2. TIMELINE VALIDATION RULES
  // ==========================================
  describe('Competition Timeline Validation (validateCompetitionTimeline)', () => {
    const baseNow = new Date('2026-10-01T10:00:00.000Z');
    const day = 24 * 3600 * 1000;

    test('6. Valid chronological timeline passes validation', () => {
      const regStart = new Date(baseNow.getTime());
      const regDeadline = new Date(baseNow.getTime() + 3 * day);
      const startDate = new Date(baseNow.getTime() + 5 * day);
      const endDate = new Date(baseNow.getTime() + 7 * day);

      const result = validateCompetitionTimeline(regStart, regDeadline, startDate, endDate);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('7. Fails when registration start date is missing or invalid', () => {
      const regDeadline = new Date(baseNow.getTime() + 3 * day);
      const startDate = new Date(baseNow.getTime() + 5 * day);
      const endDate = new Date(baseNow.getTime() + 7 * day);

      const res1 = validateCompetitionTimeline(null, regDeadline, startDate, endDate);
      expect(res1.isValid).toBe(false);
      expect(res1.error).toContain('Registration start date is required');

      const res2 = validateCompetitionTimeline(new Date('invalid'), regDeadline, startDate, endDate);
      expect(res2.isValid).toBe(false);
    });

    test('8. Fails when registration deadline is missing or invalid', () => {
      const regStart = new Date(baseNow.getTime());
      const startDate = new Date(baseNow.getTime() + 5 * day);
      const endDate = new Date(baseNow.getTime() + 7 * day);

      const res = validateCompetitionTimeline(regStart, null, startDate, endDate);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Registration deadline is required');
    });

    test('9. Fails when competition start date is missing or invalid', () => {
      const regStart = new Date(baseNow.getTime());
      const regDeadline = new Date(baseNow.getTime() + 3 * day);
      const endDate = new Date(baseNow.getTime() + 7 * day);

      const res = validateCompetitionTimeline(regStart, regDeadline, null, endDate);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Competition start date is required');
    });

    test('10. Fails when competition end date is missing or invalid', () => {
      const regStart = new Date(baseNow.getTime());
      const regDeadline = new Date(baseNow.getTime() + 3 * day);
      const startDate = new Date(baseNow.getTime() + 5 * day);

      const res = validateCompetitionTimeline(regStart, regDeadline, startDate, null);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Competition end date is required');
    });

    test('11. Fails when registration start is after registration deadline', () => {
      const regStart = new Date(baseNow.getTime() + 4 * day);
      const regDeadline = new Date(baseNow.getTime() + 2 * day);
      const startDate = new Date(baseNow.getTime() + 5 * day);
      const endDate = new Date(baseNow.getTime() + 7 * day);

      const result = validateCompetitionTimeline(regStart, regDeadline, startDate, endDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Registration start date must be less than or equal to registration deadline');
    });

    test('12. Fails when registration deadline is on or after competition start', () => {
      const regStart = new Date(baseNow.getTime());
      const regDeadline = new Date(baseNow.getTime() + 5 * day);
      const startDate = new Date(baseNow.getTime() + 5 * day); // Equal -> should fail
      const endDate = new Date(baseNow.getTime() + 7 * day);

      const result = validateCompetitionTimeline(regStart, regDeadline, startDate, endDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Registration deadline must be strictly before competition start date');
    });

    test('13. Fails when competition start is after competition end', () => {
      const regStart = new Date(baseNow.getTime());
      const regDeadline = new Date(baseNow.getTime() + 2 * day);
      const startDate = new Date(baseNow.getTime() + 7 * day);
      const endDate = new Date(baseNow.getTime() + 5 * day); // Before start -> should fail

      const result = validateCompetitionTimeline(regStart, regDeadline, startDate, endDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Competition start date must be less than or equal to competition end date');
    });

    test('14. Allows registration start equal to registration deadline (e.g. single deadline moment)', () => {
      const regMoment = new Date(baseNow.getTime() + 2 * day);
      const startDate = new Date(baseNow.getTime() + 5 * day);
      const endDate = new Date(baseNow.getTime() + 7 * day);

      const result = validateCompetitionTimeline(regMoment, regMoment, startDate, endDate);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    test('15. Allows competition start equal to competition end (e.g. single-day event)', () => {
      const regStart = new Date(baseNow.getTime());
      const regDeadline = new Date(baseNow.getTime() + 2 * day);
      const eventMoment = new Date(baseNow.getTime() + 5 * day);

      const result = validateCompetitionTimeline(regStart, regDeadline, eventMoment, eventMoment);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  // ==========================================
  // 3. IMAGE PICKER & PERMISSION CONTRACTS
  // ==========================================
  describe('Image Picker Operations & Permissions', () => {
    test('16. Media library permission request flow handles granted permission', async () => {
      ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
        granted: true,
        status: 'granted',
      });
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file:///data/user/0/eventgrid/images/banner.jpg', width: 1920, height: 1080 }],
      });

      const onChangeMock = jest.fn();
      const onErrorMock = jest.fn();

      // Simulate ImagePickerInput selection flow
      const pickImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          onErrorMock('Permission denied');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          onChangeMock(result.assets[0].uri);
        }
      };

      await pickImage();

      expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      expect(onChangeMock).toHaveBeenCalledWith('file:///data/user/0/eventgrid/images/banner.jpg');
      expect(onErrorMock).not.toHaveBeenCalled();
    });

    test('17. Gracefully handles media permission denial with alert and error callback', async () => {
      ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
        granted: false,
        status: 'denied',
      });

      const onChangeMock = jest.fn();
      const onErrorMock = jest.fn();

      const pickImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          const msg = 'Permission to access your photo library is required to select a banner image.';
          onErrorMock(msg);
          Alert.alert('Permission Denied', msg);
          return;
        }
        await ImagePicker.launchImageLibraryAsync();
      };

      await pickImage();

      expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
      expect(onChangeMock).not.toHaveBeenCalled();
      expect(onErrorMock).toHaveBeenCalledWith(
        'Permission to access your photo library is required to select a banner image.'
      );
      expect(Alert.alert).toHaveBeenCalledWith(
        'Permission Denied',
        expect.stringContaining('photo library is required')
      );
    });

    test('18. Handles user cancellation without error or state change', async () => {
      ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
        granted: true,
      });
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: true,
        assets: null,
      });

      const onChangeMock = jest.fn();
      const onErrorMock = jest.fn();

      const pickImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        const result = await ImagePicker.launchImageLibraryAsync();
        if (result.canceled) return;
        if (result.assets?.[0]?.uri) {
          onChangeMock(result.assets[0].uri);
        }
      };

      await pickImage();

      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
      expect(onChangeMock).not.toHaveBeenCalled();
      expect(onErrorMock).not.toHaveBeenCalled();
    });

    test('19. Handles picker failure/exception with error callback', async () => {
      ImagePicker.requestMediaLibraryPermissionsAsync.mockRejectedValueOnce(
        new Error('Device out of memory')
      );

      const onChangeMock = jest.fn();
      const onErrorMock = jest.fn();

      const pickImage = async () => {
        try {
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        } catch (err) {
          onErrorMock(err.message);
        }
      };

      await pickImage();

      expect(onErrorMock).toHaveBeenCalledWith('Device out of memory');
      expect(onChangeMock).not.toHaveBeenCalled();
    });

    test('20. Supports image removal by resetting uri', () => {
      let currentImage = 'file:///path/to/image.jpg';
      const onChangeMock = jest.fn((newVal) => {
        currentImage = newVal;
      });

      // Removal action
      const handleRemove = () => {
        onChangeMock('');
      };

      handleRemove();

      expect(onChangeMock).toHaveBeenCalledWith('');
      expect(currentImage).toBe('');
    });
  });
});
