const storageKey = 'freefire-leaderboard-state-v2';
const adminPasskey = 'FF-ADMIN-2025';
const useLocalFallback = import.meta.env.DEV;

const makeMatchHistory = () => ({
  1: { placement: null, kills: 0, points: 0 },
  2: { placement: null, kills: 0, points: 0 },
  3: { placement: null, kills: 0, points: 0 }
});
const emptyState = { teams: [] };

const clone = (value) => JSON.parse(JSON.stringify(value));

const scoreTable = {
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

const sortTeams = (list) =>
  [...list].sort((left, right) => right.totalPoints - left.totalPoints || right.totalBooyahs - left.totalBooyahs || right.totalKills - left.totalKills || left.teamName.localeCompare(right.teamName));

const loadLocalState = () => {
  if (typeof window === 'undefined') {
    return clone(emptyState);
  }

  const stored = window.localStorage.getItem(storageKey);
  if (!stored) {
    const initial = clone(emptyState);
    window.localStorage.setItem(storageKey, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(stored);
    return { teams: Array.isArray(parsed.teams) ? parsed.teams : [] };
  } catch {
    const initial = clone(emptyState);
    window.localStorage.setItem(storageKey, JSON.stringify(initial));
    return initial;
  }
};

const saveLocalState = (state) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(state));
};

const localState = () => loadLocalState();

const updateScore = (team, placement, kills, matchNumber) => {
  const placementPoints = scoreTable[placement] || 0;
  const roundPoints = placementPoints + kills;
  const matchId = Number(matchNumber) || 1;
  team.totalPoints += roundPoints;
  team.totalKills += kills;
  if (placement === 1) team.totalBooyahs += 1;
  team.matchesPlayed = Math.max(team.matchesPlayed, matchId);
  team.matchHistory[matchId] = { placement, kills, points: roundPoints };
  team.isQualified = team.totalPoints >= 36 || team.totalBooyahs > 0;
};

const advanceFinals = (passkey) => {
  if (passkey !== adminPasskey) return null;

  const state = localState();
  const groupA = sortTeams(state.teams.filter((team) => team.bracketGroup === 'A')).slice(0, 6);
  const groupB = sortTeams(state.teams.filter((team) => team.bracketGroup === 'B')).slice(0, 6);
  const finalists = sortTeams([...groupA, ...groupB]).map((team, index) => ({
    ...team,
    id: `final-${index + 1}`,
    bracketGroup: 'finals',
    matchesPlayed: 0,
    totalBooyahs: 0,
    totalKills: 0,
    totalPoints: 0,
    isQualified: false,
    matchHistory: makeMatchHistory()
  }));

  state.teams = [...state.teams.filter((team) => team.bracketGroup !== 'finals'), ...finalists];
  saveLocalState(state);
  return finalists;
};

const requestJson = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || 'Request failed');
  }

  return response.json();
};

const withFallback = async (request, fallback) => {
  if (useLocalFallback) {
    return fallback();
  }

  try {
    return await request();
  } catch {
    return fallback();
  }
};

export const api = {
  getStandings: (group) =>
    withFallback(
      () => requestJson(`/api/standings${group ? `?group=${group}` : ''}`),
      () => {
        const state = localState();
        const selected = String(group || 'A').toLowerCase() === 'b'
          ? state.teams.filter((team) => team.bracketGroup === 'B')
          : String(group || 'A').toLowerCase() === 'finals'
            ? state.teams.filter((team) => team.bracketGroup === 'finals')
            : state.teams.filter((team) => team.bracketGroup === 'A');
        return Promise.resolve({ teams: sortTeams(selected) });
      }
    ),
  getRoster: (query) =>
    withFallback(
      () => requestJson(`/api/roster${query ? `?q=${encodeURIComponent(query)}` : ''}`),
      () => {
        const q = String(query || '').toLowerCase();
        const state = localState();
        return Promise.resolve({
          teams: state.teams.filter((team) => [team.teamName, team.leaderName, ...team.playerUids].some((field) => field.toLowerCase().includes(q)))
        });
      }
    ),
  registerTeam: (payload) =>
    withFallback(
      () => requestJson('/api/teams', { method: 'POST', body: JSON.stringify(payload) }),
      () => {
        const state = localState();
        const playerUids = Array.isArray(payload.playerUids) ? payload.playerUids.map(String).filter(Boolean) : [];
        const team = {
          id: payload.id || `team-${Date.now()}`,
          teamName: String(payload.teamName || ''),
          leaderName: String(payload.leaderName || ''),
          playerUids,
          bracketGroup: String(payload.bracketGroup || 'A').toUpperCase() === 'B' ? 'B' : 'A',
          matchesPlayed: 0,
          totalBooyahs: 0,
          totalKills: 0,
          totalPoints: 0,
          isQualified: false,
          matchHistory: makeMatchHistory()
        };
        state.teams.push(team);
        saveLocalState(state);
        return Promise.resolve({ team });
      }
    ),
  submitMatch: (payload) =>
    withFallback(
      () => requestJson('/api/matches', { method: 'POST', body: JSON.stringify(payload) }),
      () => {
        const providedPasskey = String(payload.passkey || payload.adminPasskey || '');
        if (providedPasskey !== adminPasskey) {
          throw new Error('Invalid admin passkey');
        }

        const state = localState();
        const selectedGroup = String(payload.group || 'A').toLowerCase() === 'b' ? 'B' : String(payload.group || 'A').toLowerCase() === 'finals' ? 'finals' : 'A';
        const matchNumber = Number(payload.matchNumber || 1);
        const groupTeams = selectedGroup === 'finals' ? state.teams.filter((team) => team.bracketGroup === 'finals') : state.teams.filter((team) => team.bracketGroup === selectedGroup);
        const scores = Array.isArray(payload.scores) ? payload.scores : [];

        scores.forEach((entry) => {
          const team = groupTeams.find((candidate) => candidate.id === entry.teamId || candidate.teamName === entry.teamName);
          if (!team) return;
          updateScore(team, Number(entry.placement), Number(entry.kills || 0), matchNumber);
        });

        saveLocalState(state);
        return Promise.resolve({ teams: sortTeams(groupTeams) });
      }
    ),
  advanceFinals: (payload) =>
    withFallback(
      () => requestJson('/api/finals/advance', { method: 'POST', body: JSON.stringify(payload) }),
      () => {
        const finalists = advanceFinals(payload.passkey || payload.adminPasskey || '');
        if (!finalists) throw new Error('Invalid admin passkey');
        return Promise.resolve({ teams: finalists });
      }
    )
};
