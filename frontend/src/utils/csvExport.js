import { Platform } from 'react-native';

/**
 * Escapes a single CSV cell value according to RFC 4180
 * and mitigates formula injection vulnerabilities.
 *
 * @param {any} val
 * @returns {string} Escaped CSV cell string
 */
export const escapeCsvCell = (val) => {
  if (val === null || val === undefined) {
    return '""';
  }

  let str = String(val).trim();

  // Mitigate formula injection in spreadsheets (Excel, Google Sheets, LibreOffice)
  if (/^[=+@\-]/.test(str)) {
    str = `'${str}`;
  }

  // Double internal quotes
  const escaped = str.replace(/"/g, '""');

  return `"${escaped}"`;
};

/**
 * Formats competition participant roster records into an escaped CSV string.
 * Strips any sensitive authentication or internal system fields.
 *
 * @param {Array<object>} participants
 * @param {string} [competitionTitle]
 * @returns {string} Formatted CSV string
 */
export const generateRosterCsv = (participants = [], competitionTitle = 'Competition') => {
  const headers = [
    'Registration ID',
    'Full Name',
    'Email',
    'Phone',
    'Status',
    'Registered Date',
    'College / Org',
    'Experience Level',
  ];

  const rows = (Array.isArray(participants) ? participants : []).map((p) => {
    const regId = p.registrationId || p._id || '';
    const fullName = p.participantDetails?.fullName || p.user?.name || '';
    const email = p.participantDetails?.email || p.user?.email || '';
    const phone = p.participantDetails?.phone || p.user?.phoneNumber || '';
    const status = p.status || 'CONFIRMED';
    const regDate = p.registeredAt
      ? new Date(p.registeredAt).toISOString().split('T')[0]
      : '';
    const college =
      p.participantDetails?.collegeOrOrg ||
      p.user?.college ||
      p.user?.organization ||
      '';
    const exp =
      p.participantDetails?.experienceLevel ||
      p.user?.experienceLevel ||
      '';

    return [
      escapeCsvCell(regId),
      escapeCsvCell(fullName),
      escapeCsvCell(email),
      escapeCsvCell(phone),
      escapeCsvCell(status),
      escapeCsvCell(regDate),
      escapeCsvCell(college),
      escapeCsvCell(exp),
    ].join(',');
  });

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
};

/**
 * Triggers CSV file download in Web environments or returns CSV content string
 *
 * @param {string} csvContent
 * @param {string} filename
 * @returns {boolean} Whether download was successfully dispatched
 */
export const downloadCsvFile = (csvContent, filename = 'participant_roster.csv') => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  }
  return false;
};
