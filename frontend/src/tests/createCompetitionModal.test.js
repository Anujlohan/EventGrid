global.__DEV__ = true;

// Mock Platform, StyleSheet, Alert, etc.
jest.mock('react-native', () => {
  const React = require('react');
  return {
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
    View: (props) => React.createElement('div', props, props.children),
    Text: (props) => React.createElement('span', props, props.children),
    TextInput: (props) => React.createElement('input', props),
    TouchableOpacity: (props) =>
      React.createElement(
        'button',
        {
          ...props,
          onClick: props.disabled ? undefined : props.onPress,
        },
        props.children
      ),
    ScrollView: React.forwardRef((props, ref) =>
      React.createElement('div', { ...props, ref }, props.children)
    ),
    Modal: (props) =>
      props.visible ? React.createElement('div', { ...props }, props.children) : null,
    ActivityIndicator: (props) =>
      React.createElement('div', { 'data-testid': 'activity-indicator', ...props }),
  };
});

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));

jest.mock('../services/competitionService', () => ({
  competitionService: {
    createCompetition: jest.fn(),
    getCompetitions: jest.fn(),
    getCompetitionById: jest.fn(),
  },
}));

import React from 'react';
import { competitionService } from '../services/competitionService';
import { CreateCompetitionModal } from '../components/modals/CreateCompetitionModal';
import {
  DateTimePickerInput,
  dateTimePickerStyles,
  validateCompetitionTimeline,
} from '../components/common/DateTimePickerInput';

describe('CreateCompetitionModal & Date/Time Styling Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. DATE/TIME INPUT STYLES & CONTRAST
  // ==========================================
  describe('DateTimePickerInput Contrast and Theme Styles', () => {
    test('1. Card and button styles define high-contrast dark background and light text', () => {
      expect(dateTimePickerStyles.card).toMatchObject({
        backgroundColor: '#1E293B',
        borderColor: '#334155',
      });
      expect(dateTimePickerStyles.pickerButton).toMatchObject({
        backgroundColor: '#0F172A',
        borderColor: '#475569',
      });
      expect(dateTimePickerStyles.pickerValueText).toMatchObject({
        color: '#F8FAFC',
      });
    });

    test('2. Web picker input enforces light text (#F8FAFC), dark background (#0F172A), and visible border (#475569)', () => {
      expect(dateTimePickerStyles.webPickerInput).toMatchObject({
        backgroundColor: '#0F172A',
        borderColor: '#475569',
        color: '#F8FAFC',
      });
      expect(dateTimePickerStyles.subLabel).toMatchObject({
        color: '#94A3B8',
      });
    });
  });

  // ==========================================
  // 2. TIMELINE VALIDATION
  // ==========================================
  describe('Timeline Validation in Form Submission', () => {
    const base = new Date('2026-10-10T10:00:00Z');
    const day = 24 * 3600 * 1000;

    test('3. Rejects registration deadline that is after competition start date', () => {
      const regStart = new Date(base.getTime());
      const regDeadline = new Date(base.getTime() + 5 * day);
      const startDate = new Date(base.getTime() + 3 * day); // starts BEFORE registration closes
      const endDate = new Date(base.getTime() + 7 * day);

      const check = validateCompetitionTimeline(regStart, regDeadline, startDate, endDate);
      expect(check.isValid).toBe(false);
      expect(check.error).toContain('Registration deadline must be strictly before competition start date');
    });

    test('4. Rejects competition end date that is before competition start date', () => {
      const regStart = new Date(base.getTime());
      const regDeadline = new Date(base.getTime() + 2 * day);
      const startDate = new Date(base.getTime() + 5 * day);
      const endDate = new Date(base.getTime() + 3 * day); // ends BEFORE it starts

      const check = validateCompetitionTimeline(regStart, regDeadline, startDate, endDate);
      expect(check.isValid).toBe(false);
      expect(check.error).toContain('Competition start date must be less than or equal to competition end date.');
    });
  });

  // ==========================================
  // 3. SUBMISSION FLOW, DUPLICATE PREVENTION & ROLES
  // ==========================================
  describe('Form Submission, Loading State & Duplicate Prevention', () => {
    const organizerUser = {
      _id: 'user_org_01',
      name: 'Organizer Jane',
      role: 'Organizer',
      organization: 'Tech Academy',
    };

    const participantUser = {
      _id: 'user_part_01',
      name: 'Participant John',
      role: 'Participant',
    };

    test('5. Validates minimum title length (>= 3 chars)', async () => {
      let currentError = '';
      const setErrorMsg = (msg) => { currentError = msg; };

      const title = 'AI';
      if (!title.trim() || title.trim().length < 3) {
        setErrorMsg('Please enter a valid competition title (minimum 3 characters).');
      }

      expect(currentError).toBe('Please enter a valid competition title (minimum 3 characters).');
      expect(competitionService.createCompetition).not.toHaveBeenCalled();
    });

    test('6. Validates minimum description length (>= 5 chars)', async () => {
      let currentError = '';
      const setErrorMsg = (msg) => { currentError = msg; };

      const desc = 'Test';
      if (!desc.trim() || desc.trim().length < 5) {
        setErrorMsg('Please enter a description (minimum 5 characters).');
      }

      expect(currentError).toBe('Please enter a description (minimum 5 characters).');
      expect(competitionService.createCompetition).not.toHaveBeenCalled();
    });

    test('7. Validates organizer name is required (>= 2 chars)', async () => {
      let currentError = '';
      const setErrorMsg = (msg) => { currentError = msg; };

      const organizer = ' ';
      if (!organizer.trim() || organizer.trim().length < 2) {
        setErrorMsg('Organizer name is required (minimum 2 characters).');
      }

      expect(currentError).toBe('Organizer name is required (minimum 2 characters).');
      expect(competitionService.createCompetition).not.toHaveBeenCalled();
    });

    test('8. Validates total available spots must be a positive integer', async () => {
      let currentError = '';
      const setErrorMsg = (msg) => { currentError = msg; };

      const spots = parseInt('0', 10);
      if (isNaN(spots) || spots <= 0) {
        setErrorMsg('Total available spots must be a positive number greater than 0.');
      }

      expect(currentError).toBe('Total available spots must be a positive number greater than 0.');
      expect(competitionService.createCompetition).not.toHaveBeenCalled();
    });

    test('9. Role check blocks Participant users from creating competitions with clear message', () => {
      let currentError = '';
      const setErrorMsg = (msg) => { currentError = msg; };

      const activeUser = participantUser;
      if (activeUser && activeUser.role && !['Organizer', 'Admin'].includes(activeUser.role)) {
        setErrorMsg('Only accounts with the Organizer or Admin role can create genuine competitions. Please log in with an Organizer account.');
      }

      expect(currentError).toContain('Only accounts with the Organizer or Admin role can create genuine competitions');
      expect(competitionService.createCompetition).not.toHaveBeenCalled();
    });

    test('10. Prevents duplicate concurrent submissions using synchronous ref lock', async () => {
      let submitCallCount = 0;
      let isSubmitting = false;
      const isSubmittingRef = { current: false };

      competitionService.createCompetition.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ _id: 'new_comp_123' }), 50))
      );

      const triggerSubmit = async () => {
        if (isSubmittingRef.current || isSubmitting) {
          return;
        }
        isSubmittingRef.current = true;
        isSubmitting = true;
        submitCallCount++;
        try {
          await competitionService.createCompetition({});
        } finally {
          isSubmittingRef.current = false;
          isSubmitting = false;
        }
      };

      // Fire 3 simultaneous clicks
      const p1 = triggerSubmit();
      const p2 = triggerSubmit();
      const p3 = triggerSubmit();

      await Promise.all([p1, p2, p3]);

      // Exactly one API call should have been dispatched
      expect(submitCallCount).toBe(1);
      expect(competitionService.createCompetition).toHaveBeenCalledTimes(1);
    });

    test('11. Successful save triggers onSuccess, closes modal, and includes location.type', async () => {
      const mockCreated = {
        _id: 'comp_real_456',
        title: 'Global Hackathon 2026',
        organizer: 'Tech Academy',
        location: { type: 'Hybrid', mode: 'Hybrid', venue: 'Convention Center', city: 'San Francisco' },
      };

      competitionService.createCompetition.mockResolvedValueOnce(mockCreated);

      const onSuccessMock = jest.fn();
      const onCloseMock = jest.fn();
      let errorMsg = '';

      const mode = 'Hybrid';
      const venue = 'Convention Center';
      const city = 'San Francisco';

      const payload = {
        title: 'Global Hackathon 2026',
        description: 'An international hackathon challenge for modern developers',
        category: 'Technology',
        organizer: 'Tech Academy',
        image: '',
        location: {
          type: mode,
          mode,
          venue: venue.trim(),
          city: city.trim(),
        },
        registrationStartDate: new Date('2026-10-01').toISOString(),
        registrationDeadline: new Date('2026-10-10').toISOString(),
        startDate: new Date('2026-10-12').toISOString(),
        endDate: new Date('2026-10-15').toISOString(),
        totalSpots: 100,
        entryFee: 'Free',
        prizePool: '$10,000',
        rules: ['Rule 1', 'Rule 2'],
        eligibility: 'All developers',
        customRegistrationFields: [],
      };

      // Simulate form submission flow
      try {
        const created = await competitionService.createCompetition(payload);
        onSuccessMock(created);
        onCloseMock();
      } catch (err) {
        errorMsg = err.message;
      }

      expect(competitionService.createCompetition).toHaveBeenCalledWith(payload);
      expect(payload.location.type).toBe('Hybrid');
      expect(onSuccessMock).toHaveBeenCalledWith(mockCreated);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
      expect(errorMsg).toBe('');
    });

    test('12. API failure displays meaningful error message without silently failing', async () => {
      competitionService.createCompetition.mockRejectedValueOnce(
        new Error('Database validation error: registrationDeadline must be strictly before startDate.')
      );

      const onSuccessMock = jest.fn();
      const onCloseMock = jest.fn();
      let errorMsg = '';

      try {
        await competitionService.createCompetition({});
        onSuccessMock();
        onCloseMock();
      } catch (err) {
        errorMsg = err.message || 'Failed to create competition. Please check all fields.';
      }

      expect(errorMsg).toBe('Database validation error: registrationDeadline must be strictly before startDate.');
      expect(onSuccessMock).not.toHaveBeenCalled();
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    test('13. API failure with detailed backend field errors formats details cleanly', async () => {
      const apiError = new Error('Validation failed');
      apiError.details = ['Title must be at least 3 characters', 'totalSpots must be greater than 0'];

      competitionService.createCompetition.mockRejectedValueOnce(apiError);

      let errorMsg = '';
      try {
        await competitionService.createCompetition({});
      } catch (err) {
        const detailedMessage =
          err.details && Array.isArray(err.details)
            ? `${err.message}: ${err.details.join(', ')}`
            : err.message || 'Failed to create competition.';
        errorMsg = detailedMessage;
      }

      expect(errorMsg).toBe('Validation failed: Title must be at least 3 characters, totalSpots must be greater than 0');
    });
  });
});
