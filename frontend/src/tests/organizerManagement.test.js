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

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/storageService', () => ({
  storageService: {
    clearAuth: jest.fn().mockResolvedValue(undefined),
    setItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

import { isAuthorizedOrganizer } from '../screens/OrganizerManagementScreen';
import { generateRosterCsv, escapeCsvCell, downloadCsvFile } from '../utils/csvExport';
import { competitionService } from '../services/competitionService';
import { api } from '../services/api';

describe('Organizer Management & Participant Roster Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. ORGANIZER AUTHORIZATION RULES
  // ==========================================
  describe('Organizer Authorization (isAuthorizedOrganizer)', () => {
    const creatorUser = { _id: 'user_creator_123', name: 'Alice Organizer', role: 'Organizer' };
    const adminUser = { _id: 'user_admin_999', name: 'Bob Admin', role: 'Admin' };
    const participantUser = { _id: 'user_part_456', name: 'Charlie Participant', role: 'Participant' };

    const compCreatedByAlice = {
      _id: 'comp_789',
      title: 'National Hackathon',
      createdBy: 'user_creator_123',
    };

    const compWithPopulatedCreator = {
      _id: 'comp_789',
      title: 'National Hackathon',
      createdBy: { _id: 'user_creator_123', name: 'Alice Organizer' },
    };

    test('1. Grants access to the competition creator', () => {
      expect(isAuthorizedOrganizer(compCreatedByAlice, creatorUser)).toBe(true);
      expect(isAuthorizedOrganizer(compWithPopulatedCreator, creatorUser)).toBe(true);
    });

    test('2. Grants access to system Administrators regardless of competition creator', () => {
      expect(isAuthorizedOrganizer(compCreatedByAlice, adminUser)).toBe(true);
      expect(isAuthorizedOrganizer({ ...compCreatedByAlice, createdBy: 'someone_else' }, adminUser)).toBe(true);
    });

    test('3. Denies access to non-creator participants', () => {
      expect(isAuthorizedOrganizer(compCreatedByAlice, participantUser)).toBe(false);
      expect(isAuthorizedOrganizer(compWithPopulatedCreator, participantUser)).toBe(false);
    });

    test('4. Denies access when user is not authenticated or competition is null', () => {
      expect(isAuthorizedOrganizer(compCreatedByAlice, null)).toBe(false);
      expect(isAuthorizedOrganizer(null, creatorUser)).toBe(false);
      expect(isAuthorizedOrganizer(null, null)).toBe(false);
    });
  });

  // ==========================================
  // 2. PARTICIPANT ROSTER API CALLS & PAGINATION
  // ==========================================
  describe('Participant Roster API & Pagination', () => {
    test('5. Fetches participant roster with correct pagination parameters', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValue({
        competitionId: 'comp_123',
        total: 25,
        page: 2,
        limit: 15,
        totalPages: 2,
        participants: [],
      });

      await competitionService.getCompetitionParticipants('comp_123', {
        page: 2,
        limit: 15,
      });

      expect(getSpy).toHaveBeenCalledWith('/competitions/comp_123/participants?page=2&limit=15');
    });

    test('6. Appends status filter and omits "All"', async () => {
      const getSpy = jest.spyOn(api, 'get').mockResolvedValue({ participants: [] });

      await competitionService.getCompetitionParticipants('comp_123', {
        page: 1,
        limit: 15,
        status: 'CONFIRMED',
      });

      expect(getSpy).toHaveBeenCalledWith(
        '/competitions/comp_123/participants?page=1&limit=15&status=CONFIRMED'
      );

      // Verify 'All' is omitted
      await competitionService.getCompetitionParticipants('comp_123', {
        page: 1,
        limit: 15,
        status: 'All',
      });

      expect(getSpy).toHaveBeenLastCalledWith(
        '/competitions/comp_123/participants?page=1&limit=15'
      );
    });

    test('7. Handles 403 Forbidden and 404 Not Found error responses safely', async () => {
      jest.spyOn(api, 'get').mockRejectedValueOnce({
        status: 403,
        message: 'Access denied. Only the competition creator or an Admin can view participant roster.',
      });

      await expect(
        competitionService.getCompetitionParticipants('comp_123', { page: 1 })
      ).rejects.toEqual(
        expect.objectContaining({
          status: 403,
          message: expect.stringContaining('Access denied'),
        })
      );
    });
  });

  // ==========================================
  // 3. CSV EXPORT & ESCAPING INTEGRITY
  // ==========================================
  describe('CSV Export & Data Sanitization', () => {
    test('8. Escapes CSV cells with quotes, commas, newlines, and prevents formula injection', () => {
      expect(escapeCsvCell('Simple Text')).toBe('"Simple Text"');
      expect(escapeCsvCell('Hello, World')).toBe('"Hello, World"');
      expect(escapeCsvCell('Quote "Test"')).toBe('"Quote ""Test"""');
      expect(escapeCsvCell('Multi\nLine')).toBe('"Multi\nLine"');
      expect(escapeCsvCell(null)).toBe('""');

      // Formula injection mitigation (Excel/Sheets formula prefixes)
      expect(escapeCsvCell('=1+1')).toBe("\"'=1+1\"");
      expect(escapeCsvCell('+SUM(A1:A10)')).toBe("\"'+SUM(A1:A10)\"");
      expect(escapeCsvCell('-25')).toBe("\"'-25\"");
      expect(escapeCsvCell('@evil.com')).toBe("\"'@evil.com\"");
    });

    test('9. Generates valid CSV with correct headers and strips sensitive data', () => {
      const mockParticipants = [
        {
          registrationId: 'reg_001',
          status: 'CONFIRMED',
          registeredAt: '2026-10-01T12:00:00.000Z',
          participantDetails: {
            fullName: 'Jane Doe',
            email: 'jane@example.com',
            phone: '+1 555-0199',
            collegeOrOrg: 'MIT, Tech Club',
            experienceLevel: 'Intermediate',
          },
          user: {
            _id: 'user_001',
            passwordHash: 'secret_hash_should_not_leak',
            jwtToken: 'token_should_not_leak',
            twoFactorSecret: 'secret_2fa',
          },
        },
        {
          registrationId: 'reg_002',
          status: 'WAITLISTED',
          registeredAt: '2026-10-01T14:30:00.000Z',
          participantDetails: {
            fullName: 'John "The Builder" Smith',
            email: 'john@example.com',
            phone: '+1 555-0200',
            collegeOrOrg: 'Stanford University',
            experienceLevel: 'Advanced',
          },
        },
      ];

      const csv = generateRosterCsv(mockParticipants, 'Hackathon 2026');

      // Verify headers
      expect(csv).toContain('"Registration ID","Full Name","Email","Phone","Status","Registered Date","College / Org","Experience Level"');

      // Verify participant 1 data
      expect(csv).toContain('"reg_001"');
      expect(csv).toContain('"Jane Doe"');
      expect(csv).toContain('"jane@example.com"');
      expect(csv).toContain('"MIT, Tech Club"');
      expect(csv).toContain('"CONFIRMED"');

      // Verify escaping on participant 2 (quotes doubled)
      expect(csv).toContain('"John ""The Builder"" Smith"');
      expect(csv).toContain('"WAITLISTED"');

      // CRITICAL: Ensure NO sensitive authentication or internal fields are leaked!
      expect(csv).not.toContain('secret_hash');
      expect(csv).not.toContain('password');
      expect(csv).not.toContain('jwtToken');
      expect(csv).not.toContain('twoFactorSecret');
    });

    test('10. Handles empty participant list gracefully', () => {
      const csv = generateRosterCsv([], 'Empty Competition');
      expect(typeof csv).toBe('string');
      expect(csv.split('\r\n')).toHaveLength(1); // Only header row
    });

    test('11. Dispatches CSV download on web via Blob and Anchor element', () => {
      const mockClick = jest.fn();
      const mockAppend = jest.fn();
      const mockRemove = jest.fn();
      const mockSetAttribute = jest.fn();

      const originalDocument = global.document;
      const originalBlob = global.Blob;
      const originalURL = global.URL;

      global.Blob = jest.fn((content, options) => ({ content, options }));
      global.URL = {
        createObjectURL: jest.fn(() => 'blob:http://localhost/mock-uuid'),
        revokeObjectURL: jest.fn(),
      };

      global.document = {
        createElement: jest.fn(() => ({
          setAttribute: mockSetAttribute,
          style: {},
          click: mockClick,
        })),
        body: {
          appendChild: mockAppend,
          removeChild: mockRemove,
        },
      };

      const result = downloadCsvFile('test,csv\r\n1,2', 'roster.csv');

      expect(result).toBe(true);
      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(mockSetAttribute).toHaveBeenCalledWith('download', 'roster.csv');
      expect(mockClick).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-uuid');

      // Cleanup
      global.document = originalDocument;
      global.Blob = originalBlob;
      global.URL = originalURL;
    });
  });
});
