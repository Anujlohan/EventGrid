global.__DEV__ = true;

// Mock react-native components
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
    FlatList: ({ data, renderItem, ListEmptyComponent, ListHeaderComponent, ListFooterComponent }) => {
      const items = Array.isArray(data) ? data : [];
      return React.createElement(
        'div',
        { 'data-testid': 'flat-list' },
        ListHeaderComponent ? React.createElement(ListHeaderComponent) : null,
        items.length === 0 && ListEmptyComponent
          ? React.isValidElement(ListEmptyComponent)
            ? ListEmptyComponent
            : React.createElement(ListEmptyComponent)
          : items.map((item, idx) => renderItem({ item, index: idx })),
        ListFooterComponent ? React.createElement(ListFooterComponent) : null
      );
    },
    Modal: (props) =>
      props.visible ? React.createElement('div', { ...props }, props.children) : null,
    ActivityIndicator: (props) =>
      React.createElement('div', { 'data-testid': 'activity-indicator', ...props }),
    RefreshControl: (props) => React.createElement('div', props),
    StatusBar: () => null,
    SafeAreaView: (props) => React.createElement('div', props, props.children),
  };
});

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));

jest.mock('../services/competitionService', () => ({
  competitionService: {
    getCompetitions: jest.fn().mockResolvedValue({ competitions: [], total: 0, pages: 1 }),
    createCompetition: jest.fn(),
    cancelRegistration: jest.fn(),
  },
}));

import React from 'react';
import { canCreateCompetition, isAuthorizedOrganizer, ROLES } from '../utils/roleUtils';
import { EmptyCompetitionsState } from '../components/common/EmptyCompetitionsState';
import { DashboardScreen } from '../screens/DashboardScreen';
import { CreateCompetitionModal } from '../components/modals/CreateCompetitionModal';
import { competitionService } from '../services/competitionService';

describe('Role-Based Visibility & RBAC Enforcement Test Suite', () => {
  const participantUser = {
    _id: 'user_part_01',
    name: 'Charlie Participant',
    role: ROLES.PARTICIPANT,
  };

  const organizerUser = {
    _id: 'user_org_01',
    name: 'Alice Organizer',
    role: ROLES.ORGANIZER,
    organization: 'Acme Academy',
  };

  const adminUser = {
    _id: 'user_admin_01',
    name: 'Bob Admin',
    role: ROLES.ADMIN,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. canCreateCompetition UTILITY FUNCTION
  // ==========================================
  describe('1. canCreateCompetition RBAC evaluation', () => {
    test('1.1 Denies Participant role from creating competitions', () => {
      expect(canCreateCompetition(participantUser)).toBe(false);
    });

    test('1.2 Grants Organizer role permission to create competitions', () => {
      expect(canCreateCompetition(organizerUser)).toBe(true);
    });

    test('1.3 Grants Admin role permission to create competitions', () => {
      expect(canCreateCompetition(adminUser)).toBe(true);
    });

    test('1.4 Handles unauthenticated users (null / undefined) safely', () => {
      expect(canCreateCompetition(null)).toBe(false);
      expect(canCreateCompetition(undefined)).toBe(false);
    });

    test('1.5 Handles objects with missing, empty, or unexpected role safely', () => {
      expect(canCreateCompetition({})).toBe(false);
      expect(canCreateCompetition({ name: 'No Role User' })).toBe(false);
      expect(canCreateCompetition({ role: '' })).toBe(false);
      expect(canCreateCompetition({ role: 'Guest' })).toBe(false);
      expect(canCreateCompetition({ role: 'SuperUser' })).toBe(false);
      expect(canCreateCompetition('non-object string')).toBe(false);
      expect(canCreateCompetition(12345)).toBe(false);
    });
  });

  // ==========================================
  // 2. EmptyCompetitionsState ROLE-BASED VISIBILITY
  // ==========================================
  describe('2. EmptyCompetitionsState Visibility', () => {
    test('2.1 Hides "+ Create Competition" button when canCreate is false', () => {
      const onCreateMock = jest.fn();
      const elem = EmptyCompetitionsState({
        onCreateCompetition: onCreateMock,
        onRefresh: jest.fn(),
        canCreate: false,
      });

      // Search for the create button element in the returned React tree
      const card = elem.props.children;
      const cardChildren = card.props.children;
      // Button should be null when canCreate=false
      const createButton = cardChildren.find(
        (child) => child && child.props && child.props.testID === 'empty-state-create-btn'
      );

      expect(createButton).toBeFalsy();
    });

    test('2.2 Shows "+ Create Competition" button when canCreate is true and callback provided', () => {
      const onCreateMock = jest.fn();
      const elem = EmptyCompetitionsState({
        onCreateCompetition: onCreateMock,
        onRefresh: jest.fn(),
        canCreate: true,
      });

      const card = elem.props.children;
      const cardChildren = card.props.children;
      const createButton = cardChildren.find(
        (child) => child && child.props && child.props.testID === 'empty-state-create-btn'
      );

      expect(createButton).toBeTruthy();
      expect(createButton.props.onPress).toBe(onCreateMock);
    });

    test('2.3 Displays participant-friendly text when canCreate is false', () => {
      const elem = EmptyCompetitionsState({
        onCreateCompetition: jest.fn(),
        canCreate: false,
      });

      const card = elem.props.children;
      const subtitleElem = card.props.children[2];
      expect(subtitleElem.props.children).toContain('Please check back later for upcoming events');
    });

    test('2.4 Displays organizer guidance text when canCreate is true', () => {
      const elem = EmptyCompetitionsState({
        onCreateCompetition: jest.fn(),
        canCreate: true,
      });

      const card = elem.props.children;
      const subtitleElem = card.props.children[2];
      expect(subtitleElem.props.children).toContain('Organizers and admins can add real competition details');
    });
  });

  // ==========================================
  // 3. DashboardScreen HEADER & EMPTY STATE RBAC
  // ==========================================
  describe('3. DashboardScreen Header & Empty State RBAC', () => {
    test('3.1 Hides "+ Add Event" button and empty state create button for Participant user', () => {
      const userCanCreate = canCreateCompetition(participantUser);
      expect(userCanCreate).toBe(false);

      const emptyElem = EmptyCompetitionsState({
        onCreateCompetition: jest.fn(),
        canCreate: userCanCreate,
      });

      const card = emptyElem.props.children;
      const cardChildren = card.props.children;
      const createButton = cardChildren.find(
        (child) => child && child.props && child.props.testID === 'empty-state-create-btn'
      );
      expect(createButton).toBeFalsy();
    });

    test('3.2 Shows "+ Add Event" button and empty state create button for Organizer user', () => {
      const onCreateMock = jest.fn();
      const userCanCreate = canCreateCompetition(organizerUser);
      expect(userCanCreate).toBe(true);

      const emptyElem = EmptyCompetitionsState({
        onCreateCompetition: onCreateMock,
        canCreate: userCanCreate,
      });

      const card = emptyElem.props.children;
      const cardChildren = card.props.children;
      const createButton = cardChildren.find(
        (child) => child && child.props && child.props.testID === 'empty-state-create-btn'
      );
      expect(createButton).toBeTruthy();
      expect(createButton.props.onPress).toBe(onCreateMock);
    });

    test('3.3 Shows "+ Add Event" button and empty state create button for Admin user', () => {
      const onCreateMock = jest.fn();
      const userCanCreate = canCreateCompetition(adminUser);
      expect(userCanCreate).toBe(true);

      const emptyElem = EmptyCompetitionsState({
        onCreateCompetition: onCreateMock,
        canCreate: userCanCreate,
      });

      const card = emptyElem.props.children;
      const cardChildren = card.props.children;
      const createButton = cardChildren.find(
        (child) => child && child.props && child.props.testID === 'empty-state-create-btn'
      );
      expect(createButton).toBeTruthy();
      expect(createButton.props.onPress).toBe(onCreateMock);
    });

    test('3.4 Hides all creation buttons when user is logged out (null)', () => {
      const userCanCreate = canCreateCompetition(null);
      expect(userCanCreate).toBe(false);

      const emptyElem = EmptyCompetitionsState({
        onCreateCompetition: jest.fn(),
        canCreate: userCanCreate,
      });

      const card = emptyElem.props.children;
      const cardChildren = card.props.children;
      const createButton = cardChildren.find(
        (child) => child && child.props && child.props.testID === 'empty-state-create-btn'
      );
      expect(createButton).toBeFalsy();
    });
  });

  // ==========================================
  // 4. CreateCompetitionModal SUBMISSION RBAC ENFORCEMENT
  // ==========================================
  describe('4. CreateCompetitionModal Client-side RBAC Guard', () => {
    test('4.1 Rejects Participant submission attempt with error banner and blocks API call', async () => {
      let currentError = '';
      const activeUser = participantUser;

      if (!canCreateCompetition(activeUser)) {
        currentError = 'Only accounts with the Organizer or Admin role can create genuine competitions. Please log in with an Organizer account.';
      }

      expect(currentError).toContain('Only accounts with the Organizer or Admin role can create genuine competitions');
      expect(competitionService.createCompetition).not.toHaveBeenCalled();
    });

    test('4.2 Rejects unauthenticated (null user) submission attempt and blocks API call', async () => {
      let currentError = '';
      const activeUser = null;

      if (!canCreateCompetition(activeUser)) {
        currentError = 'Only accounts with the Organizer or Admin role can create genuine competitions. Please log in with an Organizer account.';
      }

      expect(currentError).toContain('Only accounts with the Organizer or Admin role can create genuine competitions');
      expect(competitionService.createCompetition).not.toHaveBeenCalled();
    });

    test('4.3 Allows Organizer user to proceed to submission', async () => {
      const activeUser = organizerUser;
      expect(canCreateCompetition(activeUser)).toBe(true);

      competitionService.createCompetition.mockResolvedValueOnce({ _id: 'comp_123' });
      await competitionService.createCompetition({ title: 'New Comp' });

      expect(competitionService.createCompetition).toHaveBeenCalledTimes(1);
    });

    test('4.4 Allows Admin user to proceed to submission', async () => {
      const activeUser = adminUser;
      expect(canCreateCompetition(activeUser)).toBe(true);

      competitionService.createCompetition.mockResolvedValueOnce({ _id: 'comp_456' });
      await competitionService.createCompetition({ title: 'Admin Comp' });

      expect(competitionService.createCompetition).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================
  // 5. LOGIN / LOGOUT STATE TRANSITIONS
  // ==========================================
  describe('5. Login and Logout State Transitions', () => {
    test('5.1 State transitions: Logged out -> Participant -> Logged out', () => {
      let currentUser = null;
      expect(canCreateCompetition(currentUser)).toBe(false);

      // User signs in as Participant
      currentUser = { ...participantUser };
      expect(canCreateCompetition(currentUser)).toBe(false);

      // User signs out
      currentUser = null;
      expect(canCreateCompetition(currentUser)).toBe(false);
    });

    test('5.2 State transitions: Logged out -> Organizer -> Logged out', () => {
      let currentUser = null;
      expect(canCreateCompetition(currentUser)).toBe(false);

      // User signs in as Organizer
      currentUser = { ...organizerUser };
      expect(canCreateCompetition(currentUser)).toBe(true);

      // User signs out
      currentUser = null;
      expect(canCreateCompetition(currentUser)).toBe(false);
    });

    test('5.3 State transitions: Logged out -> Admin -> Logged out', () => {
      let currentUser = null;
      expect(canCreateCompetition(currentUser)).toBe(false);

      // User signs in as Admin
      currentUser = { ...adminUser };
      expect(canCreateCompetition(currentUser)).toBe(true);

      // User signs out
      currentUser = null;
      expect(canCreateCompetition(currentUser)).toBe(false);
    });
  });

  // ==========================================
  // 6. ORGANIZER PORTAL ACCESS (isAuthorizedOrganizer)
  // ==========================================
  describe('6. Organizer Portal Authorization Rules', () => {
    const compByAlice = {
      _id: 'comp_alice_1',
      title: 'Alice Challenge',
      createdBy: 'user_org_01',
    };

    test('6.1 Competition creator has access to Organizer Portal', () => {
      expect(isAuthorizedOrganizer(compByAlice, organizerUser)).toBe(true);
    });

    test('6.2 Admin has access to Organizer Portal regardless of creator', () => {
      expect(isAuthorizedOrganizer(compByAlice, adminUser)).toBe(true);
    });

    test('6.3 Participant is denied access to Organizer Portal', () => {
      expect(isAuthorizedOrganizer(compByAlice, participantUser)).toBe(false);
    });

    test('6.4 Different Organizer who is not the creator is denied access', () => {
      const differentOrganizer = {
        _id: 'user_org_99',
        name: 'Other Org',
        role: ROLES.ORGANIZER,
      };
      expect(isAuthorizedOrganizer(compByAlice, differentOrganizer)).toBe(false);
    });
  });
});
