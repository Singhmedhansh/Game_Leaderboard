/* test_simulation.js */
const path = require('path');
const {
  ADMIN_PASSKEY,
  MATCH_TEAM_COUNT,
  MATCH_COUNT,
  applyMatchScore,
  clearMatchScore,
  createTournamentState,
  refreshQualification,
  isQualificationUnlocked,
  buildFinalists,
  buildPodium,
  resetTournamentScores,
  clone
} = require('./lib/rules.js');
const { TOURNAMENT_TEAMS } = require('./data/tournament.js');

// Helper to get group teams
const getGroupTeams = (state, group) => state.teams.filter(t => t.bracketGroup === group);

// Initialize tournament state
let tournament = createTournamentState();

// Function to simulate group matches
function simulateGroup(group) {
  const teams = getGroupTeams(tournament, group);
  // Sort by displayOrder for deterministic placements
  const sorted = teams.slice().sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  for (let match = 1; match <= MATCH_COUNT; match++) {
    sorted.forEach((team, idx) => {
      const placement = idx + 1; // unique placement 1..12
      const kills = (idx + 1) * match; // simple kills pattern
      applyMatchScore(team, placement, kills, String(match));
    });
  }
}

// Simulate Group A and B
simulateGroup('A');
simulateGroup('B');

// Refresh qualification status
refreshQualification(tournament.teams);
console.log('Qualification unlocked?', isQualificationUnlocked(tournament.teams));

// Build finalists
let finalists = buildFinalists(tournament.teams);
console.log('Finalists count:', finalists.length);

// Simulate finals matches (3 matches)
finalists.forEach(team => {
  // reset any existing finals matchHistory (already reset by buildFinalists)
});
for (let match = 1; match <= MATCH_COUNT; match++) {
  // Sort finalists by totalPoints descending to assign placements
  const sorted = finalists.slice().sort((a, b) => b.totalPoints - a.totalPoints || a.displayOrder - b.displayOrder);
  sorted.forEach((team, idx) => {
    const placement = idx + 1;
    const kills = (idx + 1) * match;
    applyMatchScore(team, placement, kills, String(match));
  });
}

// Build podium
const podium = buildPodium(finalists);
console.log('--- Podium Winners ---');
podium.forEach((team, idx) => {
  console.log(`${idx + 1}. ${team.teamName} (Points: ${team.totalPoints}, Kills: ${team.totalKills})`);
});
