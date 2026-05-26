const makeMatchHistory = (seed = []) => ({
  1: seed[0] ?? { placement: null, kills: 0, points: 0 },
  2: seed[1] ?? { placement: null, kills: 0, points: 0 },
  3: seed[2] ?? { placement: null, kills: 0, points: 0 }
});

export const seedTeams = [
  {
    id: 'team-1',
    teamName: 'Burn Orbit',
    leaderName: 'NovaX',
    playerUids: ['FF101', 'FF102', 'FF103', 'FF104'],
    bracketGroup: 'A',
    matchesPlayed: 3,
    totalBooyahs: 1,
    totalKills: 24,
    totalPoints: 57,
    isQualified: true,
    matchHistory: makeMatchHistory([
      { placement: 1, kills: 10, points: 22 },
      { placement: 4, kills: 7, points: 14 },
      { placement: 2, kills: 7, points: 21 }
    ])
  },
  {
    id: 'team-2',
    teamName: 'Red Vipers',
    leaderName: 'Ashen',
    playerUids: ['FF201', 'FF202', 'FF203', 'FF204'],
    bracketGroup: 'A',
    matchesPlayed: 3,
    totalBooyahs: 0,
    totalKills: 20,
    totalPoints: 46,
    isQualified: true,
    matchHistory: makeMatchHistory([
      { placement: 2, kills: 8, points: 17 },
      { placement: 5, kills: 5, points: 11 },
      { placement: 3, kills: 7, points: 18 }
    ])
  },
  {
    id: 'team-3',
    teamName: 'Ghost Surge',
    leaderName: 'Orbit',
    playerUids: ['FF301', 'FF302', 'FF303', 'FF304'],
    bracketGroup: 'B',
    matchesPlayed: 3,
    totalBooyahs: 1,
    totalKills: 18,
    totalPoints: 49,
    isQualified: true,
    matchHistory: makeMatchHistory([
      { placement: 1, kills: 6, points: 18 },
      { placement: 6, kills: 5, points: 10 },
      { placement: 5, kills: 7, points: 21 }
    ])
  },
  {
    id: 'team-4',
    teamName: 'Nova Pulse',
    leaderName: 'Pulse',
    playerUids: ['FF401', 'FF402', 'FF403', 'FF404'],
    bracketGroup: 'B',
    matchesPlayed: 3,
    totalBooyahs: 0,
    totalKills: 16,
    totalPoints: 41,
    isQualified: true,
    matchHistory: makeMatchHistory([
      { placement: 4, kills: 4, points: 11 },
      { placement: 2, kills: 6, points: 15 },
      { placement: 7, kills: 6, points: 15 }
    ])
  }
];
