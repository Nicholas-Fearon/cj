const createId = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export const seedTeams = [
  {
    id: 'team-varsity',
    name: 'Varsity Wolves',
    ageGroup: 'U18',
    seasonGoal: 'Win the district title and improve transition defense.',
  },
  {
    id: 'team-jv',
    name: 'Junior Varsity',
    ageGroup: 'U16',
    seasonGoal: 'Build confidence, spacing, and half-court execution.',
  },
];

export const seedPlayers = [
  {
    id: 'player-1',
    teamId: 'team-varsity',
    name: 'Maya Reed',
    number: '3',
    position: 'PG',
    focus: 'Lead pace and take care of the ball.',
  },
  {
    id: 'player-2',
    teamId: 'team-varsity',
    name: 'Zoe Carter',
    number: '11',
    position: 'SG',
    focus: 'Shot preparation and closeout discipline.',
  },
  {
    id: 'player-3',
    teamId: 'team-varsity',
    name: 'Ava Brooks',
    number: '34',
    position: 'C',
    focus: 'Own the boards and screen with force.',
  },
];

export const seedGamePlans = [
  {
    id: 'plan-1',
    teamId: 'team-varsity',
    opponent: 'Central High',
    gameDate: '2026-03-28',
    objectives: 'Win the first three defensive possessions and control tempo.',
    rotation: 'Eight-player rotation with Maya initiating every early offense set.',
    pointsOfEmphasis: 'Tag rollers early, sprint to corners, communicate on switches.',
  },
];

export const seedTrainingPlans = [
  {
    id: 'training-1',
    teamId: 'team-varsity',
    practiceDate: '2026-03-27',
    theme: 'Pressure release and transition finishing',
    objectives:
      'Sharpen press-break spacing, make quicker advantage reads, and finish through contact.',
    drills:
      '5-minute ball-pressure warmup, 4-on-3 escape drill, transition lane-fill finishing, shell closeout segment.',
    intensity: 'High',
    coachingNotes:
      'Keep reps short and loud. Stop only for teaching that directly improves tomorrow’s game.',
  },
];

export const seedReflections = [
  {
    id: 'reflection-1',
    teamId: 'team-varsity',
    opponent: 'North Ridge',
    result: 'W 61-54',
    whatWorked: 'Our weak-side help was early and our bench energy stayed high.',
    needsWork: 'Too many live-ball turnovers against pressure.',
    nextPractice: 'Ball-pressure escape work and 4-on-3 decision drills.',
    createdAt: '2026-03-23T19:00:00.000Z',
  },
];

export const seedJournal = [
  {
    id: 'journal-1',
    title: 'Training theme for the week',
    category: 'Practice',
    content:
      'Keep every drill tied to advantage basketball. We need pace, voice, and finishing through contact.',
    createdAt: '2026-03-24T06:45:00.000Z',
  },
];

const defaultBoardPieces = [
  { id: 'offense-1', label: '1', type: 'offense', x: 24, y: 84 },
  { id: 'offense-2', label: '2', type: 'offense', x: 38, y: 76 },
  { id: 'offense-3', label: '3', type: 'offense', x: 52, y: 68 },
  { id: 'offense-4', label: '4', type: 'offense', x: 66, y: 76 },
  { id: 'offense-5', label: '5', type: 'offense', x: 80, y: 84 },
  { id: 'defense-1', label: 'X1', type: 'defense', x: 24, y: 16 },
  { id: 'defense-2', label: 'X2', type: 'defense', x: 38, y: 24 },
  { id: 'defense-3', label: 'X3', type: 'defense', x: 52, y: 32 },
  { id: 'defense-4', label: 'X4', type: 'defense', x: 66, y: 24 },
  { id: 'defense-5', label: 'X5', type: 'defense', x: 80, y: 16 },
  { id: 'ball-1', label: 'Ball', type: 'ball', x: 52, y: 72 },
  { id: 'cone-1', label: 'Cone', type: 'cone', x: 26, y: 50 },
  { id: 'cone-2', label: 'Cone', type: 'cone', x: 78, y: 50 },
  { id: 'chair-1', label: 'Chair', type: 'chair', x: 12, y: 50 },
  { id: 'coach-1', label: 'Coach', type: 'coach', x: 90, y: 50 },
];

export const createBoardPieces = () =>
  defaultBoardPieces.map((piece) => ({ ...piece }));

export const createBoardTemplate = (name = 'New play board') => ({
  id: createId('board'),
  name,
  courtType: 'ncaa',
  courtView: 'full',
  notes: '',
  pieces: createBoardPieces(),
  actions: [],
  frames: [],
});

export const seedCoachBoards = [
  {
    id: 'board-horns',
    name: 'Horns entry',
    courtType: 'ncaa',
    courtView: 'half',
    notes: 'Use this to walk through the initial alignment and the first action.',
    pieces: createBoardPieces(),
    actions: [
      {
        id: 'action-1',
        type: 'cut',
        startX: 52,
        startY: 68,
        endX: 78,
        endY: 40,
      },
      {
        id: 'action-2',
        type: 'screen',
        startX: 38,
        startY: 76,
        endX: 46,
        endY: 64,
      },
    ],
    frames: [
      createBoardPieces(),
      createBoardPieces().map((piece) => {
        if (piece.id === 'offense-1') return { ...piece, x: 52, y: 58 };
        if (piece.id === 'offense-2') return { ...piece, x: 26, y: 60 };
        if (piece.id === 'offense-3') return { ...piece, x: 78, y: 40 };
        if (piece.id === 'ball-1') return { ...piece, x: 52, y: 58 };
        return piece;
      }),
    ],
  },
];

export const createInitialGameState = (plan, players) => ({
  id: createId('live'),
  teamId: plan?.teamId ?? '',
  planId: plan?.id ?? '',
  opponent: plan?.opponent ?? '',
  gameDate: plan?.gameDate ?? '',
  notes: '',
  playerStats: players.reduce((accumulator, player) => {
    accumulator[player.id] = {
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      fouls: 0,
      minutes: 0,
    };
    return accumulator;
  }, {}),
});

export const createInitialDashboardData = () => ({
  teams: seedTeams,
  players: seedPlayers,
  trainingPlans: seedTrainingPlans,
  coachBoards: seedCoachBoards,
  preGamePlans: seedGamePlans,
  postGameReflections: seedReflections,
  journalEntries: seedJournal,
});

export const createInitialDashboardState = () => ({
  data: createInitialDashboardData(),
  selectedPlanId: seedGamePlans[0]?.id ?? '',
  liveGame: createInitialGameState(seedGamePlans[0], seedPlayers),
});

export const normalizeDashboardPayload = (payload) => {
  const fallback = createInitialDashboardState();
  const data = payload?.data ?? fallback.data;
  const coachBoards = (data.coachBoards ?? fallback.data.coachBoards).map((board) => ({
    ...board,
    courtType: board.courtType ?? 'ncaa',
    courtView: board.courtView ?? 'full',
    actions: board.actions ?? [],
    frames: board.frames ?? [],
    pieces: board.pieces ?? [],
  }));

  return {
    data: {
      teams: data.teams ?? fallback.data.teams,
      players: data.players ?? fallback.data.players,
      trainingPlans: data.trainingPlans ?? fallback.data.trainingPlans,
      coachBoards,
      preGamePlans: data.preGamePlans ?? fallback.data.preGamePlans,
      postGameReflections:
        data.postGameReflections ?? fallback.data.postGameReflections,
      journalEntries: data.journalEntries ?? fallback.data.journalEntries,
    },
    selectedPlanId:
      payload?.selectedPlanId ??
      data.preGamePlans?.[0]?.id ??
      fallback.selectedPlanId,
    liveGame:
      payload?.liveGame ??
      createInitialGameState(data.preGamePlans?.[0] ?? null, data.players ?? []),
  };
};

export { createId };
