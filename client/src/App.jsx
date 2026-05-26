import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { api } from './services/api';

const headSheet = `
:root {
  --ff-bg: #0a0a0a;
  --ff-panel: #111111;
  --ff-panel-2: #161616;
  --ff-line: rgba(255,255,255,.10);
  --ff-text: #f5f5f5;
  --ff-muted: #a3a3a3;
  --ff-accent: #ea580c;
  --ff-accent-2: #fb923c;
  --ff-success: #f59e0b;
  --ff-radius: 18px;
  --ff-shadow: 0 18px 48px rgba(0,0,0,.45);
  --ff-grid: linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
}

* { box-sizing: border-box; }
html { color-scheme: dark; background: var(--ff-bg); }
body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(234,88,12,.18), transparent 24%),
    radial-gradient(circle at right, rgba(251,146,60,.08), transparent 22%),
    var(--ff-bg);
  color: var(--ff-text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow-x: hidden;
}
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: var(--ff-grid);
  background-size: 44px 44px;
  opacity: .12;
  mask-image: linear-gradient(to bottom, black, transparent 92%);
}
a, button, input, select { font: inherit; }
button { cursor: pointer; }

.ff-shell {
  position: relative;
  z-index: 1;
  width: min(1400px, calc(100% - 32px));
  margin: 0 auto;
  padding: 28px 0 40px;
}

.ff-hero, .ff-panel {
  border: 1px solid var(--ff-line);
  background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.03));
  box-shadow: var(--ff-shadow);
  backdrop-filter: blur(18px);
}

.ff-hero {
  border-radius: 24px;
  padding: 24px;
  display: grid;
  gap: 20px;
}

.ff-kicker {
  margin: 0 0 8px;
  color: var(--ff-accent-2);
  font-size: 11px;
  letter-spacing: .35em;
  text-transform: uppercase;
  font-weight: 900;
}

.ff-title {
  margin: 0;
  text-transform: uppercase;
  font-weight: 900;
  letter-spacing: .06em;
  font-size: clamp(2rem, 4vw, 4.6rem);
  line-height: .94;
}

.ff-subtitle {
  margin: 10px 0 0;
  max-width: 920px;
  color: var(--ff-muted);
  line-height: 1.7;
  font-size: 14px;
}

.ff-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.ff-stat {
  border: 1px solid var(--ff-line);
  border-radius: 16px;
  background: rgba(0,0,0,.28);
  padding: 14px 16px;
}

.ff-stat-label {
  margin: 0;
  color: #8b8b8b;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: .28em;
}

.ff-stat-value {
  margin: 8px 0 0;
  font-size: 22px;
  font-weight: 900;
  text-transform: uppercase;
}

.ff-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 18px 0;
}

.ff-tab {
  border: 1px solid rgba(255,255,255,.12);
  background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
  color: #d4d4d4;
  text-transform: uppercase;
  letter-spacing: .18em;
  font-size: 12px;
  font-weight: 800;
  padding: 16px 18px;
  clip-path: polygon(0 0, 94% 0, 100% 18px, 100% 100%, 6% 100%, 0 calc(100% - 18px));
  transition: transform .18s ease, border-color .18s ease, color .18s ease, background .18s ease;
}

.ff-tab:hover { transform: translateY(-1px); border-color: rgba(234,88,12,.45); color: #fff; }
.ff-tab-active {
  color: #fff;
  border-color: rgba(234,88,12,.65);
  background: linear-gradient(180deg, rgba(234,88,12,.24), rgba(234,88,12,.08));
  box-shadow: inset 0 0 0 1px rgba(234,88,12,.22), 0 0 0 1px rgba(234,88,12,.15);
}

.ff-panel {
  border-radius: 22px;
  overflow: hidden;
}

.ff-panel-head {
  padding: 18px 18px 14px;
  border-bottom: 1px solid var(--ff-line);
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
}

.ff-panel-head h2 {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: .18em;
  font-size: 14px;
}

.ff-panel-head p {
  margin: 6px 0 0;
  color: var(--ff-muted);
  font-size: 13px;
}

.ff-table-wrap { overflow: auto; }

.ff-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1280px;
}

.ff-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(13,13,13,.96);
  color: #f3f3f3;
  text-transform: uppercase;
  letter-spacing: .18em;
  font-size: 10px;
  padding: 15px 14px;
  border-bottom: 1px solid var(--ff-line);
  text-align: left;
  white-space: nowrap;
}

.ff-table tbody td {
  padding: 14px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  font-size: 13px;
  color: #e5e5e5;
  vertical-align: middle;
}

.ff-table tbody tr { background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,0)); }
.ff-table tbody tr:nth-child(even) { background: rgba(255,255,255,.015); }
.ff-table tbody tr:hover { background: rgba(234,88,12,.08); }

.ff-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(234,88,12,.45);
  background: rgba(234,88,12,.14);
  clip-path: polygon(14% 0, 86% 0, 100% 14%, 100% 86%, 86% 100%, 14% 100%, 0 86%, 0 14%);
  font-weight: 900;
  color: #ffedd5;
}

.ff-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 1px solid rgba(234,88,12,.38);
  background: rgba(234,88,12,.1);
  color: #fdba74;
  text-transform: uppercase;
  letter-spacing: .22em;
  font-size: 10px;
  font-weight: 900;
}

.ff-qualified { animation: pulseGlow 1.6s ease-in-out infinite; }

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(234,88,12,.18); }
  50% { box-shadow: 0 0 0 10px rgba(234,88,12,0); }
}

.ff-divider {
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(234,88,12,.88), transparent);
  box-shadow: 0 0 20px rgba(234,88,12,.55);
  margin: 0 14px 14px;
}

.ff-table-muted { color: var(--ff-muted); }

.ff-grid { display: grid; gap: 18px; }

.ff-roster {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.ff-card {
  border: 1px solid var(--ff-line);
  background: rgba(255,255,255,.03);
  border-radius: 18px;
  padding: 16px;
  clip-path: polygon(0 0, 93% 0, 100% 12%, 100% 100%, 7% 100%, 0 calc(100% - 12px));
}

.ff-card h3 {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: .14em;
  font-size: 14px;
}

.ff-card p {
  margin: 8px 0 0;
  color: var(--ff-muted);
  font-size: 13px;
}

.ff-admin-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.ff-form { display: grid; gap: 12px; }

.ff-field {
  width: 100%;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.36);
  color: #fff;
  padding: 14px 16px;
  border-radius: 14px;
  outline: none;
  letter-spacing: .04em;
}

.ff-field::placeholder { color: #737373; }
.ff-field:focus { border-color: rgba(234,88,12,.65); box-shadow: 0 0 0 3px rgba(234,88,12,.16); }

.ff-action {
  border: 1px solid rgba(234,88,12,.55);
  background: linear-gradient(180deg, #fb7b32, #ea580c);
  color: #fff;
  text-transform: uppercase;
  letter-spacing: .2em;
  font-weight: 900;
  padding: 14px 16px;
  clip-path: polygon(0 0, 94% 0, 100% 18px, 100% 100%, 6% 100%, 0 calc(100% - 18px));
}

.ff-action-secondary {
  border-color: rgba(255,255,255,.14);
  background: rgba(255,255,255,.05);
}

@media (max-width: 960px) {
  .ff-tabs, .ff-stats, .ff-admin-grid { grid-template-columns: 1fr; }
  .ff-panel-head { align-items: start; flex-direction: column; }
}
`;

const tabs = [
  { id: 'A', label: 'Group A' },
  { id: 'B', label: 'Group B' },
  { id: 'finals', label: 'Grand Finals' }
];

const emptyTeamForm = {
  teamName: '',
  leaderName: '',
  group: 'A',
  playerUids: ['', '', '', '']
};

const emptyScorecard = {
  group: 'A',
  matchNumber: '1',
  passkey: '',
  rows: Array.from({ length: 6 }, (_, index) => ({ teamId: '', placement: '', kills: '', label: `Team ${index + 1}` }))
};

function injectThemeSheet() {
  const existing = document.getElementById('ff-booyah-theme');
  if (existing) return;

  const style = document.createElement('style');
  style.id = 'ff-booyah-theme';
  style.textContent = headSheet;
  document.head.appendChild(style);
}

function sortTeams(list) {
  return [...list].sort((left, right) => {
    if (right.totalPoints !== left.totalPoints) return right.totalPoints - left.totalPoints;
    if (right.totalBooyahs !== left.totalBooyahs) return right.totalBooyahs - left.totalBooyahs;
    return right.totalKills - left.totalKills;
  });
}

function Stat({ label, value }) {
  return (
    <div className="ff-stat">
      <p className="ff-stat-label">{label}</p>
      <p className="ff-stat-value">{value}</p>
    </div>
  );
}

function Leaderboard({ title, rows }) {
  return (
    <section className="ff-panel">
      <div className="ff-panel-head">
        <div>
          <h2>{title}</h2>
          <p>Dense roster table with ranking, qualification, and registration data columns.</p>
        </div>
        <div className="ff-badge">Booyah Matrix</div>
      </div>
      <div className="ff-divider" />
      <div className="ff-table-wrap">
        <table className="ff-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team ID</th>
              <th>Team Name</th>
              <th>Leader Name</th>
              <th>Player UIDs</th>
              <th>Group</th>
              <th>Played</th>
              <th>Booyahs</th>
              <th>Kills</th>
              <th>Points</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {rows.length ? rows.map((team, index) => (
                <motion.tr
                  key={team.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                >
                  <td><span className="ff-rank">{index + 1}</span></td>
                  <td className="ff-table-muted">{team.id}</td>
                  <td style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em' }}>{team.teamName}</td>
                  <td>{team.leaderName}</td>
                  <td className="ff-table-muted">{team.playerUids.join(' • ')}</td>
                  <td>{team.bracketGroup}</td>
                  <td>{team.matchesPlayed}</td>
                  <td>{team.totalBooyahs}</td>
                  <td>{team.totalKills}</td>
                  <td style={{ color: '#fdba74', fontWeight: 900 }}>{team.totalPoints}</td>
                  <td>
                    <span className={`ff-badge ${index < 6 ? 'ff-qualified' : ''}`}>
                      {index < 6 ? 'Qualified' : 'Chasing'}
                    </span>
                  </td>
                </motion.tr>
              )) : (
                <tr>
                  <td colSpan="11" className="ff-table-muted" style={{ padding: 24, textAlign: 'center' }}>
                    No teams registered yet. Add your first team from the admin panel.
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      <div className="ff-divider" />
      <div style={{ padding: '0 14px 16px' }}>
        <div className="ff-badge">Line under position 6 marks qualification</div>
      </div>
    </section>
  );
}

function RosterGrid({ rows }) {
  return (
    <section className="ff-panel">
      <div className="ff-panel-head">
        <div>
          <h2>Roster Search</h2>
          <p>Verified player ID cards and team leader profiles for quick lookup.</p>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <div className="ff-roster">
          {rows.length ? rows.map((team) => (
            <motion.article key={team.id} className="ff-card" layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
              <h3>{team.teamName}</h3>
              <p>Leader: {team.leaderName}</p>
              <p>Group {team.bracketGroup} • {team.playerUids.join(', ')}</p>
            </motion.article>
          )) : (
            <div className="ff-card">
              <h3>No teams yet</h3>
              <p>Register a team and it will appear here immediately.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AdminConsole({ onRegisterTeam, onSubmitScorecard, onAdvanceFinals, statusMessage, setStatusMessage }) {
  const [teamForm, setTeamForm] = useState(emptyTeamForm);
  const [scorecard, setScorecard] = useState(emptyScorecard);
  const [busy, setBusy] = useState(false);

  const updateTeamField = (field, value) => setTeamForm((current) => ({ ...current, [field]: value }));
  const updateUid = (index, value) =>
    setTeamForm((current) => {
      const playerUids = [...current.playerUids];
      playerUids[index] = value;
      return { ...current, playerUids };
    });

  const updateScoreRow = (index, field, value) =>
    setScorecard((current) => {
      const rows = [...current.rows];
      rows[index] = { ...rows[index], [field]: value };
      return { ...current, rows };
    });

  const teamPreview = useMemo(() => ({
    teamName: teamForm.teamName || 'Team Name Preview',
    leaderName: teamForm.leaderName || 'Leader Name',
    group: teamForm.group,
    playerUids: teamForm.playerUids.filter(Boolean)
  }), [teamForm]);

  const scorecardPreview = useMemo(() => scorecard.rows.filter((row) => row.teamId || row.placement || row.kills), [scorecard.rows]);

  const handleRegister = async () => {
    setBusy(true);
    try {
      await onRegisterTeam({
        teamName: teamForm.teamName,
        leaderName: teamForm.leaderName,
        bracketGroup: teamForm.group,
        playerUids: teamForm.playerUids
      });
      setTeamForm(emptyTeamForm);
    } catch (error) {
      setStatusMessage(error.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitScorecard = async () => {
    setBusy(true);
    try {
      await onSubmitScorecard({
        group: scorecard.group,
        matchNumber: Number(scorecard.matchNumber),
        passkey: scorecard.passkey,
        scores: scorecard.rows
          .filter((row) => row.teamId || row.placement || row.kills)
          .map((row) => ({
            teamId: row.teamId,
            placement: Number(row.placement),
            kills: Number(row.kills || 0)
          }))
      });
    } catch (error) {
      setStatusMessage(error.message || 'Scorecard submit failed');
    } finally {
      setBusy(false);
    }
  };

  const handleAdvanceFinals = async () => {
    setBusy(true);
    try {
      await onAdvanceFinals(scorecard.passkey);
    } catch (error) {
      setStatusMessage(error.message || 'Finals advance failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ff-panel">
      <div className="ff-panel-head">
        <div>
          <h2>Admin Panel</h2>
          <p>Team registration, scorecard entry, and finals control in a compact operator layout.</p>
        </div>
        <div className="ff-badge">Secure Passkey Module</div>
      </div>
      <div style={{ padding: 16 }}>
        <div className="ff-admin-grid">
          <form className="ff-form">
            <input className="ff-field" value={teamForm.teamName} onChange={(event) => updateTeamField('teamName', event.target.value)} placeholder="Team Name" />
            <input className="ff-field" value={teamForm.leaderName} onChange={(event) => updateTeamField('leaderName', event.target.value)} placeholder="Leader Name" />
            {teamForm.playerUids.map((uid, index) => (
              <input key={index} className="ff-field" value={uid} onChange={(event) => updateUid(index, event.target.value)} placeholder={`Player UID ${index + 1}`} />
            ))}
            <select className="ff-field" value={teamForm.group} onChange={(event) => updateTeamField('group', event.target.value)}>
              <option value="A">Group A</option>
              <option value="B">Group B</option>
            </select>
            <button type="button" className="ff-action" onClick={handleRegister} disabled={busy}>
              Register Team
            </button>
            <div className="ff-card">
              <h3>Team Preview</h3>
              <p>{teamPreview.teamName}</p>
              <p>{teamPreview.leaderName}</p>
              <p>Group {teamPreview.group} • {teamPreview.playerUids.length ? teamPreview.playerUids.join(' • ') : 'No UIDs entered yet'}</p>
            </div>
          </form>

          <form className="ff-form">
            <select className="ff-field" value={scorecard.group} onChange={(event) => setScorecard((current) => ({ ...current, group: event.target.value }))}>
              <option value="A">Group A</option>
              <option value="B">Group B</option>
              <option value="finals">Grand Finals</option>
            </select>
            <select className="ff-field" value={scorecard.matchNumber} onChange={(event) => setScorecard((current) => ({ ...current, matchNumber: event.target.value }))}>
              <option value="1">Match 1</option>
              <option value="2">Match 2</option>
              <option value="3">Match 3</option>
            </select>
            <input className="ff-field" value={scorecard.passkey} onChange={(event) => setScorecard((current) => ({ ...current, passkey: event.target.value }))} placeholder="Admin Passkey" />
            <div className="ff-card">
              <h3>Match Scorecard Matrix</h3>
              <p>Enter placement ranks and kills for each team, then submit with the passkey.</p>
              <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                {scorecard.rows.map((row, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.2fr .7fr .7fr', gap: 8 }}>
                    <input className="ff-field" value={row.teamId} onChange={(event) => updateScoreRow(index, 'teamId', event.target.value)} placeholder={row.label} />
                    <input className="ff-field" value={row.placement} onChange={(event) => updateScoreRow(index, 'placement', event.target.value)} placeholder="Placement" />
                    <input className="ff-field" value={row.kills} onChange={(event) => updateScoreRow(index, 'kills', event.target.value)} placeholder="Kills" />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button type="button" className="ff-action" onClick={handleSubmitScorecard} disabled={busy}>Submit Scorecard</button>
              <button type="button" className="ff-action ff-action-secondary" onClick={handleAdvanceFinals} disabled={busy}>Trigger Finals Phase</button>
            </div>
            <div className="ff-badge" style={{ justifyContent: 'center' }}>{statusMessage}</div>
            <div className="ff-card">
              <h3>Scorecard Preview</h3>
              <p>Group {scorecard.group} • Match {scorecard.matchNumber}</p>
              <p>{scorecardPreview.length ? `${scorecardPreview.length} rows entered` : 'Fill in placements and kills to preview submitted data'}</p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('A');
  const [statusMessage, setStatusMessage] = useState('Ready to load tournament data');
  const [standings, setStandings] = useState({ A: [], B: [], finals: [] });
  const [roster, setRoster] = useState([]);

  useEffect(() => {
    injectThemeSheet();
  }, []);

  const loadStandings = async () => {
    const [groupA, groupB, finals, rosterData] = await Promise.all([
      api.getStandings('A'),
      api.getStandings('B'),
      api.getStandings('finals'),
      api.getRoster()
    ]);

    setStandings({ A: groupA.teams, B: groupB.teams, finals: finals.teams });
    setRoster(rosterData.teams);
  };

  useEffect(() => {
    loadStandings().catch((error) => setStatusMessage(error.message));
  }, []);

  const currentRows = activeTab === 'A' ? standings.A : activeTab === 'B' ? standings.B : standings.finals;

  const registerTeam = async (payload) => {
    await api.registerTeam(payload);
    setStatusMessage(`Registered ${payload.teamName || 'team'} into Group ${payload.bracketGroup}`);
    await loadStandings();
  };

  const submitScorecard = async (payload) => {
    await api.submitMatch(payload);
    setStatusMessage(`Scorecard saved for Group ${payload.group} Match ${payload.matchNumber}`);
    await loadStandings();
  };

  const advanceFinals = async (passkey) => {
    await api.advanceFinals({ passkey });
    setStatusMessage('Finals phase activated');
    await loadStandings();
  };

  return (
    <main className="ff-shell">
      <section className="ff-hero">
        <div>
          <p className="ff-kicker">Free Fire Booyah Control Center</p>
          <h1 className="ff-title">Tournament Management Interface</h1>
          <p className="ff-subtitle">
            Dark neutral surfaces, aggressive neon orange accents, angular military-grade framing, and a dense leaderboard
            architecture built for fast operator scanning on Vercel-ready deployments.
          </p>
        </div>
        <div className="ff-stats">
          <Stat label="Qualifier Format" value="3 Matches" />
          <Stat label="Promotion Rule" value="Top 6 Advance" />
          <Stat label="Scoring" value="12-Point Scale" />
        </div>
      </section>

      <nav className="ff-tabs" aria-label="Tournament sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`ff-tab ${activeTab === tab.id ? 'ff-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="ff-grid">
        <Leaderboard
          title={activeTab === 'A' ? 'Group A Standings' : activeTab === 'B' ? 'Group B Standings' : 'Grand Finals Tracking'}
          rows={currentRows}
        />
        <RosterGrid rows={roster} />
        <AdminConsole onRegisterTeam={registerTeam} onSubmitScorecard={submitScorecard} onAdvanceFinals={advanceFinals} statusMessage={statusMessage} setStatusMessage={setStatusMessage} />
      </div>
    </main>
  );
}
