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

const storageKey = 'codm-leaderboard-state-v1';
const adminPasskey = ADMIN_PASSKEY;
const emptyState = createTournamentState();

const clone = (value) => JSON.parse(JSON.stringify(value));

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

const advanceFinals = (passkey) => {
  if (passkey !== adminPasskey) return null;

  const state = localState();
  const finalists = buildFinalists(state.teams);

  state.teams = [...state.teams.filter((team) => team.bracketGroup !== 'finals'), ...finalists];
  saveLocalState(state);
  return finalists;
};

export const api = {
  getStandings: (group) => Promise.resolve({ teams: sortTeams(localState().teams.filter((team) => group ? team.bracketGroup === group : team.bracketGroup === 'A')) }),
  getRoster: (query) => {
    const q = String(query || '').toLowerCase();
    const state = localState();
    return Promise.resolve({
      teams: state.teams.filter((team) =>
        [team.teamName, team.leaderName, team.leaderInGameName, team.leaderUid, ...(team.memberNames || []), ...team.playerUids].some((field) =>
          String(field || '').toLowerCase().includes(q)
        )
      )
    });
  },
  registerTeam: (payload) => {
    const state = localState();
    const validated = validateTeamPayload(payload);
    const team = createTeamRecord(validated);
    state.teams.push(team);
    refreshQualification(state.teams);
    saveLocalState(state);
    return Promise.resolve({ team });
  },
  submitMatch: (payload) => {
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
  },
  advanceFinals: (payload) => {
    const finalists = advanceFinals(payload.passkey || payload.adminPasskey || '');
    if (!finalists) throw new Error('Invalid admin passkey');
    return Promise.resolve({ teams: finalists });
  }
};
