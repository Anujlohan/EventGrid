export const EVENT_CATEGORIES = Object.freeze([
  {
    id: 'hackathons',
    name: 'Hackathons',
    icon: '⚡',
    badgeColor: '#8B5CF6',
    description: 'Hackathons, buildathons, code sprints & overnight jams',
  },
  {
    id: 'coding-tech',
    name: 'Coding & Tech',
    icon: '💻',
    badgeColor: '#06B6D4',
    description: 'Competitive programming, algorithmic challenges & developer meetups',
  },
  {
    id: 'sports-games',
    name: 'Sports & Games',
    icon: '🏆',
    badgeColor: '#F59E0B',
    description: 'Tournaments, matches & esports across popular physical and digital sports',
    hasSubcategories: true,
    examples: ['Cricket', 'Football', 'Basketball', 'Badminton', 'Chess', 'Esports'],
  },
  {
    id: 'college-fests',
    name: 'College Fests',
    icon: '🎓',
    badgeColor: '#EC4899',
    description: 'Annual collegiate cultural, technical & sports festivals',
  },
  {
    id: 'robotics',
    name: 'Robotics',
    icon: '🤖',
    badgeColor: '#10B981',
    description: 'Robowars, drone racing, line followers & autonomous robotics',
  },
  {
    id: 'workshops',
    name: 'Workshops',
    icon: '🛠️',
    badgeColor: '#3B82F6',
    description: 'Hands-on technical workshops, masterclasses & bootcamps',
  },
  {
    id: 'competitions',
    name: 'Competitions',
    icon: '🎯',
    badgeColor: '#A855F7',
    description: 'Contests, quizzes, debates, case challenges & olympiads',
  },
  {
    id: 'cultural-events',
    name: 'Cultural Events',
    icon: '🎭',
    badgeColor: '#F43F5E',
    description: 'Music, theater, dance, art, photography & literature meets',
  },
  {
    id: 'business-entrepreneurship',
    name: 'Business & Entrepreneurship',
    icon: '💼',
    badgeColor: '#14B8A6',
    description: 'Pitching competitions, startup incubators & business plan summits',
  },
  {
    id: 'design-creative',
    name: 'Design & Creative',
    icon: '🎨',
    badgeColor: '#8B5CF6',
    description: 'UI/UX designathons, graphic arts, 3D modeling & creative media',
  },
  {
    id: 'conferences',
    name: 'Conferences',
    icon: '🎤',
    badgeColor: '#6366F1',
    description: 'Keynotes, panel discussions, professional summits & conventions',
  },
  {
    id: 'academic',
    name: 'Academic',
    icon: '📚',
    badgeColor: '#0EA5E9',
    description: 'Research symposiums, paper presentations & academic seminars',
  },
  {
    id: 'other',
    name: 'Other',
    icon: '✨',
    badgeColor: '#64748B',
    description: 'Community initiatives, expos & multi-disciplinary events',
  },
]);

export const SPORTS_GAMES_EXAMPLES = Object.freeze([
  'Cricket',
  'Football',
  'Basketball',
  'Badminton',
  'Chess',
  'Esports',
]);

export const CATEGORY_NAMES = Object.freeze(EVENT_CATEGORIES.map((c) => c.name));

/**
 * Returns category metadata by name or id (case-insensitive)
 */
export const getCategoryMeta = (categoryName) => {
  if (!categoryName || typeof categoryName !== 'string') return null;
  const normalized = categoryName.trim().toLowerCase();
  return (
    EVENT_CATEGORIES.find(
      (c) => c.name.toLowerCase() === normalized || c.id.toLowerCase() === normalized
    ) || null
  );
};

/**
 * Format category label with icon and optional subcategory/sport
 */
export const formatCategoryLabel = (category, subcategoryOrSport) => {
  const meta = getCategoryMeta(category);
  const icon = meta?.icon || '📌';
  const mainName = meta?.name || category || 'General';
  if (subcategoryOrSport) {
    return `${icon} ${mainName} • ${subcategoryOrSport}`;
  }
  return `${icon} ${mainName}`;
};
