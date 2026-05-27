import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import {
  ADMIN_PASSKEY,
  MATCH_COUNT,
  MATCH_TEAM_COUNT,
  QUALIFIER_COUNT,
  applyMatchScore,
  buildFinalists,
  clearMatchScore,
  createTournamentState,
  isQualificationUnlocked,
  refreshQualification,
  sortTeams,
  validateScoreEntries
} from './lib/rules.js';
import './styles.css';

const STORAGE_KEY = 'ff-leaderboard-state-v3';

const motionRows = {
  hidden: { opacity: 0, y: 12 },
  show: (index) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.035, duration: 0.24, ease: 'easeOut' }
  })
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const buildSnapshot = (state) => ({
  teams: state.teams.map((team) => ({
    id: team.id,
    matchesPlayed: team.matchesPlayed,
    totalBooyahs: team.totalBooyahs,
    totalKills: team.totalKills,
    totalPoints: team.totalPoints,
    isQualified: team.isQualified,
    matchHistory: team.matchHistory
  }))
});

const hydrateState = (snapshot) => {
  const fresh = createTournamentState();

  if (!snapshot?.teams?.length) {
    return fresh;
  }

  const statsById = new Map(snapshot.teams.map((entry) => [entry.id, entry]));

  fresh.teams = fresh.teams.map((team) => {
    const saved = statsById.get(team.id);
    if (!saved) {
      return team;
    }

    return {
      ...team,
      matchesPlayed: Number(saved.matchesPlayed || 0),
      totalBooyahs: Number(saved.totalBooyahs || 0),
      totalKills: Number(saved.totalKills || 0),
      totalPoints: Number(saved.totalPoints || 0),
      isQualified: Boolean(saved.isQualified),
      matchHistory: clone(saved.matchHistory || team.matchHistory)
    };
  });

  refreshQualification(fresh.teams);
  return fresh;
};

const loadInitialState = () => {
  if (typeof window === 'undefined') {
    return createTournamentState();
  }

  const hash = window.location.hash.startsWith('#ff=') ? window.location.hash.slice(4) : '';

  if (hash) {
    try {
      return hydrateState(JSON.parse(decodeURIComponent(hash)));
    } catch {
      window.location.hash = '';
    }
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return createTournamentState();
  }

  try {
    return hydrateState(JSON.parse(stored));
  } catch {
    return createTournamentState();
  }
};

const persistState = (state) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buildSnapshot(state)));
};

const buildShareLink = (state) => {
  const payload = encodeURIComponent(JSON.stringify(buildSnapshot(state)));
  const url = new URL(window.location.href);
  url.hash = `ff=${payload}`;
  return url.toString();
};

const createDraftRows = (teams, matchNumber) =>
  teams.map((team) => ({
    teamId: team.id,
    teamName: team.teamName,
    leaderName: team.leaderName,
    leaderInGameName: team.leaderInGameName,
    placement: team.matchHistory?.[Number(matchNumber)]?.placement ? String(team.matchHistory[Number(matchNumber)].placement) : '',
    kills:
      team.matchHistory?.[Number(matchNumber)]?.placement != null
        ? String(Number(team.matchHistory[Number(matchNumber)].kills || 0))
        : ''
  }));

const getGroupTeams = (teams, group) => teams.filter((team) => team.bracketGroup === group);

function Pill({ children, tone = 'neutral' }) {
  return <span className={`ff-pill ff-pill-${tone}`}>{children}</span>;
}

function StatCard({ label, value, note }) {
  return (
    <div className="ff-stat-card">
      <p className="ff-stat-label">{label}</p>
      <p className="ff-stat-value">{value}</p>
      {note ? <p className="ff-stat-note">{note}</p> : null}
    </div>
  );
}

function TeamTable({ title, group, teams, qualificationUnlocked }) {
  const qualifiedCount = teams.filter((team) => team.isQualified).length;

  return (
    <section className="ff-panel ff-board">
      <div className="ff-panel-head">
        <div>
          <p className="ff-kicker">{group} Bracket</p>
          <h2>{title}</h2>
          <p>
            {teams.length} teams, top {QUALIFIER_COUNT} advance to finals.
          </p>
        </div>
        <div className="ff-head-metrics">
          <Pill tone="accent">{qualificationUnlocked ? `${qualifiedCount} Qualified` : 'Qualification Locked'}</Pill>
          <Pill tone="dark">{teams.length} Registered</Pill>
        </div>
      </div>

      <div className="ff-table-wrap">
        <table className="ff-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Leader</th>
              <th>In-Game</th>
              <th>UID</th>
              <th>Members</th>
              <th>Played</th>
              <th>Booyahs</th>
              <th>Kills</th>
              <th>Points</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {teams.map((team, index) => (
                <motion.tr
                  key={team.id}
                  layout
                  variants={motionRows}
                  custom={index}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                >
                  <td>
                    <span className={`ff-rank ${qualificationUnlocked && index < QUALIFIER_COUNT ? 'ff-rank-qualifier' : ''}`}>{index + 1}</span>
                  </td>
                  <td>
                    <div className="ff-team-name">{team.teamName}</div>
                  </td>
                  <td>{team.leaderName}</td>
                  <td>{team.leaderInGameName || 'n/a'}</td>
                  <td className="ff-muted">{team.leaderUid || 'n/a'}</td>
                  <td className="ff-members">{team.memberNames?.length ? team.memberNames.join(', ') : 'n/a'}</td>
                  <td>{team.matchesPlayed}</td>
                  <td>{team.totalBooyahs}</td>
                  <td>{team.totalKills}</td>
                  <td className="ff-points">{team.totalPoints}</td>
                  <td>
                    <Pill tone={!qualificationUnlocked ? 'dark' : team.isQualified ? 'accent' : 'neutral'}>
                      {!qualificationUnlocked ? 'Pending' : team.isQualified ? 'Qualified' : 'Chasing'}
                    </Pill>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FinalsPreview({ teams, qualificationUnlocked }) {
  return (
    <section className="ff-panel">
      <div className="ff-panel-head">
        <div>
          <p className="ff-kicker">Finals Preview</p>
          <h2>Top 12 Bracket</h2>
          <p>{qualificationUnlocked ? 'Top 6 from each group are selected for the final lobby preview.' : 'Finals lineup appears after all 3 matches are entered for every team.'}</p>
        </div>
        <Pill tone="warning">{qualificationUnlocked ? 'Auto-built from live standings' : 'Waiting for complete scoring'}</Pill>
      </div>

      <div className="ff-finals-grid">
        {qualificationUnlocked ? (
          teams.map((team, index) => (
            <motion.article
              key={team.id}
              className="ff-final-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.22 }}
            >
              <div className="ff-final-head">
                <span className="ff-final-slot">{index + 1}</span>
                <Pill tone={team.bracketGroup === 'A' ? 'accent' : 'cyan'}>{team.bracketGroup}</Pill>
              </div>
              <h3>{team.teamName}</h3>
              <p>{team.leaderName}</p>
              <p className="ff-muted">{team.totalPoints} pts • {team.totalKills} kills</p>
            </motion.article>
          ))
        ) : (
          <div className="ff-final-card">
            <h3>Qualification Not Ready</h3>
            <p>Complete all 3 matches for all teams in Group A and Group B to unlock finalists.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function MatchEditor({ draft, setDraft, onSubmit, onDeleteMatch, onCopyLink, statusMessage }) {
  const [showAdminKey, setShowAdminKey] = useState(false);
  const maxPlacement = MATCH_TEAM_COUNT;

  const updateRow = (index, field, value) => {
    setDraft((current) => {
      const rows = [...current.rows];
      rows[index] = { ...rows[index], [field]: value };
      return { ...current, rows };
    });
  };

  return (
    <section className="ff-panel ff-editor">
      <div className="ff-panel-head">
        <div>
          <p className="ff-kicker">Admin Console</p>
          <h2>Match Score Entry</h2>
          <p>Enter one full lobby result at a time.</p>
        </div>
        <Pill tone="accent">Protected</Pill>
      </div>

      <div className="ff-editor-toolbar">
        <label className="ff-field-group">
          <span>Group</span>
          <select
            className="ff-field"
            value={draft.group}
            onChange={(event) => setDraft((current) => ({ ...current, group: event.target.value }))}
          >
            <option value="A">Group A</option>
            <option value="B">Group B</option>
          </select>
        </label>

        <label className="ff-field-group">
          <span>Match</span>
          <select
            className="ff-field"
            value={draft.matchNumber}
            onChange={(event) => setDraft((current) => ({ ...current, matchNumber: event.target.value }))}
          >
            {Array.from({ length: MATCH_COUNT }, (_, index) => (
              <option key={index + 1} value={String(index + 1)}>
                Match {index + 1}
              </option>
            ))}
          </select>
        </label>

        <label className="ff-field-group">
          <span>Admin Key</span>
          <div className="ff-key-wrap">
            <input
              className="ff-field"
              type={showAdminKey ? 'text' : 'password'}
              value={draft.passkey}
              onChange={(event) => setDraft((current) => ({ ...current, passkey: event.target.value }))}
              placeholder="Enter admin key"
            />
            <button type="button" className="ff-action ff-action-secondary ff-peek-btn" onClick={() => setShowAdminKey((value) => !value)}>
              {showAdminKey ? 'Hide' : 'Peek'}
            </button>
          </div>
        </label>

        <div className="ff-action-row">
          <button type="button" className="ff-action" onClick={onSubmit}>
            Save Match
          </button>
          <button type="button" className="ff-action ff-action-danger" onClick={onDeleteMatch}>
            Delete Match
          </button>
          <button type="button" className="ff-action ff-action-secondary" onClick={onCopyLink}>
            Copy Share Link
          </button>
        </div>

        <div className="ff-editor-status">{statusMessage}</div>
      </div>

      <div className="ff-scorecard-shell">
        <div className="ff-scorecard-head">
          <span>Team</span>
          <span>Placement</span>
          <span>Kills</span>
        </div>

        <div className="ff-scorecard-list">
          <AnimatePresence mode="popLayout">
            {draft.rows.map((row, index) => (
              <motion.div
                key={row.teamId}
                className="ff-score-row"
                variants={motionRows}
                custom={index}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="ff-score-team">
                  <span className="ff-score-index">{index + 1}</span>
                  <div>
                    <strong>{row.teamName}</strong>
                    <span>{row.leaderName} • {row.leaderInGameName}</span>
                  </div>
                </div>

                <input
                  className="ff-field ff-field-small"
                  value={row.placement}
                  onChange={(event) => updateRow(index, 'placement', event.target.value)}
                  placeholder="1"
                  inputMode="numeric"
                />

                <input
                  className="ff-field ff-field-small"
                  value={row.kills}
                  onChange={(event) => updateRow(index, 'kills', event.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                />
              </motion.div>
            ))}
              {Array.from({ length: Math.max(0, MATCH_TEAM_COUNT - draft.rows.length) }).map((_, i) => (
                <motion.div
                  key={`empty-${i}`}
                  className="ff-score-row ff-score-empty"
                  variants={motionRows}
                  custom={draft.rows.length + i}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, y: -8 }}
                >
                  <div className="ff-score-team">
                    <span className="ff-score-index">{draft.rows.length + i + 1}</span>
                    <div>
                      <strong>—</strong>
                      <span className="ff-muted">Empty slot</span>
                    </div>
                  </div>

                  <div className="ff-field ff-field-small" aria-hidden>
                    —
                  </div>

                  <div className="ff-field ff-field-small" aria-hidden>
                    —
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="ff-scorefoot">
        <Pill tone="warning">1 kill = 1 point</Pill>
        <Pill tone="neutral">Allowed placements: 1-{maxPlacement}</Pill>
        <Pill tone="neutral">Points by placement: 1st=12, 2nd=9, 3rd=8, 4th=7, 5th=6, 6th=5, 7th=4, 8th=3, 9th=2, 10th=1, 11th/12th=0</Pill>
      </div>
    </section>
  );
}

export default function App() {
  const [tournament, setTournament] = useState(loadInitialState);
  const [draft, setDraft] = useState(() => ({
    group: 'A',
    matchNumber: '1',
    passkey: '',
    rows: createDraftRows(getGroupTeams(loadInitialState().teams, 'A'), 1)
  }));
  const [statusMessage, setStatusMessage] = useState('Ready to update the leaderboard.');

  const groupA = useMemo(() => sortTeams(getGroupTeams(tournament.teams, 'A')), [tournament.teams]);
  const groupB = useMemo(() => sortTeams(getGroupTeams(tournament.teams, 'B')), [tournament.teams]);
  const qualificationUnlocked = useMemo(() => isQualificationUnlocked(tournament.teams), [tournament.teams]);
  const finalsPreview = useMemo(() => (qualificationUnlocked ? buildFinalists(tournament.teams) : []), [qualificationUnlocked, tournament.teams]);

  useEffect(() => {
    persistState(tournament);
  }, [tournament]);

  useEffect(() => {
    const selectedTeams = getGroupTeams(tournament.teams, draft.group);
    setDraft((current) => ({
      ...current,
      rows: createDraftRows(selectedTeams, current.matchNumber)
    }));
  }, [draft.group, draft.matchNumber, tournament.teams]);

  const totalPoints = tournament.teams.reduce((sum, team) => sum + team.totalPoints, 0);
  const liveLeader = sortTeams(tournament.teams)[0];

  const submitMatch = () => {
    try {
      if (draft.passkey !== ADMIN_PASSKEY) {
        throw new Error('Invalid admin key');
      }

      const groupTeams = getGroupTeams(tournament.teams, draft.group);
      const maxPlacement = MATCH_TEAM_COUNT;

      draft.rows.forEach((row) => {
        const placement = Number(row.placement);
        const kills = Number(row.kills || 0);

        if (!row.placement || !Number.isInteger(placement) || placement < 1 || placement > maxPlacement) {
          throw new Error(`${row.teamName}: placement must be between 1 and ${maxPlacement}`);
        }

        if (!Number.isFinite(kills) || kills < 0) {
          throw new Error(`${row.teamName}: kills must be 0 or more`);
        }
      });

      const scoreEntries = validateScoreEntries(
        draft.rows.map((row) => ({
          teamId: row.teamId,
          teamName: row.teamName,
          placement: Number(row.placement),
          kills: Number(row.kills || 0)
        }))
      );

      if (scoreEntries.length !== groupTeams.length) {
        throw new Error(`Group ${draft.group} needs ${groupTeams.length} scored teams`);
      }

      const placements = new Set();
      scoreEntries.forEach((entry) => {
        if (!Number.isInteger(entry.placement) || entry.placement < 1 || entry.placement > maxPlacement) {
          throw new Error(`Placements must be whole numbers between 1 and ${maxPlacement}`);
        }

        if (placements.has(entry.placement)) {
          throw new Error('Each placement can only be used once per match');
        }

        placements.add(entry.placement);
      });

      const nextTournament = clone(tournament);

      scoreEntries.forEach((entry) => {
        const team = nextTournament.teams.find((candidate) => candidate.id === entry.teamId);
        if (!team) return;
        applyMatchScore(team, entry.placement, entry.kills, draft.matchNumber);
      });

      refreshQualification(nextTournament.teams);
      setTournament(nextTournament);
      setStatusMessage(`Saved Group ${draft.group} Match ${draft.matchNumber}. You can edit and save again anytime.`);
      setDraft((current) => ({
        ...current,
        rows: createDraftRows(getGroupTeams(nextTournament.teams, draft.group), current.matchNumber)
      }));
    } catch (error) {
      setStatusMessage(error.message || 'Unable to save match results.');
    }
  };

  const deleteMatch = () => {
    try {
      if (draft.passkey !== ADMIN_PASSKEY) {
        throw new Error('Invalid admin key');
      }

      const nextTournament = clone(tournament);
      const groupTeams = getGroupTeams(nextTournament.teams, draft.group);
      groupTeams.forEach((team) => clearMatchScore(team, draft.matchNumber));

      refreshQualification(nextTournament.teams);
      setTournament(nextTournament);
      setStatusMessage(`Deleted Group ${draft.group} Match ${draft.matchNumber}.`);
      setDraft((current) => ({
        ...current,
        rows: createDraftRows(getGroupTeams(nextTournament.teams, draft.group), current.matchNumber)
      }));
    } catch (error) {
      setStatusMessage(error.message || 'Unable to delete match results.');
    }
  };

  const copyShareLink = async () => {
    const link = buildShareLink(tournament);

    try {
      if (!window.isSecureContext || !navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }

      await navigator.clipboard.writeText(link);
      setStatusMessage('Share link copied to clipboard.');
    } catch {
      window.prompt('Copy this share link', link);
      setStatusMessage('Share link generated. Copy it from the popup.');
    }
  };

  return (
    <main className="ff-app-shell">
      <motion.section className="ff-hero" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="ff-hero-copy">
          <Pill tone="accent">Free Fire Tournament Leaderboard</Pill>
          <h1>College Championship Control Room</h1>
        </div>

        <div className="ff-hero-stats">
          <StatCard label="Registered teams" value="21" note="11 in Group A, 10 in Group B" />
          <StatCard label="Round format" value="3 Matches" note="1 point per kill" />
          <StatCard label="Qualification" value={qualificationUnlocked ? 'Unlocked' : 'Pending'} note="Top 6 from each group after full entry" />
          <StatCard
            label="Live leader"
            value={liveLeader ? `${liveLeader.teamName} (${liveLeader.totalPoints} pts)` : 'Loading'}
            note={`${totalPoints} total points across the board`}
          />
        </div>
      </motion.section>

      <section className="ff-grid ff-grid-two">
        <TeamTable title="Group A Standings" group="A" teams={groupA} qualificationUnlocked={qualificationUnlocked} />
        <TeamTable title="Group B Standings" group="B" teams={groupB} qualificationUnlocked={qualificationUnlocked} />
      </section>

      <section className="ff-grid ff-grid-tight">
        <FinalsPreview teams={finalsPreview} qualificationUnlocked={qualificationUnlocked} />
      </section>

      <MatchEditor
        draft={draft}
        setDraft={setDraft}
        onSubmit={submitMatch}
        onDeleteMatch={deleteMatch}
        onCopyLink={copyShareLink}
        statusMessage={statusMessage}
      />
    </main>
  );
}