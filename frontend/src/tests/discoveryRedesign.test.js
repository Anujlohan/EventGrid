global.__DEV__ = true;

// Mock react-native
jest.mock('react-native', () => {
  const React = require('react');
  return {
    Platform: {
      OS: 'web',
      select: (obj) => (obj ? obj.web || obj.default || Object.values(obj)[0] : undefined),
    },
    StyleSheet: {
      create: (styles) => styles,
    },
    View: (props) => React.createElement('View', props, props.children),
    Text: (props) => React.createElement('Text', props, props.children),
    TouchableOpacity: (props) => React.createElement('TouchableOpacity', props, props.children),
    Pressable: (props) => React.createElement('Pressable', props, props.children),
    TextInput: (props) => React.createElement('TextInput', props, props.children),
    Modal: (props) => (props.visible ? React.createElement('Modal', props, props.children) : null),
    ScrollView: (props) => React.createElement('ScrollView', props, props.children),
    ActivityIndicator: (props) => React.createElement('ActivityIndicator', props, null),
    Image: (props) => React.createElement('Image', props, null),
  };
});

import React from 'react';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import {
  ROUTES,
  PUBLIC_ROUTES,
  PROTECTED_ROUTES,
  isPublicRoute,
  isProtectedRoute,
} from '../navigation/routes';
import { NavigationState } from '../navigation/navigationState';
import { canCreateCompetition, ROLES } from '../utils/roleUtils';
import { ComingSoonModal } from '../components/modals/ComingSoonModal';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyCompetitionsState } from '../components/common/EmptyCompetitionsState';

describe('EventGrid Discovery Platform Redesign Test Suite', () => {
  // ==========================================
  // 1. VISUAL DESIGN TOKENS & DARK PALETTE
  // ==========================================
  describe('Visual Design & Color Tokens', () => {
    test('1. Modern dark interface palette uses deep navy, electric lime, and violet highlights', () => {
      // Deep navy backgrounds
      expect(COLORS.background).toBe('#090D16');
      expect(COLORS.surface).toBe('#121A2D');
      expect(COLORS.card).toBe('#121A2D');

      // Brand and Electric Accents
      expect(COLORS.primary).toBe('#8B5CF6');
      expect(COLORS.violet).toBe('#8B5CF6');
      expect(COLORS.lime).toBe('#A3E635');
      expect(COLORS.textPrimary).toBe('#F8FAFC');
      expect(COLORS.textSecondary).toBe('#94A3B8');
    });

    test('2. Typography scale includes modern editorial sizes for hero discovery layout', () => {
      expect(TYPOGRAPHY.size.hero).toBe(40);
      expect(TYPOGRAPHY.size.display).toBe(48);
      expect(TYPOGRAPHY.size.h1).toBe(32);
      expect(TYPOGRAPHY.size.h2).toBe(28);
      expect(TYPOGRAPHY.weight.bold).toBe('700');
      expect(TYPOGRAPHY.weight.extrabold).toBe('800');
    });
  });

  // ==========================================
  // 2. PUBLIC DISCOVERY & DISABLED AUTH FLOWS
  // ==========================================
  describe('Public Discovery Experience & Disabled Login/Signup Entry Points', () => {
    test('3. Unauthenticated visitors land directly on DASHBOARD without login redirect', () => {
      const nav = new NavigationState({
        isAuthenticated: false,
      });

      expect(nav.getCurrentRoute().name).toBe(ROUTES.DASHBOARD);
      expect(nav.getStack().length).toBe(1);
      expect(isPublicRoute(ROUTES.DASHBOARD)).toBe(true);
      expect(isProtectedRoute(ROUTES.DASHBOARD)).toBe(false);
    });

    test('4. Competition Details is a public route accessible to unauthenticated guests', () => {
      const nav = new NavigationState({
        isAuthenticated: false,
      });

      nav.push(ROUTES.DETAILS, { competitionId: 'hackathon-2026' });
      expect(nav.getCurrentRoute().name).toBe(ROUTES.DETAILS);
      expect(nav.getCurrentRoute().params.competitionId).toBe('hackathon-2026');
      expect(isPublicRoute(ROUTES.DETAILS)).toBe(true);
      expect(isProtectedRoute(ROUTES.DETAILS)).toBe(false);
    });

    test('5. Sensitive screens (PROFILE, ORGANIZER) remain strictly protected from unauthenticated access', () => {
      const onUnauthorizedAttempt = jest.fn();
      const nav = new NavigationState({
        isAuthenticated: false,
        onUnauthorizedAttempt,
      });

      nav.push(ROUTES.PROFILE);
      expect(onUnauthorizedAttempt).toHaveBeenCalledWith(ROUTES.PROFILE);
      expect(nav.getCurrentRoute().name).toBe(ROUTES.LOGIN);

      nav.push(ROUTES.ORGANIZER);
      expect(onUnauthorizedAttempt).toHaveBeenCalledWith(ROUTES.ORGANIZER);
      expect(nav.getCurrentRoute().name).toBe(ROUTES.LOGIN);
    });
  });

  // ==========================================
  // 3. COMING SOON MODAL FOR AUTH-LOCKED ACTIONS
  // ==========================================
  describe('Coming Soon Modal Component for Auth Actions', () => {
    test('6. ComingSoonModal renders polished UI with feature name and informative notice', () => {
      const onCloseMock = jest.fn();
      const modal = ComingSoonModal({
        visible: true,
        featureName: 'Competition Registration',
        onClose: onCloseMock,
      });

      expect(modal).not.toBeNull();
      expect(modal.props.visible).toBe(true);

      // Inspect child structure
      const modalChildren = modal.props.children;
      expect(modalChildren).toBeDefined();
    });

    test('7. ComingSoonModal defaults gracefully when featureName is not specified', () => {
      const modal = ComingSoonModal({
        visible: true,
        onClose: () => {},
      });

      expect(modal).not.toBeNull();
      expect(modal.props.visible).toBe(true);
    });

    test('8. ComingSoonModal sets visible to false when hidden', () => {
      const modal = ComingSoonModal({
        visible: false,
        onClose: () => {},
      });

      expect(modal).not.toBeNull();
      expect(modal.props.visible).toBe(false);
    });
  });

  // ==========================================
  // 4. ROLE-BASED VISIBILITY & AUTHENTICATED STATE
  // ==========================================
  describe('Role-Based Controls & Data Integrity Preservation', () => {
    test('9. Unauthenticated visitor cannot see or trigger Add Event / Create Competition', () => {
      expect(canCreateCompetition(null)).toBe(false);
      expect(canCreateCompetition(undefined)).toBe(false);
      expect(canCreateCompetition({})).toBe(false);
    });

    test('10. Authenticated Participant cannot see or trigger Add Event', () => {
      const participantUser = {
        _id: 'user-part-1',
        name: 'Jane Doe',
        role: 'Participant',
      };
      expect(canCreateCompetition(participantUser)).toBe(false);
    });

    test('11. Authenticated Organizer or Admin can see and trigger Add Event', () => {
      const organizerUser = {
        _id: 'user-org-1',
        name: 'Event Host',
        role: 'Organizer',
      };
      const adminUser = {
        _id: 'user-admin-1',
        name: 'System Admin',
        role: 'Admin',
      };

      expect(canCreateCompetition(organizerUser)).toBe(true);
      expect(canCreateCompetition(adminUser)).toBe(true);
    });
  });

  // ==========================================
  // 5. STATUS BADGE & EMPTY STATE REDESIGN
  // ==========================================
  describe('StatusBadge & Empty States Visual Consistency', () => {
    test('12. StatusBadge renders luminous dark pills with high-contrast dot indicators', () => {
      const openBadge = StatusBadge({ status: 'REGISTRATION_OPEN' });
      expect(openBadge).toBeDefined();

      const children = openBadge.props.children;
      const dot = children[0];
      const text = children[1];

      expect(text.props.children).toBe('Open');
      expect(text.props.style[1].color).toBe('#A3E635');
    });

    test('13. EmptyCompetitionsState renders dark themed container with clear action message', () => {
      const onResetMock = jest.fn();
      const emptyElement = EmptyCompetitionsState({
        title: 'No competitions found',
        message: 'Try adjusting your search criteria.',
        actionLabel: 'Reset Filters',
        onAction: onResetMock,
      });

      expect(emptyElement).toBeDefined();
    });
  });
});
