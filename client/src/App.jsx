import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ADMIN_PASSKEY,
  MATCH_COUNT,
  MATCH_TEAM_COUNT,
  QUALIFIER_COUNT,
  applyMatchScore,
  buildFinalists,
  buildPodium,
  clearMatchScore,
  createTournamentState,
  createTeamRecord,
  isQualificationUnlocked,
  isRoundComplete,
  refreshQualification,
  resetTournamentScores,
  sortTeams,
  validateScoreEntries
} from './lib/rules.js';
import './styles.css';

// Bump storage key to invalidate older local snapshots and force fresh state
const STORAGE_KEY = 'ff-leaderboard-state-v4';

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
    teamName: team.teamName,
    leaderName: team.leaderName,
    leaderInGameName: team.leaderInGameName,
    leaderUid: team.leaderUid,
    memberNames: team.memberNames,
    playerUids: team.playerUids,
    bracketGroup: team.bracketGroup,
    displayOrder: team.displayOrder,
    matchesPlayed: team.matchesPlayed,
    totalBooyahs: team.totalBooyahs,
    totalKills: team.totalKills,
    totalPoints: team.totalPoints,
    qualificationBooyahs: team.qualificationBooyahs,
    qualificationKills: team.qualificationKills,
    qualificationPoints: team.qualificationPoints,
    isQualified: team.isQualified,
    matchHistory: team.matchHistory
  }))
});

const hydrateState = (snapshot) => {
  const fresh = createTournamentState();

  if (!snapshot?.teams?.length) {
    return fresh;
  }

  // Remove any legacy/removed teams from stored snapshots (e.g. 'GodLike')
  const cleanedSnapshotTeams = (Array.isArray(snapshot.teams) ? snapshot.teams : []).filter((team) => {
    const name = String(team.teamName || '').trim();
    const uid = String(team.leaderUid || '').trim();
    if (/^god\s*-?\s*like$/i.test(name)) return false;
    if (uid === '1899984581') return false;
    return true;
  });

  const hydratedTeams = cleanedSnapshotTeams.map((saved) => {
    const fallbackGroup = saved.bracketGroup || 'A';
    const baseTeam = fresh.teams.find((team) => team.id === saved.id);

    if (baseTeam) {
      return {
        ...baseTeam,
        ...createTeamRecord({ ...baseTeam, ...saved }, baseTeam.bracketGroup)
      };
    }

    return createTeamRecord(saved, fallbackGroup);
  });

  fresh.teams = hydratedTeams.length ? hydratedTeams : fresh.teams;

  if (isQualificationUnlocked(fresh.teams) && !fresh.teams.some((team) => team.bracketGroup === 'finals')) {
    fresh.teams = [...fresh.teams, ...buildFinalists(fresh.teams)];
  }

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

const getStageTeams = (teams, group) => getGroupTeams(teams, group);

const normalizeFinalsSeedTotals = (teams) =>
  teams.map((team) => {
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
  });

const syncFinalists = (teams) => {
  const finalsTeams = getStageTeams(teams, 'finals');
  const finalsStarted = finalsTeams.some(
    (team) => team.matchesPlayed > 0 || team.totalPoints > 0 || team.totalKills > 0 || team.totalBooyahs > 0
  );

  if (isQualificationUnlocked(teams) && !finalsTeams.length) {
    const seeded = [...teams, ...buildFinalists(teams)];
    refreshQualification(seeded);
    return seeded;
  }

  if (!isQualificationUnlocked(teams) && finalsTeams.length && !finalsStarted) {
    const withoutFinals = teams.filter((team) => team.bracketGroup !== 'finals');
    refreshQualification(withoutFinals);
    return withoutFinals;
  }

  return teams;
};

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
  // Hide any accidental empty team entries that render as a blank row
  const visibleTeams = teams.filter((team) => String(team.teamName || '').trim());
  const qualifiedCount = visibleTeams.filter((team) => team.isQualified).length;

  return (
    <section className="ff-panel ff-board">
      <div className="ff-panel-head">
        <div>
          <p className="ff-kicker">{group} Bracket</p>
          <h2>{title}</h2>
          <p>
            {visibleTeams.length} teams, top {QUALIFIER_COUNT} advance to finals.
          </p>
        </div>
        <div className="ff-head-metrics">
          <Pill tone="accent">{qualificationUnlocked ? `${qualifiedCount} Qualified` : 'Qualification Locked'}</Pill>
          <Pill tone="dark">{visibleTeams.length} Registered</Pill>
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
              {visibleTeams.map((team, index) => (
                <motion.tr
                  key={team.id}
                  className={!qualificationUnlocked ? '' : team.isQualified ? 'ff-row-qualified' : 'ff-row-eliminated'}
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
                    <Pill tone={!qualificationUnlocked ? 'dark' : team.isQualified ? 'accent' : 'danger'}>
                      {!qualificationUnlocked ? 'Pending' : team.isQualified ? '✓ Qualified' : '× Eliminated'}
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

function FinalsPreview({ finalists, podium, qualificationUnlocked, finalsReady, finalsComplete }) {
  useEffect(() => {
    if (finalsComplete) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [finalsComplete]);

  return (
    <section className="ff-panel">
      <div className="ff-panel-head">
        <div>
          <p className="ff-kicker">Top 3</p>
          <h2>Final Winners</h2>
          <p>{finalsComplete ? 'These are the top 3 teams after the finals leaderboard settles.' : 'Play all 3 finals matches to reveal the top 3 tournament winners.'}</p>
        </div>
        <Pill tone={finalsComplete ? 'accent' : 'dark'}>{finalsComplete ? 'Top 3 locked' : 'Finals pending'}</Pill>
      </div>

      <div className="ff-finals-grid">
        {finalsComplete ? (
          podium.map((team, index) => (
            <motion.article
              key={team.id}
              className="ff-final-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.22 }}
            >
              <div className="ff-final-head">
                <span className="ff-final-slot">{index + 1}</span>
                <Pill tone={index === 0 ? 'accent' : index === 1 ? 'warning' : 'cyan'}>{index === 0 ? '1st' : index === 1 ? '2nd' : '3rd'}</Pill>
              </div>
              <h3>{team.teamName}</h3>
              <p>{team.leaderName}</p>
            </motion.article>
          ))
        ) : (
          <div className="ff-final-card">
            <h3>Finals In Progress</h3>
            <p>Once the 12 finalists finish their 3 championship matches, the top 3 teams will be crowned here.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function MatchEditor({ draft, setDraft, onSubmit, onDeleteMatch, onResetAll, onCopyLink, statusMessage, finalsAvailable }) {
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
            <option value="finals" disabled={!finalsAvailable}>
              Finals
            </option>
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
          <button type="button" className="ff-action ff-action-secondary" onClick={onResetAll}>
            Reset All
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
  const finalsTeams = useMemo(() => sortTeams(getStageTeams(tournament.teams, 'finals')), [tournament.teams]);
  const qualificationUnlocked = useMemo(() => isQualificationUnlocked(tournament.teams), [tournament.teams]);
  const finalsReady = useMemo(() => finalsTeams.length > 0, [finalsTeams]);
  const finalsComplete = useMemo(() => isRoundComplete(finalsTeams), [finalsTeams]);
  const finalsPreview = useMemo(
    () => (finalsTeams.length ? finalsTeams : buildFinalists(tournament.teams)),
    [finalsTeams, tournament.teams]
  );
  const finalsPodium = useMemo(() => (finalsComplete ? buildPodium(finalsTeams) : []), [finalsComplete, finalsTeams]);

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
  const liveLeaderPool = finalsTeams.some((team) => team.matchesPlayed > 0 || team.totalPoints > 0)
    ? tournament.teams
    : tournament.teams.filter((team) => team.bracketGroup !== 'finals');
  const liveLeader = sortTeams(liveLeaderPool)[0];

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
      nextTournament.teams = syncFinalists(nextTournament.teams);
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
      nextTournament.teams = syncFinalists(nextTournament.teams);
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

  const resetAllResults = () => {
    try {
      if (draft.passkey !== ADMIN_PASSKEY) {
        throw new Error('Invalid admin key');
      }

      const nextTournament = clone(tournament);
      nextTournament.teams = resetTournamentScores(nextTournament.teams);
      refreshQualification(nextTournament.teams);
      setTournament(nextTournament);
      setStatusMessage('Reset all group and finals results.');
      setDraft((current) => ({
        ...current,
        rows: createDraftRows(getGroupTeams(nextTournament.teams, current.group), current.matchNumber)
      }));
    } catch (error) {
      setStatusMessage(error.message || 'Unable to reset tournament results.');
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
          <h1>Lock In. Light Up. Win.</h1>
          <p>Enter full lobby results, edit on the fly, and watch teams climb the leaderboard. Use the Admin Console to save, update, or remove match entries during the event.</p>
        </div>

        <div className="ff-hero-stats">
          <StatCard label="Registered teams" value="20" note="10 in Group A, 10 in Group B" />
          <StatCard label="Round format" value="3 Matches" note="1 point per kill" />
          <StatCard label="Qualification" value={qualificationUnlocked ? 'Unlocked' : 'Pending'} note="Top 6 from each group after full entry" />
          <StatCard
            label="Live leader"
            value={liveLeader ? `${liveLeader.teamName} (${liveLeader.totalPoints} pts)` : 'Loading'}
            note={`${totalPoints} total points across the board`}
          />
        </div>
      </motion.section>

      <section className="ff-grid ff-grid-tight">
        <FinalsPreview
          finalists={finalsPreview}
          podium={finalsPodium}
          qualificationUnlocked={qualificationUnlocked}
          finalsReady={finalsReady}
          finalsComplete={finalsComplete}
        />
      </section>

      <section className="ff-grid ff-grid-two">
        <TeamTable title="Group A Standings" group="A" teams={groupA} qualificationUnlocked={qualificationUnlocked} />
        <TeamTable title="Group B Standings" group="B" teams={groupB} qualificationUnlocked={qualificationUnlocked} />
      </section>

      <MatchEditor
        draft={draft}
        setDraft={setDraft}
        onSubmit={submitMatch}
        onDeleteMatch={deleteMatch}
        onResetAll={resetAllResults}
        onCopyLink={copyShareLink}
        statusMessage={statusMessage}
        finalsAvailable={qualificationUnlocked || finalsTeams.length > 0}
      />
    </main>
  );
}