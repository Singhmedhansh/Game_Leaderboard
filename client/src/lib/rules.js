export const MATCH_TEAM_COUNT = 12;
export const QUALIFIER_COUNT = 6;
export const MATCH_COUNT = 3;

export const scoreTable = {
  1: 12,
  2: 9,
  3: 8,
  4: 7,
  5: 6,
  6: 5,
  7: 4,
  8: 3,
  9: 2,
  10: 1,
  11: 0,
  12: 0
};

export const makeMatchHistory = (seed = []) => ({
  1: seed[0] ?? { placement: null, kills: 0, points: 0 },
  2: seed[1] ?? { placement: null, kills: 0, points: 0 },
  3: seed[2] ?? { placement: null, kills: 0, points: 0 }
});

export const normalizeGroup = (group) => {
  const value = String(group || 'A').toLowerCase();
  if (value === 'b') return 'B';
  if (value === 'finals') return 'finals';
  return 'A';
};

export const sortTeams = (list) =>
  [...list].sort(
    (left, right) =>
      right.totalPoints - left.totalPoints ||
      right.totalBooyahs - left.totalBooyahs ||
      right.totalKills - left.totalKills ||
      left.teamName.localeCompare(right.teamName)
  );

export const createTeamRecord = (payload) => ({
  id: payload.id || `team-${Date.now()}`,
  teamName: String(payload.teamName || '').trim(),
  leaderName: String(payload.leaderName || '').trim(),
  playerUids: Array.isArray(payload.playerUids) ? payload.playerUids.map((uid) => String(uid).trim()).filter(Boolean) : [],
  bracketGroup: normalizeGroup(payload.bracketGroup),
  matchesPlayed: 0,
  totalBooyahs: 0,
  totalKills: 0,
  totalPoints: 0,
  isQualified: false,
  matchHistory: makeMatchHistory()
});

export const validateTeamPayload = (payload) => {
  const playerUids = Array.isArray(payload.playerUids) ? payload.playerUids.map((uid) => String(uid).trim()).filter(Boolean) : [];

  if (!String(payload.teamName || '').trim() || !String(payload.leaderName || '').trim()) {
    throw new Error('Team name and leader name are required');
  }

  if (playerUids.length !== 4 || new Set(playerUids).size !== 4) {
    throw new Error('Each team must have 4 unique player UIDs');
  }

  return { ...payload, playerUids };
};

export const validateScoreEntries = (scores) => {
  const normalized = Array.isArray(scores) ? scores : [];
  const seenTeams = new Set();

  if (normalized.length > MATCH_TEAM_COUNT) {
    throw new Error('A match can contain at most 12 teams');
  }

  normalized.forEach((entry) => {
    const teamKey = String(entry.teamId || entry.teamName || '').trim();
    const placement = Number(entry.placement);
    const kills = Number(entry.kills || 0);

    if (!teamKey) {
      throw new Error('Each score row needs a team reference');
    }

    if (seenTeams.has(teamKey)) {
      throw new Error('Duplicate team in scorecard');
    }

    if (!Number.isInteger(placement) || placement < 1 || placement > MATCH_TEAM_COUNT) {
      throw new Error('Placement must be between 1 and 12');
    }

    if (!Number.isFinite(kills) || kills < 0) {
      throw new Error('Kills must be zero or greater');
    }

    seenTeams.add(teamKey);
  });

  return normalized;
};

export const applyMatchScore = (team, placement, kills, matchNumber) => {
  const placementPoints = scoreTable[placement] || 0;
  const roundPoints = placementPoints + kills;
  const matchId = Number(matchNumber) || 1;

  team.totalPoints += roundPoints;
  team.totalKills += kills;
  team.totalBooyahs += placement === 1 ? 1 : 0;
  team.matchesPlayed = Math.max(team.matchesPlayed, matchId);
  team.matchHistory[matchId] = { placement, kills, points: roundPoints };
};

export const refreshQualification = (teams) => {
  const groupA = sortTeams(teams.filter((team) => team.bracketGroup === 'A'));
  const groupB = sortTeams(teams.filter((team) => team.bracketGroup === 'B'));

  teams.forEach((team) => {
    if (team.bracketGroup === 'finals') {
      team.isQualified = true;
      return;
    }

    const rank = team.bracketGroup === 'A' ? groupA.indexOf(team) : groupB.indexOf(team);
    team.isQualified = rank >= 0 && rank < QUALIFIER_COUNT;
  });
};

export const buildFinalists = (teams) => {
  const groupA = sortTeams(teams.filter((team) => team.bracketGroup === 'A')).slice(0, QUALIFIER_COUNT);
  const groupB = sortTeams(teams.filter((team) => team.bracketGroup === 'B')).slice(0, QUALIFIER_COUNT);

  return [...groupA, ...groupB].map((team, index) => ({
    ...team,
    id: `final-${index + 1}`,
    bracketGroup: 'finals',
    matchesPlayed: 0,
    totalBooyahs: 0,
    totalKills: 0,
    totalPoints: 0,
    isQualified: true,
    matchHistory: makeMatchHistory()
  }));
};