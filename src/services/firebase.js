// src/services/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, increment } from 'firebase/firestore';

// Firebase configuration placeholder
// Populate these values with the actual project config from Firebase Console

const firebaseConfig = {
  apiKey: "AIzaSyAljEiUJmvmFk_d19UtyLQBBOb9p66WLdw",
  authDomain: "jpl-03.firebaseapp.com",
  projectId: "jpl-03",
  storageBucket: "jpl-03.firebasestorage.app",
  messagingSenderId: "613229955485",
  appId: "1:613229955485:web:55b340930f52186d614774",
};

// Initialize Firebase App instance
const app = initializeApp(firebaseConfig);

// Initialize and export Firestore for handling matches, teams, and live states
export const db = getFirestore(app);

/**
 * Service to handle Match Completion Lifecycle:
 * 1. Resolves Winner and Calculates final mock score arrays
 * 2. Updates `matches` collection to "completed" state with results
 * 3. Safely increments `pointsTable` standings using Firebase batch 
 * 4. Cleans out `liveMatch/current` resolving it to "idle"
 */
export const endMatchAndProcessResults = async (liveData) => {
  if (!liveData) return;

  const batch = writeBatch(db);

  // 1. Calculate Winner Logic (Higher score wins)
  let firstRuns = liveData.firstInningsScore || 0;
  let firstWickets = liveData.firstInningsWickets || 10;
  let firstOvers = liveData.firstInningsOvers || '10.0';

  let secondRuns = liveData.scores || 0;
  let secondWickets = liveData.wickets || 0;
  let secondOvers = liveData.overs || '0.0';
  
  let teamBattedFirst = liveData.battingTeam === liveData.teamAId ? liveData.teamBId : liveData.teamAId;
  
  if ((liveData.innings || 1) === 1) {
    firstRuns = liveData.scores || 0;
    firstWickets = liveData.wickets || 0;
    firstOvers = liveData.overs || '0.0';
    secondRuns = 0;
    secondWickets = 0;
    secondOvers = '0.0';
    teamBattedFirst = liveData.battingTeam;
  }

  let teamARuns = teamBattedFirst === liveData.teamAId ? firstRuns : secondRuns;
  let teamAWickets = teamBattedFirst === liveData.teamAId ? firstWickets : secondWickets;
  let teamAOvers = teamBattedFirst === liveData.teamAId ? firstOvers : secondOvers;

  let teamBRuns = teamBattedFirst === liveData.teamBId ? firstRuns : secondRuns;
  let teamBWickets = teamBattedFirst === liveData.teamBId ? firstWickets : secondWickets;
  let teamBOvers = teamBattedFirst === liveData.teamBId ? firstOvers : secondOvers;

  // NRR Helper Function
  const getOversAsBalls = (oversStr, isAllOut, maxBalls = 60) => {
    if (isAllOut) return maxBalls;
    const parts = (oversStr || "0.0").toString().split('.');
    const overs = parseInt(parts[0] || "0", 10);
    const balls = parseInt(parts[1] || "0", 10);
    return overs * 6 + balls;
  };

  const teamABallsFaced = getOversAsBalls(teamAOvers, teamAWickets >= 10);
  const teamABallsBowled = getOversAsBalls(teamBOvers, teamBWickets >= 10);
  
  const teamBBallsFaced = getOversAsBalls(teamBOvers, teamBWickets >= 10);
  const teamBBallsBowled = getOversAsBalls(teamAOvers, teamAWickets >= 10);

  let winnerTeamId = null;
  let isDraw = false;

  if (teamARuns > teamBRuns) {
    winnerTeamId = liveData.teamAId;
  } else if (teamBRuns > teamARuns) {
    winnerTeamId = liveData.teamBId;
  } else {
    isDraw = true;
  }

  // 2. Save to Matches Collection natively including required index keys
  const matchId = liveData.matchId || `match_${Date.now()}`;
  const matchRef = doc(db, 'matches', matchId);
  batch.set(matchRef, {
    status: 'completed',
    matchNumber: liveData.matchNumber || 0,
    teamAId: liveData.teamAId || 'teamA',
    teamBId: liveData.teamBId || 'teamB',
    winnerTeamId: isDraw ? 'DRAW' : winnerTeamId,
    finalScore: {
      teamA: { runs: teamARuns, wickets: teamAWickets, overs: teamAOvers },
      teamB: { runs: teamBRuns, wickets: teamBWickets, overs: teamBOvers }
    }
  }, { merge: true });

  // 3. Process Points Table for Team A
  if (liveData.teamAId) {
    const ptARef = doc(db, 'pointsTable', liveData.teamAId);
    let ptsA = isDraw ? 1 : (winnerTeamId === liveData.teamAId ? 2 : 0);
    
    batch.set(ptARef, {
      teamId: liveData.teamAId,
      matches: increment(1),
      points: increment(ptsA),
      wins: increment(winnerTeamId === liveData.teamAId ? 1 : 0),
      losses: increment(!isDraw && winnerTeamId !== liveData.teamAId ? 1 : 0),
      runsScored: increment(teamARuns),
      runsConceded: increment(teamBRuns),
      ballsFaced: increment(teamABallsFaced),
      ballsBowled: increment(teamABallsBowled)
    }, { merge: true });
  }

  // 4. Process Points Table for Team B
  if (liveData.teamBId) {
    const ptBRef = doc(db, 'pointsTable', liveData.teamBId);
    let ptsB = isDraw ? 1 : (winnerTeamId === liveData.teamBId ? 2 : 0);
    
    batch.set(ptBRef, {
      teamId: liveData.teamBId,
      matches: increment(1),
      points: increment(ptsB),
      wins: increment(winnerTeamId === liveData.teamBId ? 1 : 0),
      losses: increment(!isDraw && winnerTeamId !== liveData.teamBId ? 1 : 0),
      runsScored: increment(teamBRuns),
      runsConceded: increment(teamARuns),
      ballsFaced: increment(teamBBallsFaced),
      ballsBowled: increment(teamBBallsBowled)
    }, { merge: true });
  }

  // 5. Clear liveMatch/current Document
  const liveMatchRef = doc(db, 'liveMatch', 'current');
  batch.update(liveMatchRef, {
    status: 'idle',
    matchId: null,
    teamAId: null,
    teamBId: null,
    battingTeam: null,
    scores: 0,
    wickets: 0,
    balls: 0,
    overs: '0.0',
    lastAction: null
  });

  // Commit atomic operations natively
  await batch.commit();
};

export default app;
