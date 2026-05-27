import {
  ADMIN_PASSKEY,
  applyMatchScore,
  buildFinalists,
  createTeamRecord,
  createTournamentState,
  refreshQualification,
  sortTeams,
  validateScoreEntries,
  validateTeamPayload,
  normalizeGroup
} from '../client/src/lib/rules.js';

const adminPasskey = process.env.ADMIN_PASSKEY || ADMIN_PASSKEY;

const teams = createTournamentState().teams;

const json = (statusCode, data) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Passkey',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

const cloneTeam = (team) => ({ ...team, playerUids: [...team.playerUids], matchHistory: structuredClone(team.matchHistory) });

const getGroupTeams = (group) => teams.filter((team) => team.bracketGroup === group);

function advanceFinals(passkey) {
  if (passkey !== adminPasskey) {
    return null;
  }

  const finalists = buildFinalists(teams.map(cloneTeam));

  teams.length = 0;
  teams.push(...finalists);
  return finalists;
}

function handleRequest(req, res) {
  Object.entries(cors).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/standings') {
    const group = (url.searchParams.get('group') || 'A').toLowerCase();
    const selected = group === 'b' ? getGroupTeams('B') : group === 'finals' ? teams.filter((team) => team.bracketGroup === 'finals') : getGroupTeams('A');
    return res.end(JSON.stringify({ teams: sortTeams(selected) }));
  }

  if (req.method === 'GET' && url.pathname === '/api/roster') {
    const query = (url.searchParams.get('q') || '').toLowerCase();
    const roster = teams.filter((team) =>
      [team.teamName, team.leaderName, team.leaderInGameName, team.leaderUid, ...(team.memberNames || []), ...team.playerUids].some((field) =>
        String(field || '').toLowerCase().includes(query)
      )
    );
    return res.end(JSON.stringify({ teams: roster }));
  }

  if (req.method === 'POST' && url.pathname === '/api/teams') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const payload = JSON.parse(body || '{}');
      let validated;

      try {
        validated = validateTeamPayload(payload);
      } catch (error) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ message: error.message || 'Invalid team payload' }));
      }

      const team = createTeamRecord(validated);

      teams.push(team);
      refreshQualification(teams);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ team }));
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/matches') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const payload = JSON.parse(body || '{}');
      if ((payload.passkey || req.headers['x-admin-passkey']) !== adminPasskey) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ message: 'Invalid admin passkey' }));
      }

      const selectedGroup = normalizeGroup(payload.group);
      const matchNumber = Number(payload.matchNumber || 1);
      const groupTeams = selectedGroup === 'finals' ? teams.filter((team) => team.bracketGroup === 'finals') : getGroupTeams(selectedGroup);
      let scores;

      try {
        scores = validateScoreEntries(payload.scores);
      } catch (error) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ message: error.message || 'Invalid scorecard payload' }));
      }

      scores.forEach((entry) => {
        const team = groupTeams.find((candidate) => candidate.id === entry.teamId || candidate.teamName === entry.teamName);
        if (!team) return;
        applyMatchScore(team, Number(entry.placement), Number(entry.kills || 0), matchNumber);
      });

      refreshQualification(teams);

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ teams: sortTeams(groupTeams) }));
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/finals/advance') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const payload = JSON.parse(body || '{}');
      const finalists = advanceFinals(payload.passkey || req.headers['x-admin-passkey']);

      if (!finalists) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ message: 'Invalid admin passkey' }));
      }

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ teams: finalists }));
    });
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ message: 'Not found' }));
}

export default function handler(req, res) {
  handleRequest(req, res);
}
