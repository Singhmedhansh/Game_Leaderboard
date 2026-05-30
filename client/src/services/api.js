import {
  ADMIN_PASSKEY,
  applyMatchScore,
  buildFinalists,
  createTeamRecord,
  createTournamentState,
  makeMatchHistory,
  normalizeGroup,
  refreshQualification,
  scoreTable,
  sortTeams,
  validateScoreEntries,
  validateTeamPayload
} from '../lib/rules.js';

const storageKey = 'freefire-leaderboard-state-v2';
const adminPasskey = ADMIN_PASSKEY;
const useLocalFallback = import.meta.env.DEV;
const emptyState = createTournamentState();

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeFinalsSeedTotals = (state) => ({
  ...state,
  teams: Array.isArray(state.teams)
    ? state.teams.map((team) => {
        if (team.bracketGroup !== 'finals' || Number(team.matchesPlayed || 0) > 0) {
          return team;
        }

        return {
          ...team,
          qualificationBooyahs: Number(team.qualificationBooyahs || team.totalBooyahs || 0),
          qualificationKills: Number(team.qualificationKills || team.totalKills || 0),
          qualificationPoints: Number(team.qualificationPoints || team.totalPoints || 0),
          totalBooyahs: 0,
          totalKills: 0,
          totalPoints: 0
        };
      })
    : []
});

const loadLocalState = () => {
  if (typeof window === 'undefined') {
    return normalizeFinalsSeedTotals(clone(emptyState));
  }

  const stored = window.localStorage.getItem(storageKey);
  if (!stored) {
    const initial = clone(emptyState);
    window.localStorage.setItem(storageKey, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(stored);
    return normalizeFinalsSeedTotals({ teams: Array.isArray(parsed.teams) ? parsed.teams : [] });
  } catch {
    const initial = clone(emptyState);
    window.localStorage.setItem(storageKey, JSON.stringify(initial));
    return normalizeFinalsSeedTotals(initial);
  }
};

const saveLocalState = (state) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(state));
};

const localState = () => loadLocalState();

const advanceFinals = (passkey) => {
  if (passkey !== adminPasskey) return null;

  const state = localState();
  const finalists = buildFinalists(state.teams);

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
          teams: state.teams.filter((team) =>
            [team.teamName, team.leaderName, team.leaderInGameName, team.leaderUid, ...(team.memberNames || []), ...team.playerUids].some((field) =>
              String(field || '').toLowerCase().includes(q)
            )
          )
        });
      }
    ),
  registerTeam: (payload) =>
    withFallback(
      () => requestJson('/api/teams', { method: 'POST', body: JSON.stringify(payload) }),
      () => {
        const state = localState();
        const validated = validateTeamPayload(payload);
        const team = createTeamRecord(validated);
        state.teams.push(team);
        refreshQualification(state.teams);
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
        const selectedGroup = normalizeGroup(payload.group);
        const matchNumber = Number(payload.matchNumber || 1);
        const groupTeams = selectedGroup === 'finals' ? state.teams.filter((team) => team.bracketGroup === 'finals') : state.teams.filter((team) => team.bracketGroup === selectedGroup);
        const scores = validateScoreEntries(payload.scores);

        scores.forEach((entry) => {
          const team = groupTeams.find((candidate) => candidate.id === entry.teamId || candidate.teamName === entry.teamName);
          if (!team) return;
          applyMatchScore(team, Number(entry.placement), Number(entry.kills || 0), matchNumber);
        });

        refreshQualification(state.teams);
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
