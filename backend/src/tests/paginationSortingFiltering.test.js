const request = require('supertest');
const app = require('../app');
const Competition = require('../models/Competition');
const User = require('../models/User');
const { LIFECYCLE_STATUS } = require('../constants/competitionStatus');

describe('Database-Level Pagination, Sorting, and Filtering Test Suite', () => {
  const now = new Date();
  const addDays = (d, days) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
  const subDays = (d, days) => new Date(d.getTime() - days * 24 * 60 * 60 * 1000);

  let creatorUser;

  beforeEach(async () => {
    // Clear collections before each test
    await Competition.deleteMany({});
    await User.deleteMany({});

    creatorUser = await User.create({
      name: 'Owner User',
      email: `owner_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`,
      phoneNumber: '+91 9998887776',
      password: 'securePassword123',
    });
  });

  describe('1. Pagination & Metadata', () => {
    test('P1. Returns paginated results with total, page, limit, and totalPages metadata', async () => {
      // Create 5 competitions
      for (let i = 1; i <= 5; i++) {
        await Competition.create({
          title: `Pagination Event ${i}`,
          description: `Description for event ${i}`,
          category: 'Technology',
          organizer: 'Organizer Tech',
          registrationStartDate: subDays(now, 2),
          registrationDeadline: addDays(now, 2),
          startDate: addDays(now, i + 3),
          endDate: addDays(now, i + 5),
          totalSpots: 20,
          registeredCount: i,
          createdBy: creatorUser._id,
        });
      }

      // Request Page 1 with limit 2
      const resPage1 = await request(app).get('/api/competitions?page=1&limit=2');
      expect(resPage1.status).toBe(200);
      expect(resPage1.body.success).toBe(true);
      expect(resPage1.body.data.competitions.length).toBe(2);
      expect(resPage1.body.data.total).toBe(5);
      expect(resPage1.body.data.page).toBe(1);
      expect(resPage1.body.data.limit).toBe(2);
      expect(resPage1.body.data.totalPages).toBe(3);
      expect(resPage1.body.data.competitions[0].title).toBe('Pagination Event 1');
      expect(resPage1.body.data.competitions[1].title).toBe('Pagination Event 2');

      // Request Page 2 with limit 2
      const resPage2 = await request(app).get('/api/competitions?page=2&limit=2');
      expect(resPage2.status).toBe(200);
      expect(resPage2.body.data.competitions.length).toBe(2);
      expect(resPage2.body.data.page).toBe(2);
      expect(resPage2.body.data.competitions[0].title).toBe('Pagination Event 3');
      expect(resPage2.body.data.competitions[1].title).toBe('Pagination Event 4');

      // Request Page 3 with limit 2 (last page with 1 item)
      const resPage3 = await request(app).get('/api/competitions?page=3&limit=2');
      expect(resPage3.status).toBe(200);
      expect(resPage3.body.data.competitions.length).toBe(1);
      expect(resPage3.body.data.page).toBe(3);
      expect(resPage3.body.data.competitions[0].title).toBe('Pagination Event 5');
    });

    test('P2. Gracefully sanitizes invalid pagination parameters (strings, negative, zero, excessive)', async () => {
      await Competition.create({
        title: 'Single Event',
        description: 'Single event description',
        registrationStartDate: subDays(now, 1),
        registrationDeadline: addDays(now, 2),
        startDate: addDays(now, 4),
        endDate: addDays(now, 6),
        totalSpots: 10,
        createdBy: creatorUser._id,
      });

      // Negative page and invalid string limit -> fallback to page 1, limit 20
      const res1 = await request(app).get('/api/competitions?page=-5&limit=invalid');
      expect(res1.status).toBe(200);
      expect(res1.body.data.page).toBe(1);
      expect(res1.body.data.limit).toBe(20);
      expect(res1.body.data.total).toBe(1);

      // Page 0 and limit 0 -> fallback to page 1, limit 20
      const res2 = await request(app).get('/api/competitions?page=0&limit=0');
      expect(res2.status).toBe(200);
      expect(res2.body.data.page).toBe(1);
      expect(res2.body.data.limit).toBe(20);

      // Excessive limit > 100 is capped at 100
      const res3 = await request(app).get('/api/competitions?limit=999');
      expect(res3.status).toBe(200);
      expect(res3.body.data.limit).toBe(100);
    });

    test('P3. Returns empty array with proper metadata when no competitions match or page exceeds totalPages', async () => {
      // Empty database
      const resEmpty = await request(app).get('/api/competitions');
      expect(resEmpty.status).toBe(200);
      expect(resEmpty.body.data.competitions).toEqual([]);
      expect(resEmpty.body.data.total).toBe(0);
      expect(resEmpty.body.data.page).toBe(1);
      expect(resEmpty.body.data.limit).toBe(20);
      expect(resEmpty.body.data.totalPages).toBe(0);

      // Page beyond total pages
      await Competition.create({
        title: 'One Competition',
        description: 'Testing beyond page',
        registrationStartDate: subDays(now, 1),
        registrationDeadline: addDays(now, 2),
        startDate: addDays(now, 4),
        endDate: addDays(now, 6),
        totalSpots: 10,
        createdBy: creatorUser._id,
      });

      const resBeyond = await request(app).get('/api/competitions?page=10&limit=5');
      expect(resBeyond.status).toBe(200);
      expect(resBeyond.body.data.competitions).toEqual([]);
      expect(resBeyond.body.data.total).toBe(1);
      expect(resBeyond.body.data.page).toBe(10);
      expect(resBeyond.body.data.limit).toBe(5);
      expect(resBeyond.body.data.totalPages).toBe(1);
    });
  });

  describe('2. Sorting', () => {
    test('S1. Supports sorting by field and order ascending/descending', async () => {
      await Competition.create([
        {
          title: 'Alpha Hackathon',
          description: 'A event',
          registrationStartDate: subDays(now, 2),
          registrationDeadline: addDays(now, 2),
          startDate: addDays(now, 10),
          endDate: addDays(now, 12),
          totalSpots: 50,
          registeredCount: 5,
          createdBy: creatorUser._id,
        },
        {
          title: 'Beta Hackathon',
          description: 'B event',
          registrationStartDate: subDays(now, 2),
          registrationDeadline: addDays(now, 2),
          startDate: addDays(now, 5),
          endDate: addDays(now, 7),
          totalSpots: 30,
          registeredCount: 20,
          createdBy: creatorUser._id,
        },
        {
          title: 'Gamma Hackathon',
          description: 'C event',
          registrationStartDate: subDays(now, 2),
          registrationDeadline: addDays(now, 2),
          startDate: addDays(now, 8),
          endDate: addDays(now, 9),
          totalSpots: 100,
          registeredCount: 15,
          createdBy: creatorUser._id,
        },
      ]);

      // Sort by startDate descending (latest first)
      const resDesc = await request(app).get('/api/competitions?sortBy=startDate&order=desc');
      expect(resDesc.status).toBe(200);
      expect(resDesc.body.data.competitions[0].title).toBe('Alpha Hackathon'); // 10 days out
      expect(resDesc.body.data.competitions[1].title).toBe('Gamma Hackathon'); // 8 days out
      expect(resDesc.body.data.competitions[2].title).toBe('Beta Hackathon');  // 5 days out

      // Sort by registeredCount ascending
      const resCountAsc = await request(app).get('/api/competitions?sortBy=registeredCount&order=asc');
      expect(resCountAsc.status).toBe(200);
      expect(resCountAsc.body.data.competitions[0].registeredCount).toBe(5);
      expect(resCountAsc.body.data.competitions[1].registeredCount).toBe(15);
      expect(resCountAsc.body.data.competitions[2].registeredCount).toBe(20);

      // Sort by prefix format: sort="-title"
      const resTitleDesc = await request(app).get('/api/competitions?sort=-title');
      expect(resTitleDesc.status).toBe(200);
      expect(resTitleDesc.body.data.competitions[0].title).toBe('Gamma Hackathon');
      expect(resTitleDesc.body.data.competitions[1].title).toBe('Beta Hackathon');
      expect(resTitleDesc.body.data.competitions[2].title).toBe('Alpha Hackathon');
    });
  });

  describe('3. Filtering & Applied Before Pagination', () => {
    test('F1. Filters by category and recalculates total before pagination', async () => {
      // 3 Tech events, 2 Design events
      for (let i = 1; i <= 3; i++) {
        await Competition.create({
          title: `Tech Comp ${i}`,
          description: 'Tech desc',
          category: 'Technology',
          registrationStartDate: subDays(now, 2),
          registrationDeadline: addDays(now, 2),
          startDate: addDays(now, i + 3),
          endDate: addDays(now, i + 5),
          totalSpots: 20,
          createdBy: creatorUser._id,
        });
      }
      for (let i = 1; i <= 2; i++) {
        await Competition.create({
          title: `Design Comp ${i}`,
          description: 'Design desc',
          category: 'Design',
          registrationStartDate: subDays(now, 2),
          registrationDeadline: addDays(now, 2),
          startDate: addDays(now, i + 3),
          endDate: addDays(now, i + 5),
          totalSpots: 20,
          createdBy: creatorUser._id,
        });
      }

      // Filter category=Technology with limit=2 (page 1 of 2)
      const resTech = await request(app).get('/api/competitions?category=Technology&page=1&limit=2');
      expect(resTech.status).toBe(200);
      expect(resTech.body.data.total).toBe(3); // Filter applied before pagination
      expect(resTech.body.data.totalPages).toBe(2);
      expect(resTech.body.data.competitions.length).toBe(2);
      expect(resTech.body.data.competitions.every((c) => c.category === 'Technology')).toBe(true);

      // Filter category=Design
      const resDesign = await request(app).get('/api/competitions?category=Design');
      expect(resDesign.status).toBe(200);
      expect(resDesign.body.data.total).toBe(2);
      expect(resDesign.body.data.competitions.length).toBe(2);
      expect(resDesign.body.data.competitions.every((c) => c.category === 'Design')).toBe(true);
    });

    test('F1b. Categories taxonomy endpoint and Sports & Games subcategory filtering', async () => {
      // Create Sports & Games events with Cricket and Chess
      await Competition.create({
        title: 'Inter-College Cricket Championship',
        description: 'T20 tournament for collegiate teams',
        category: 'Sports & Games',
        sportType: 'Cricket',
        subcategory: 'Cricket',
        registrationStartDate: addDays(now, -1),
        registrationDeadline: addDays(now, 2),
        startDate: addDays(now, 4),
        endDate: addDays(now, 6),
        totalSpots: 16,
        createdBy: creatorUser._id,
      });

      await Competition.create({
        title: 'Grandmaster Blitz Chess Open',
        description: 'FIDE rated rapid and blitz chess tournament',
        category: 'Sports & Games',
        sportType: 'Chess',
        subcategory: 'Chess',
        registrationStartDate: addDays(now, -1),
        registrationDeadline: addDays(now, 2),
        startDate: addDays(now, 5),
        endDate: addDays(now, 7),
        totalSpots: 64,
        createdBy: creatorUser._id,
      });

      // 1. Fetch categories taxonomy endpoint
      const catRes = await request(app).get('/api/competitions/categories');
      expect(catRes.status).toBe(200);
      expect(catRes.body.data.categories.length).toBeGreaterThanOrEqual(13);
      expect(catRes.body.data.sportsExamples).toContain('Cricket');
      expect(catRes.body.data.sportsExamples).toContain('Football');
      expect(catRes.body.data.sportsExamples).toContain('Chess');

      // 2. Filter by Sports & Games category
      const sportsRes = await request(app).get('/api/competitions?category=Sports%20%26%20Games');
      expect(sportsRes.status).toBe(200);
      expect(sportsRes.body.data.competitions.every((c) => c.category === 'Sports & Games')).toBe(true);

      // 3. Filter by sportType=Cricket
      const cricketRes = await request(app).get('/api/competitions?category=Sports%20%26%20Games&sportType=Cricket');
      expect(cricketRes.status).toBe(200);
      expect(cricketRes.body.data.competitions.length).toBe(1);
      expect(cricketRes.body.data.competitions[0].sportType).toBe('Cricket');

      // 4. Search by sport name
      const searchRes = await request(app).get('/api/competitions?search=Blitz%20Chess');
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.competitions.some((c) => c.title.includes('Chess'))).toBe(true);
    });

    test('F2. Filters by dynamic lifecycle status at database level', async () => {
      // 1 UPCOMING (regStartDate in future)
      await Competition.create({
        title: 'Upcoming Comp',
        description: 'Upcoming desc',
        registrationStartDate: addDays(now, 2),
        registrationDeadline: addDays(now, 5),
        startDate: addDays(now, 7),
        endDate: addDays(now, 9),
        totalSpots: 20,
        createdBy: creatorUser._id,
      });

      // 1 REGISTRATION_OPEN (regStartDate past, deadline future, spots available)
      await Competition.create({
        title: 'Open Comp',
        description: 'Open desc',
        registrationStartDate: subDays(now, 2),
        registrationDeadline: addDays(now, 2),
        startDate: addDays(now, 5),
        endDate: addDays(now, 7),
        totalSpots: 20,
        registeredCount: 5,
        createdBy: creatorUser._id,
      });

      // 1 FULL (regStartDate past, deadline future, registeredCount >= totalSpots)
      await Competition.create({
        title: 'Full Comp',
        description: 'Full desc',
        registrationStartDate: subDays(now, 2),
        registrationDeadline: addDays(now, 2),
        startDate: addDays(now, 5),
        endDate: addDays(now, 7),
        totalSpots: 10,
        registeredCount: 10,
        createdBy: creatorUser._id,
      });

      // Query status=UPCOMING
      const resUpcoming = await request(app).get('/api/competitions?status=UPCOMING');
      expect(resUpcoming.status).toBe(200);
      expect(resUpcoming.body.data.total).toBe(1);
      expect(resUpcoming.body.data.competitions[0].title).toBe('Upcoming Comp');
      expect(resUpcoming.body.data.competitions[0].lifecycleStatus).toBe(LIFECYCLE_STATUS.UPCOMING);

      // Query status=REGISTRATION_OPEN
      const resOpen = await request(app).get('/api/competitions?status=REGISTRATION_OPEN');
      expect(resOpen.status).toBe(200);
      expect(resOpen.body.data.total).toBe(1);
      expect(resOpen.body.data.competitions[0].title).toBe('Open Comp');
      expect(resOpen.body.data.competitions[0].lifecycleStatus).toBe(LIFECYCLE_STATUS.REGISTRATION_OPEN);

      // Query status=FULL
      const resFull = await request(app).get('/api/competitions?status=FULL');
      expect(resFull.status).toBe(200);
      expect(resFull.body.data.total).toBe(1);
      expect(resFull.body.data.competitions[0].title).toBe('Full Comp');
      expect(resFull.body.data.competitions[0].lifecycleStatus).toBe(LIFECYCLE_STATUS.FULL);
    });

    test('F3. Filters by search query matching title or organizer', async () => {
      await Competition.create([
        {
          title: 'Quantum Computing Sprint',
          description: 'Build quantum algorithms',
          organizer: 'MIT Quantum Lab',
          registrationStartDate: subDays(now, 2),
          registrationDeadline: addDays(now, 2),
          startDate: addDays(now, 5),
          endDate: addDays(now, 7),
          totalSpots: 20,
          createdBy: creatorUser._id,
        },
        {
          title: 'Web3 Security Challenge',
          description: 'Smart contract audit challenge',
          organizer: 'OpenZeppelin',
          registrationStartDate: subDays(now, 2),
          registrationDeadline: addDays(now, 2),
          startDate: addDays(now, 5),
          endDate: addDays(now, 7),
          totalSpots: 20,
          createdBy: creatorUser._id,
        },
      ]);

      const resSearch = await request(app).get('/api/competitions?search=Quantum');
      expect(resSearch.status).toBe(200);
      expect(resSearch.body.data.total).toBe(1);
      expect(resSearch.body.data.competitions[0].title).toBe('Quantum Computing Sprint');

      // Non-matching search returns empty results
      const resNoMatch = await request(app).get('/api/competitions?search=NonExistentSubject123');
      expect(resNoMatch.status).toBe(200);
      expect(resNoMatch.body.data.total).toBe(0);
      expect(resNoMatch.body.data.competitions).toEqual([]);
      expect(resNoMatch.body.data.totalPages).toBe(0);
    });
  });
});
