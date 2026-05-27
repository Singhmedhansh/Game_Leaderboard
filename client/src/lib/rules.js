import { TOURNAMENT_TEAMS } from '../data/tournament.js';

export const ADMIN_PASSKEY = 'admin_2026';
export const MATCH_TEAM_COUNT = 12;
export const QUALIFIER_COUNT = 6;
export const MATCH_COUNT = 3;
export const GROUP_A_COUNT = 11;
export const GROUP_B_COUNT = 10;

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

const normalizeList = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);

const normalizeMatchHistory = (seed = []) => ({
  1: seed[0] ?? { placement: null, kills: 0, points: 0 },
  2: seed[1] ?? { placement: null, kills: 0, points: 0 },
  3: seed[2] ?? { placement: null, kills: 0, points: 0 }
});

export const makeMatchHistory = (seed = []) => normalizeMatchHistory(seed);

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

export const createTeamRecord = (payload, fallbackGroup = 'A') => {
  const bracketGroup = normalizeGroup(payload.bracketGroup || fallbackGroup);
  const playerUids = normalizeList(payload.playerUids);
  const memberNames = normalizeList(payload.memberNames || payload.members);

  return {
    id: payload.id || `team-${Date.now()}`,
    teamName: String(payload.teamName || '').trim(),
    leaderName: String(payload.leaderName || '').trim(),
    leaderInGameName: String(payload.leaderInGameName || payload.inGameName || '').trim(),
    leaderUid: String(payload.leaderUid || '').trim(),
    memberNames,
    playerUids,
    bracketGroup,
    matchesPlayed: Number(payload.matchesPlayed || 0),
    totalBooyahs: Number(payload.totalBooyahs || 0),
    totalKills: Number(payload.totalKills || 0),
    totalPoints: Number(payload.totalPoints || payload.seedPoints || 0),
    isQualified: Boolean(payload.isQualified),
    matchHistory: normalizeMatchHistory(payload.matchHistory)
  };
};

export const createTournamentState = () => {
  const teams = TOURNAMENT_TEAMS.map((team, index) =>
    createTeamRecord(team, index < GROUP_A_COUNT ? 'A' : 'B')
  );

  refreshQualification(teams);
  return { teams };
};

export const validateTeamPayload = (payload) => {
  const playerUids = normalizeList(payload.playerUids);

  if (!String(payload.teamName || '').trim() || !String(payload.leaderName || '').trim()) {
    throw new Error('Team name and leader name are required');
  }

  if (playerUids.length && new Set(playerUids).size !== playerUids.length) {
    throw new Error('Player UIDs must be unique');
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
  const matchId = Number(matchNumber) || 1;
  const previous = team.matchHistory?.[matchId] || { placement: null, kills: 0, points: 0 };

  const previousPlacement = Number(previous.placement);
  const previousKills = Number(previous.kills || 0);
  const previousPoints = Number(previous.points || 0);

  if (Number.isInteger(previousPlacement) && previousPlacement >= 1 && previousPlacement <= MATCH_TEAM_COUNT) {
    team.totalPoints -= previousPoints;
    team.totalKills -= previousKills;
    if (previousPlacement === 1) {
      team.totalBooyahs -= 1;
    }
  }

  const placementPoints = scoreTable[placement] || 0;
  const roundPoints = placementPoints + kills;

  team.totalPoints += roundPoints;
  team.totalKills += kills;
  team.totalBooyahs += placement === 1 ? 1 : 0;
  team.matchHistory[matchId] = { placement, kills, points: roundPoints };

  const playedMatches = Array.from({ length: MATCH_COUNT }, (_, index) => index + 1).filter((round) => {
    const roundPlacement = Number(team.matchHistory?.[round]?.placement);
    return Number.isInteger(roundPlacement) && roundPlacement >= 1 && roundPlacement <= MATCH_TEAM_COUNT;
  });

  team.matchesPlayed = playedMatches.length ? Math.max(...playedMatches) : 0;
  team.totalPoints = Math.max(0, team.totalPoints);
  team.totalKills = Math.max(0, team.totalKills);
  team.totalBooyahs = Math.max(0, team.totalBooyahs);
};

export const clearMatchScore = (team, matchNumber) => {
  const matchId = Number(matchNumber) || 1;
  const previous = team.matchHistory?.[matchId] || { placement: null, kills: 0, points: 0 };
  const previousPlacement = Number(previous.placement);
  const previousKills = Number(previous.kills || 0);
  const previousPoints = Number(previous.points || 0);

  if (Number.isInteger(previousPlacement) && previousPlacement >= 1 && previousPlacement <= MATCH_TEAM_COUNT) {
    team.totalPoints = Math.max(0, team.totalPoints - previousPoints);
    team.totalKills = Math.max(0, team.totalKills - previousKills);
    if (previousPlacement === 1) {
      team.totalBooyahs = Math.max(0, team.totalBooyahs - 1);
    }
  }

  team.matchHistory[matchId] = { placement: null, kills: 0, points: 0 };

  const playedMatches = Array.from({ length: MATCH_COUNT }, (_, index) => index + 1).filter((round) => {
    const roundPlacement = Number(team.matchHistory?.[round]?.placement);
    return Number.isInteger(roundPlacement) && roundPlacement >= 1 && roundPlacement <= MATCH_TEAM_COUNT;
  });

  team.matchesPlayed = playedMatches.length ? Math.max(...playedMatches) : 0;
};

const hasCompletedAllMatches = (team) =>
  Array.from({ length: MATCH_COUNT }, (_, index) => index + 1).every((matchIndex) => {
    const match = team.matchHistory?.[matchIndex];
    const placement = Number(match?.placement);
    const kills = Number(match?.kills);

    return Number.isInteger(placement) && placement >= 1 && placement <= MATCH_TEAM_COUNT && Number.isFinite(kills) && kills >= 0;
  });

export const isQualificationUnlocked = (teams) => {
  const groupA = teams.filter((team) => team.bracketGroup === 'A');
  const groupB = teams.filter((team) => team.bracketGroup === 'B');

  if (!groupA.length || !groupB.length) {
    return false;
  }

  return groupA.every(hasCompletedAllMatches) && groupB.every(hasCompletedAllMatches);
};

export const refreshQualification = (teams) => {
  const groupA = sortTeams(teams.filter((team) => team.bracketGroup === 'A'));
  const groupB = sortTeams(teams.filter((team) => team.bracketGroup === 'B'));
  const unlocked = isQualificationUnlocked(teams);

  teams.forEach((team) => {
    if (team.bracketGroup === 'finals') {
      team.isQualified = true;
      return;
    }

    if (!unlocked) {
      team.isQualified = false;
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