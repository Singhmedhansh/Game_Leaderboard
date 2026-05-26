const adminPasskey = process.env.ADMIN_PASSKEY || 'freefire-2026';

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
  10: 1
};

const makeMatchHistory = () => ({
  1: { placement: null, kills: 0, points: 0 },
  2: { placement: null, kills: 0, points: 0 },
  3: { placement: null, kills: 0, points: 0 }
});

const teams = [];

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

const sortTeams = (collection) =>
  [...collection].sort((left, right) => {
    if (right.totalPoints !== left.totalPoints) return right.totalPoints - left.totalPoints;
    if (right.totalBooyahs !== left.totalBooyahs) return right.totalBooyahs - left.totalBooyahs;
    return right.totalKills - left.totalKills;
  });

const cloneTeam = (team) => ({ ...team, playerUids: [...team.playerUids], matchHistory: structuredClone(team.matchHistory) });

const getGroupTeams = (group) => teams.filter((team) => team.bracketGroup === group);

function updateScore(team, placement, kills, matchNumber) {
  const placementPoints = scoreTable[placement] || 0;
  const points = placementPoints + kills;
  team.matchesPlayed += 1;
  team.totalKills += kills;
  team.totalPoints += points;
  if (placement === 1) team.totalBooyahs += 1;
  team.matchHistory[matchNumber] = { placement, kills, points };
}

function advanceFinals(passkey) {
  if (passkey !== adminPasskey) {
    return null;
  }

  const finalists = [...getGroupTeams('A').slice(0, 6), ...getGroupTeams('B').slice(0, 6)].map((team) => ({
    ...cloneTeam(team),
    bracketGroup: 'finals',
    matchesPlayed: 0,
    totalBooyahs: 0,
    totalKills: 0,
    totalPoints: 0,
    isQualified: false,
    matchHistory: {
      1: { placement: null, kills: 0, points: 0 },
      2: { placement: null, kills: 0, points: 0 },
      3: { placement: null, kills: 0, points: 0 }
    }
  }));

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
      [team.teamName, team.leaderName, ...team.playerUids].some((field) => field.toLowerCase().includes(query))
    );
    return res.end(JSON.stringify({ teams: roster }));
  }

  if (req.method === 'POST' && url.pathname === '/api/teams') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const payload = JSON.parse(body || '{}');
      const playerUids = Array.isArray(payload.playerUids) ? payload.playerUids.map(String).filter(Boolean) : [];

      if (!payload.teamName || !payload.leaderName || playerUids.length !== 4 || new Set(playerUids).size !== 4) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ message: 'Invalid team payload' }));
      }

        const team = {
        id: payload.id || `team-${Date.now()}`,
        teamName: String(payload.teamName),
        leaderName: String(payload.leaderName),
        playerUids,
        bracketGroup: payload.bracketGroup === 'B' ? 'B' : 'A',
        matchesPlayed: 0,
        totalBooyahs: 0,
        totalKills: 0,
        totalPoints: 0,
        isQualified: false,
          matchHistory: makeMatchHistory()
      };

      teams.push(team);
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

      const selectedGroup = String(payload.group || 'A').toLowerCase() === 'b' ? 'B' : String(payload.group || 'A').toLowerCase() === 'finals' ? 'finals' : 'A';
      const matchNumber = Number(payload.matchNumber || 1);
      const groupTeams = selectedGroup === 'finals' ? teams.filter((team) => team.bracketGroup === 'finals') : getGroupTeams(selectedGroup);
      const scores = Array.isArray(payload.scores) ? payload.scores : [];

      scores.forEach((entry) => {
        const team = groupTeams.find((candidate) => candidate.id === entry.teamId || candidate.teamName === entry.teamName);
        if (!team) return;
        const placement = Number(entry.placement);
        const kills = Number(entry.kills || 0);
        updateScore(team, placement, kills, matchNumber);
      });

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
