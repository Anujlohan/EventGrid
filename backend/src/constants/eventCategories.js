const EVENT_CATEGORIES = Object.freeze([
  {
    id: 'hackathons',
    name: 'Hackathons',
    icon: '⚡',
    description: 'Hackathons, buildathons, code sprints & overnight jams',
  },
  {
    id: 'coding-tech',
    name: 'Coding & Tech',
    icon: '💻',
    description: 'Competitive programming, algorithmic challenges & developer meetups',
  },
  {
    id: 'sports-games',
    name: 'Sports & Games',
    icon: '🏆',
    description: 'Tournaments, matches & esports across popular physical and digital sports',
    hasSubcategories: true,
    examples: ['Cricket', 'Football', 'Basketball', 'Badminton', 'Chess', 'Esports'],
  },
  {
    id: 'college-fests',
    name: 'College Fests',
    icon: '🎓',
    description: 'Annual collegiate cultural, technical & sports festivals',
  },
  {
    id: 'robotics',
    name: 'Robotics',
    icon: '🤖',
    description: 'Robowars, drone racing, line followers & autonomous robotics',
  },
  {
    id: 'workshops',
    name: 'Workshops',
    icon: '🛠️',
    description: 'Hands-on technical workshops, masterclasses & bootcamps',
  },
  {
    id: 'competitions',
    name: 'Competitions',
    icon: '🎯',
    description: 'Contests, quizzes, debates, case challenges & olympiads',
  },
  {
    id: 'cultural-events',
    name: 'Cultural Events',
    icon: '🎭',
    description: 'Music, theater, dance, art, photography & literature meets',
  },
  {
    id: 'business-entrepreneurship',
    name: 'Business & Entrepreneurship',
    icon: '💼',
    description: 'Pitching competitions, startup incubators & business plan summits',
  },
  {
    id: 'design-creative',
    name: 'Design & Creative',
    icon: '🎨',
    description: 'UI/UX designathons, graphic arts, 3D modeling & creative media',
  },
  {
    id: 'conferences',
    name: 'Conferences',
    icon: '🎤',
    description: 'Keynotes, panel discussions, professional summits & conventions',
  },
  {
    id: 'academic',
    name: 'Academic',
    icon: '📚',
    description: 'Research symposiums, paper presentations & academic seminars',
  },
  {
    id: 'other',
    name: 'Other',
    icon: '✨',
    description: 'Community initiatives, expos & multi-disciplinary events',
  },
]);

const SPORTS_GAMES_EXAMPLES = Object.freeze([
  'Cricket',
  'Football',
  'Basketball',
  'Badminton',
  'Chess',
  'Esports',
]);

const CATEGORY_NAMES = Object.freeze(EVENT_CATEGORIES.map((c) => c.name));

/**
 * Returns category metadata by name or id (case-insensitive)
 */
const getCategoryMeta = (categoryName) => {
  if (!categoryName || typeof categoryName !== 'string') return null;
  const normalized = categoryName.trim().toLowerCase();
  return (
    EVENT_CATEGORIES.find(
      (c) => c.name.toLowerCase() === normalized || c.id.toLowerCase() === normalized
    ) || null
  );
};

module.exports = {
  EVENT_CATEGORIES,
  SPORTS_GAMES_EXAMPLES,
  CATEGORY_NAMES,
  getCategoryMeta,
};
