'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  createId,
  createInitialDashboardState,
  createInitialGameState,
  normalizeDashboardPayload,
} from '@/lib/dashboardData';
import CoachingBoard from '@/components/CoachingBoard';
import {
  isSupabaseConfigured,
  isSupabaseServerConfigured,
} from '@/lib/supabaseClient';

const storageKey = 'coach-journal-dashboard-v1';

const loadStoredDashboard = () => {
  const fallback = createInitialDashboardState();

  if (typeof window === 'undefined') {
    return fallback;
  }

  const savedData = window.localStorage.getItem(storageKey);

  if (!savedData) {
    return fallback;
  }

  try {
    return normalizeDashboardPayload(JSON.parse(savedData));
  } catch {
    return fallback;
  }
};

const formatStamp = (value) =>
  new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export default function CoachDashboard({ initialSection = 'overview' }) {
  const { user, isLoaded } = useUser();
  const [storedDashboard] = useState(loadStoredDashboard);
  const [data, setData] = useState(storedDashboard.data);
  const [activeSection, setActiveSection] = useState(initialSection);
  const [teamForm, setTeamForm] = useState({
    name: '',
    ageGroup: '',
    seasonGoal: '',
  });
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [playerForm, setPlayerForm] = useState({
    teamId: storedDashboard.data.teams[0]?.id ?? '',
    name: '',
    number: '',
    position: '',
    focus: '',
  });
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [planForm, setPlanForm] = useState({
    teamId: storedDashboard.data.teams[0]?.id ?? '',
    opponent: '',
    gameDate: '',
    objectives: '',
    rotation: '',
    pointsOfEmphasis: '',
  });
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [trainingForm, setTrainingForm] = useState({
    teamId: storedDashboard.data.teams[0]?.id ?? '',
    practiceDate: '',
    theme: '',
    objectives: '',
    drills: '',
    intensity: 'Medium',
    coachingNotes: '',
  });
  const [editingTrainingId, setEditingTrainingId] = useState(null);
  const [reflectionForm, setReflectionForm] = useState({
    teamId: storedDashboard.data.teams[0]?.id ?? '',
    opponent: '',
    result: '',
    whatWorked: '',
    needsWork: '',
    nextPractice: '',
  });
  const [editingReflectionId, setEditingReflectionId] = useState(null);
  const [journalForm, setJournalForm] = useState({
    title: '',
    category: 'General',
    content: '',
  });
  const [editingJournalId, setEditingJournalId] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(storedDashboard.selectedPlanId);
  const [liveGame, setLiveGame] = useState(storedDashboard.liveGame);
  const [syncStatus, setSyncStatus] = useState(
    isSupabaseConfigured && isSupabaseServerConfigured ? 'Connecting to Supabase...' : 'Local-only mode',
  );
  const hasLoadedRemoteRef = useRef(false);
  const latestSaveFingerprintRef = useRef('');

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ data, liveGame, selectedPlanId }),
    );
  }, [data, liveGame, selectedPlanId]);

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      return;
    }

    if (!isSupabaseConfigured) {
      setSyncStatus('Add Supabase public env vars to enable sync');
      return;
    }

    if (!isSupabaseServerConfigured) {
      setSyncStatus('Add SUPABASE_SERVICE_ROLE_KEY to enable secure sync');
      return;
    }

    let isCancelled = false;

    const loadDashboard = async () => {
      setSyncStatus('Loading from Supabase...');

      try {
        const response = await fetch('/api/dashboard', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Unable to load dashboard');
        }

        const payload = normalizeDashboardPayload(await response.json());

        if (isCancelled) {
          return;
        }

        setData(payload.data);
        setSelectedPlanId(payload.selectedPlanId);
        setLiveGame(payload.liveGame);
        latestSaveFingerprintRef.current = JSON.stringify(payload);
        setSyncStatus('Synced with Supabase');
        hasLoadedRemoteRef.current = true;
      } catch {
        if (!isCancelled) {
          setSyncStatus('Using local data until Supabase is ready');
          hasLoadedRemoteRef.current = true;
        }
      }
    };

    loadDashboard();

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, user?.id]);

  useEffect(() => {
    if (!isLoaded || !user?.id || !hasLoadedRemoteRef.current) {
      return;
    }

    if (!isSupabaseConfigured || !isSupabaseServerConfigured) {
      return;
    }

    const payload = { data, liveGame, selectedPlanId };
    const nextFingerprint = JSON.stringify(payload);

    if (latestSaveFingerprintRef.current === nextFingerprint) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setSyncStatus('Saving to Supabase...');

      try {
        const response = await fetch('/api/dashboard', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: nextFingerprint,
        });

        if (!response.ok) {
          throw new Error('Unable to save dashboard');
        }

        latestSaveFingerprintRef.current = nextFingerprint;
        setSyncStatus('Saved to Supabase');
      } catch {
        setSyncStatus('Save failed, keeping local backup');
      }
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [data, isLoaded, liveGame, selectedPlanId, user?.id]);

  const teamsById = useMemo(
    () =>
      data.teams.reduce((accumulator, team) => {
        accumulator[team.id] = team;
        return accumulator;
      }, {}),
    [data.teams],
  );

  const selectedPlan =
    data.preGamePlans.find((plan) => plan.id === selectedPlanId) ??
    data.preGamePlans[0] ??
    null;

  const rosterForSelectedPlan = useMemo(() => {
    if (!selectedPlan?.teamId) {
      return [];
    }

    return data.players.filter((player) => player.teamId === selectedPlan.teamId);
  }, [data.players, selectedPlan]);

  const liveTotals = useMemo(() => {
    return Object.values(liveGame.playerStats).reduce(
      (totals, playerStats) => ({
        points: totals.points + playerStats.points,
        rebounds: totals.rebounds + playerStats.rebounds,
        assists: totals.assists + playerStats.assists,
        fouls: totals.fouls + playerStats.fouls,
      }),
      { points: 0, rebounds: 0, assists: 0, fouls: 0 },
    );
  }, [liveGame.playerStats]);

  const resetTeamForm = (teamId = data.teams[0]?.id ?? '') => {
    setTeamForm({ name: '', ageGroup: '', seasonGoal: '' });
    setEditingTeamId(null);
    setPlayerForm((current) => ({ ...current, teamId: current.teamId || teamId }));
    setTrainingForm((current) => ({ ...current, teamId: current.teamId || teamId }));
    setPlanForm((current) => ({ ...current, teamId: current.teamId || teamId }));
    setReflectionForm((current) => ({ ...current, teamId: current.teamId || teamId }));
  };

  const resetPlayerForm = () => {
    setPlayerForm((current) => ({
      ...current,
      name: '',
      number: '',
      position: '',
      focus: '',
    }));
    setEditingPlayerId(null);
  };

  const resetTrainingForm = () => {
    setTrainingForm((current) => ({
      ...current,
      practiceDate: '',
      theme: '',
      objectives: '',
      drills: '',
      intensity: 'Medium',
      coachingNotes: '',
    }));
    setEditingTrainingId(null);
  };

  const resetPlanForm = () => {
    setPlanForm((current) => ({
      ...current,
      opponent: '',
      gameDate: '',
      objectives: '',
      rotation: '',
      pointsOfEmphasis: '',
    }));
    setEditingPlanId(null);
  };

  const resetReflectionForm = () => {
    setReflectionForm((current) => ({
      ...current,
      opponent: '',
      result: '',
      whatWorked: '',
      needsWork: '',
      nextPractice: '',
    }));
    setEditingReflectionId(null);
  };

  const resetJournalForm = () => {
    setJournalForm({
      title: '',
      category: 'General',
      content: '',
    });
    setEditingJournalId(null);
  };

  const handleAddTeam = (event) => {
    event.preventDefault();
    if (editingTeamId) {
      setData((current) => ({
        ...current,
        teams: current.teams.map((team) =>
          team.id === editingTeamId ? { ...team, ...teamForm } : team,
        ),
      }));
      resetTeamForm();
      return;
    }

    const nextTeam = {
      id: createId('team'),
      ...teamForm,
    };

    setData((current) => ({
      ...current,
      teams: [nextTeam, ...current.teams],
    }));
    setTeamForm({ name: '', ageGroup: '', seasonGoal: '' });
    setPlayerForm((current) => ({ ...current, teamId: nextTeam.id }));
    setTrainingForm((current) => ({ ...current, teamId: nextTeam.id }));
    setPlanForm((current) => ({ ...current, teamId: nextTeam.id }));
    setReflectionForm((current) => ({ ...current, teamId: nextTeam.id }));
  };

  const handleAddPlayer = (event) => {
    event.preventDefault();
    if (editingPlayerId) {
      setData((current) => ({
        ...current,
        players: current.players.map((player) =>
          player.id === editingPlayerId ? { ...player, ...playerForm } : player,
        ),
      }));
      resetPlayerForm();
      return;
    }

    setData((current) => ({
      ...current,
      players: [{ id: createId('player'), ...playerForm }, ...current.players],
    }));
    resetPlayerForm();
  };

  const handleAddPlan = (event) => {
    event.preventDefault();
    if (editingPlanId) {
      const updatedPlan = { id: editingPlanId, ...planForm };
      setData((current) => ({
        ...current,
        preGamePlans: current.preGamePlans.map((plan) =>
          plan.id === editingPlanId ? updatedPlan : plan,
        ),
      }));
      if (selectedPlanId === editingPlanId) {
        const teamRoster = data.players.filter((player) => player.teamId === updatedPlan.teamId);
        setLiveGame(createInitialGameState(updatedPlan, teamRoster));
      }
      resetPlanForm();
      return;
    }

    const nextPlan = { id: createId('plan'), ...planForm };
    setData((current) => ({
      ...current,
      preGamePlans: [nextPlan, ...current.preGamePlans],
    }));
    setSelectedPlanId(nextPlan.id);
    const teamRoster = data.players.filter((player) => player.teamId === nextPlan.teamId);
    setLiveGame(createInitialGameState(nextPlan, teamRoster));
    resetPlanForm();
  };

  const handleAddTrainingPlan = (event) => {
    event.preventDefault();
    if (editingTrainingId) {
      setData((current) => ({
        ...current,
        trainingPlans: current.trainingPlans.map((plan) =>
          plan.id === editingTrainingId ? { ...plan, ...trainingForm } : plan,
        ),
      }));
      resetTrainingForm();
      return;
    }

    setData((current) => ({
      ...current,
      trainingPlans: [{ id: createId('training'), ...trainingForm }, ...current.trainingPlans],
    }));
    resetTrainingForm();
  };

  const handleAddReflection = (event) => {
    event.preventDefault();
    if (editingReflectionId) {
      setData((current) => ({
        ...current,
        postGameReflections: current.postGameReflections.map((entry) =>
          entry.id === editingReflectionId ? { ...entry, ...reflectionForm } : entry,
        ),
      }));
      resetReflectionForm();
      return;
    }

    setData((current) => ({
      ...current,
      postGameReflections: [
        { id: createId('reflection'), ...reflectionForm, createdAt: new Date().toISOString() },
        ...current.postGameReflections,
      ],
    }));
    resetReflectionForm();
  };

  const handleAddJournalEntry = (event) => {
    event.preventDefault();
    if (editingJournalId) {
      setData((current) => ({
        ...current,
        journalEntries: current.journalEntries.map((entry) =>
          entry.id === editingJournalId ? { ...entry, ...journalForm } : entry,
        ),
      }));
      resetJournalForm();
      return;
    }

    setData((current) => ({
      ...current,
      journalEntries: [
        { id: createId('journal'), ...journalForm, createdAt: new Date().toISOString() },
        ...current.journalEntries,
      ],
    }));
    resetJournalForm();
  };

  const updateLiveStat = (playerId, statName, delta) => {
    setLiveGame((current) => {
      const currentStats = current.playerStats[playerId] ?? {
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        fouls: 0,
        minutes: 0,
      };
      const currentValue = currentStats[statName] ?? 0;
      return {
        ...current,
        playerStats: {
          ...current.playerStats,
          [playerId]: {
            ...currentStats,
            [statName]: Math.max(0, currentValue + delta),
          },
        },
      };
    });
  };

  const startEditingTeam = (team) => {
    setActiveSection('teams');
    setEditingTeamId(team.id);
    setTeamForm({
      name: team.name,
      ageGroup: team.ageGroup,
      seasonGoal: team.seasonGoal,
    });
  };

  const deleteTeam = (teamId) => {
    const remainingTeams = data.teams.filter((team) => team.id !== teamId);
    const fallbackTeamId = remainingTeams[0]?.id ?? '';
    const remainingPlayers = data.players.filter((player) => player.teamId !== teamId);
    const remainingPlans = data.preGamePlans.filter((plan) => plan.teamId !== teamId);

    setData((current) => ({
      ...current,
      teams: current.teams.filter((team) => team.id !== teamId),
      players: current.players.filter((player) => player.teamId !== teamId),
      trainingPlans: current.trainingPlans.filter((plan) => plan.teamId !== teamId),
      preGamePlans: current.preGamePlans.filter((plan) => plan.teamId !== teamId),
      postGameReflections: current.postGameReflections.filter(
        (reflection) => reflection.teamId !== teamId,
      ),
    }));

    if (editingTeamId === teamId) {
      resetTeamForm(fallbackTeamId);
    }
    if (playerForm.teamId === teamId) {
      setPlayerForm((current) => ({ ...current, teamId: fallbackTeamId }));
    }
    if (trainingForm.teamId === teamId) {
      setTrainingForm((current) => ({ ...current, teamId: fallbackTeamId }));
    }
    if (planForm.teamId === teamId) {
      setPlanForm((current) => ({ ...current, teamId: fallbackTeamId }));
    }
    if (reflectionForm.teamId === teamId) {
      setReflectionForm((current) => ({ ...current, teamId: fallbackTeamId }));
    }
    if (selectedPlanId && !remainingPlans.some((plan) => plan.id === selectedPlanId)) {
      const nextPlan = remainingPlans[0] ?? null;
      setSelectedPlanId(nextPlan?.id ?? '');
      setLiveGame(createInitialGameState(nextPlan, remainingPlayers.filter((player) => player.teamId === nextPlan?.teamId)));
    }
  };

  const startEditingPlayer = (player) => {
    setActiveSection('teams');
    setEditingPlayerId(player.id);
    setPlayerForm({
      teamId: player.teamId,
      name: player.name,
      number: player.number,
      position: player.position,
      focus: player.focus,
    });
  };

  const deletePlayer = (playerId) => {
    setData((current) => ({
      ...current,
      players: current.players.filter((player) => player.id !== playerId),
    }));
    setLiveGame((current) => {
      const nextStats = { ...current.playerStats };
      delete nextStats[playerId];
      return {
        ...current,
        playerStats: nextStats,
      };
    });
    if (editingPlayerId === playerId) {
      resetPlayerForm();
    }
  };

  const startEditingTraining = (plan) => {
    setActiveSection('training');
    setEditingTrainingId(plan.id);
    setTrainingForm({
      teamId: plan.teamId,
      practiceDate: plan.practiceDate,
      theme: plan.theme,
      objectives: plan.objectives,
      drills: plan.drills,
      intensity: plan.intensity,
      coachingNotes: plan.coachingNotes,
    });
  };

  const deleteTraining = (trainingId) => {
    setData((current) => ({
      ...current,
      trainingPlans: current.trainingPlans.filter((plan) => plan.id !== trainingId),
    }));
    if (editingTrainingId === trainingId) {
      resetTrainingForm();
    }
  };

  const startEditingPlan = (plan) => {
    setActiveSection('pregame');
    setEditingPlanId(plan.id);
    setPlanForm({
      teamId: plan.teamId,
      opponent: plan.opponent,
      gameDate: plan.gameDate,
      objectives: plan.objectives,
      rotation: plan.rotation,
      pointsOfEmphasis: plan.pointsOfEmphasis,
    });
  };

  const deletePlan = (planId) => {
    const remainingPlans = data.preGamePlans.filter((plan) => plan.id !== planId);
    const nextPlan = remainingPlans[0] ?? null;
    setData((current) => ({
      ...current,
      preGamePlans: current.preGamePlans.filter((plan) => plan.id !== planId),
    }));
    if (editingPlanId === planId) {
      resetPlanForm();
    }
    if (selectedPlanId === planId) {
      setSelectedPlanId(nextPlan?.id ?? '');
      setLiveGame(
        createInitialGameState(
          nextPlan,
          data.players.filter((player) => player.teamId === nextPlan?.teamId),
        ),
      );
    }
  };

  const startEditingReflection = (entry) => {
    setActiveSection('postgame');
    setEditingReflectionId(entry.id);
    setReflectionForm({
      teamId: entry.teamId,
      opponent: entry.opponent,
      result: entry.result,
      whatWorked: entry.whatWorked,
      needsWork: entry.needsWork,
      nextPractice: entry.nextPractice,
    });
  };

  const deleteReflection = (reflectionId) => {
    setData((current) => ({
      ...current,
      postGameReflections: current.postGameReflections.filter(
        (entry) => entry.id !== reflectionId,
      ),
    }));
    if (editingReflectionId === reflectionId) {
      resetReflectionForm();
    }
  };

  const startEditingJournal = (entry) => {
    setActiveSection('journal');
    setEditingJournalId(entry.id);
    setJournalForm({
      title: entry.title,
      category: entry.category,
      content: entry.content,
    });
  };

  const deleteJournal = (journalId) => {
    setData((current) => ({
      ...current,
      journalEntries: current.journalEntries.filter((entry) => entry.id !== journalId),
    }));
    if (editingJournalId === journalId) {
      resetJournalForm();
    }
  };

  const saveBoard = (board) => {
    setData((current) => {
      const exists = current.coachBoards.some((entry) => entry.id === board.id);
      return {
        ...current,
        coachBoards: exists
          ? current.coachBoards.map((entry) => (entry.id === board.id ? board : entry))
          : [board, ...current.coachBoards],
      };
    });
  };

  const deleteBoard = (boardId) => {
    setData((current) => ({
      ...current,
      coachBoards: current.coachBoards.filter((board) => board.id !== boardId),
    }));
  };

  const quickSections = [
    { id: 'overview', label: 'Overview' },
    { id: 'teams', label: 'Teams + Players' },
    { id: 'training', label: 'Training' },
    { id: 'board', label: 'Board' },
    { id: 'pregame', label: 'Pre-game' },
    { id: 'ingame', label: 'In-game' },
    { id: 'postgame', label: 'Post-game' },
    { id: 'journal', label: 'Journal' },
  ];

  const renderOverview = () => (
    <section className="dashboard-shell">
      <div className="dashboard-hero">
        <div className="dashboard-panel">
          <p className="section-kicker">Coach workspace</p>
          <h1>Everything you need from practice to final buzzer.</h1>
          <p>
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}. Build
            rosters, map out game plans, track live performance, and store your
            coaching reflections in one place.
          </p>
          <div className="stack-actions">
            {quickSections.slice(1).map((section) => (
              <button
                className="ghost-button"
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                type="button"
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>

        <div className="summary-grid">
          <article className="summary-card">
            <span className="label">Teams</span>
            <strong>{data.teams.length}</strong>
            <p className="small-copy">Active squads in your workspace</p>
          </article>
          <article className="summary-card">
            <span className="label">Players</span>
            <strong>{data.players.length}</strong>
            <p className="small-copy">Rostered athletes tracked for sessions</p>
          </article>
          <article className="summary-card">
            <span className="label">Training plans</span>
            <strong>{data.trainingPlans.length}</strong>
            <p className="small-copy">Structured sessions ready for the floor</p>
          </article>
          <article className="summary-card">
            <span className="label">Game plans</span>
            <strong>{data.preGamePlans.length}</strong>
            <p className="small-copy">Prepared scouting and pre-tip notes</p>
          </article>
          <article className="summary-card">
            <span className="label">Boards</span>
            <strong>{data.coachBoards.length}</strong>
            <p className="small-copy">Animated play diagrams in your library</p>
          </article>
        </div>
      </div>

      <div className="content-grid">
        <div className="stack">
          <section className="section-card">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Upcoming game</p>
                <h2>{selectedPlan ? selectedPlan.opponent : 'Create your first plan'}</h2>
              </div>
            </div>
            {selectedPlan ? (
              <div className="stack">
                <p className="entry-meta">
                  {teamsById[selectedPlan.teamId]?.name} on {selectedPlan.gameDate}
                </p>
                <div>
                  <span className="label">Objectives</span>
                  <p>{selectedPlan.objectives}</p>
                </div>
                <div>
                  <span className="label">Rotation</span>
                  <p>{selectedPlan.rotation}</p>
                </div>
                <div>
                  <span className="label">Points of emphasis</span>
                  <p>{selectedPlan.pointsOfEmphasis}</p>
                </div>
              </div>
            ) : (
              <p className="empty-state">
                Add a pre-game plan to start organizing scouting, rotation, and
                focus areas.
              </p>
            )}
          </section>

          <section className="tracker-card">
            <div className="tracker-head">
              <div>
                <p className="section-kicker">Next practice</p>
                <h2>{data.trainingPlans[0]?.theme ?? 'Create your first training plan'}</h2>
              </div>
            </div>
            {data.trainingPlans[0] ? (
              <div className="stack">
                <p className="entry-meta">
                  {teamsById[data.trainingPlans[0].teamId]?.name} on{' '}
                  {data.trainingPlans[0].practiceDate}
                </p>
                <div>
                  <span className="label">Objectives</span>
                  <p>{data.trainingPlans[0].objectives}</p>
                </div>
                <div>
                  <span className="label">Drills</span>
                  <p>{data.trainingPlans[0].drills}</p>
                </div>
                <span className="positive-badge">
                  Intensity: {data.trainingPlans[0].intensity}
                </span>
              </div>
            ) : (
              <p className="empty-state">
                Add a training plan to map out practice themes, drills, and coaching notes.
              </p>
            )}
          </section>
        </div>

        <section className="journal-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Workspace status</p>
              <h2>Platform setup</h2>
            </div>
          </div>
          <div className="stack">
            <div className="item-card">
              <span className="label">Authentication</span>
              <h4>Clerk is active</h4>
              <p className="entry-meta">
                Signed-in and signed-out routes are already wired for this app.
              </p>
            </div>
            <div className="item-card">
              <span className="label">Database</span>
              <h4>
                {isSupabaseConfigured
                  ? isSupabaseServerConfigured
                    ? 'Supabase connected'
                    : 'Server key still needed'
                  : 'Supabase env vars needed'}
              </h4>
              <p className="entry-meta">
                {isSupabaseConfigured
                  ? isSupabaseServerConfigured
                    ? 'Dashboard data can sync securely through the authenticated API route.'
                    : 'Add SUPABASE_SERVICE_ROLE_KEY on the server so Clerk-authenticated saves can reach Supabase.'
                  : 'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to connect persistent storage.'}
              </p>
            </div>
            <div className="item-card">
              <span className="label">Sync status</span>
              <h4>{syncStatus}</h4>
              <p className="entry-meta">
                Local storage remains as a backup, and authenticated Supabase
                sync is used whenever the server credentials are available.
              </p>
            </div>
          </div>
        </section>
      </div>
    </section>
  );

  const renderTeamsSection = () => (
    <section className="content-grid">
      <div className="stack">
        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Roster setup</p>
              <h2>{editingTeamId ? 'Update team' : 'Add a team'}</h2>
            </div>
          </div>
          <form className="stack" onSubmit={handleAddTeam}>
            <div className="field-grid">
              <input
                className="input-field"
                onChange={(event) =>
                  setTeamForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Team name"
                required
                value={teamForm.name}
              />
              <input
                className="input-field"
                onChange={(event) =>
                  setTeamForm((current) => ({ ...current, ageGroup: event.target.value }))
                }
                placeholder="Age group"
                required
                value={teamForm.ageGroup}
              />
              <textarea
                className="textarea-field full-span"
                onChange={(event) =>
                  setTeamForm((current) => ({
                    ...current,
                    seasonGoal: event.target.value,
                  }))
                }
                placeholder="Season goal or development theme"
                required
                value={teamForm.seasonGoal}
              />
            </div>
            <div className="stack-actions">
              <button className="primary-button" type="submit">
                {editingTeamId ? 'Update team' : 'Save team'}
              </button>
              {editingTeamId ? (
                <button
                  className="secondary-button"
                  onClick={() => resetTeamForm()}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Roster setup</p>
              <h2>{editingPlayerId ? 'Update player' : 'Add a player'}</h2>
            </div>
          </div>
          <form className="stack" onSubmit={handleAddPlayer}>
            <div className="field-grid">
              <select
                className="select-field"
                onChange={(event) =>
                  setPlayerForm((current) => ({ ...current, teamId: event.target.value }))
                }
                required
                value={playerForm.teamId}
              >
                {data.teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <input
                className="input-field"
                onChange={(event) =>
                  setPlayerForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Player name"
                required
                value={playerForm.name}
              />
              <input
                className="input-field"
                onChange={(event) =>
                  setPlayerForm((current) => ({ ...current, number: event.target.value }))
                }
                placeholder="Jersey number"
                required
                value={playerForm.number}
              />
              <input
                className="input-field"
                onChange={(event) =>
                  setPlayerForm((current) => ({ ...current, position: event.target.value }))
                }
                placeholder="Position"
                required
                value={playerForm.position}
              />
              <textarea
                className="textarea-field full-span"
                onChange={(event) =>
                  setPlayerForm((current) => ({ ...current, focus: event.target.value }))
                }
                placeholder="Development focus"
                required
                value={playerForm.focus}
              />
            </div>
            <div className="stack-actions">
              <button className="primary-button" type="submit">
                {editingPlayerId ? 'Update player' : 'Add player'}
              </button>
              {editingPlayerId ? (
                <button
                  className="secondary-button"
                  onClick={() => resetPlayerForm()}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>

      <div className="stack">
        <section className="list-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Teams</p>
              <h3>Current squads</h3>
            </div>
          </div>
          <div className="list">
            {data.teams.map((team) => (
              <article className="item-card" key={team.id}>
                <div className="item-header">
                  <div>
                    <h4>{team.name}</h4>
                    <p className="entry-meta">{team.ageGroup}</p>
                  </div>
                  <div className="stack-actions">
                    <span className="badge">
                      {data.players.filter((player) => player.teamId === team.id).length} players
                    </span>
                    <button
                      className="ghost-button"
                      onClick={() => startEditingTeam(team)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => deleteTeam(team.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="item-notes">{team.seasonGoal}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="list-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Players</p>
              <h3>Roster board</h3>
            </div>
          </div>
          <div className="list">
            {data.players.map((player) => (
              <article className="item-card" key={player.id}>
                <div className="item-header">
                  <div>
                    <h4>
                      #{player.number} {player.name}
                    </h4>
                    <p className="entry-meta">
                      {player.position} • {teamsById[player.teamId]?.name}
                    </p>
                  </div>
                  <div className="stack-actions">
                    <button
                      className="ghost-button"
                      onClick={() => startEditingPlayer(player)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => deletePlayer(player.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="item-notes">{player.focus}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );

  const renderPreGameSection = () => (
    <section className="content-grid">
      <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Pre-game planner</p>
              <h2>{editingPlanId ? 'Update a game plan' : 'Create a game plan'}</h2>
            </div>
          </div>
        <form className="stack" onSubmit={handleAddPlan}>
          <div className="field-grid">
            <select
              className="select-field"
              onChange={(event) =>
                setPlanForm((current) => ({ ...current, teamId: event.target.value }))
              }
              required
              value={planForm.teamId}
            >
              {data.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <input
              className="input-field"
              onChange={(event) =>
                setPlanForm((current) => ({ ...current, opponent: event.target.value }))
              }
              placeholder="Opponent"
              required
              value={planForm.opponent}
            />
            <input
              className="input-field full-span"
              onChange={(event) =>
                setPlanForm((current) => ({ ...current, gameDate: event.target.value }))
              }
              required
              type="date"
              value={planForm.gameDate}
            />
            <textarea
              className="textarea-field full-span"
              onChange={(event) =>
                setPlanForm((current) => ({ ...current, objectives: event.target.value }))
              }
              placeholder="Win conditions and priorities"
              required
              value={planForm.objectives}
            />
            <textarea
              className="textarea-field full-span"
              onChange={(event) =>
                setPlanForm((current) => ({ ...current, rotation: event.target.value }))
              }
              placeholder="Rotation and substitution plan"
              required
              value={planForm.rotation}
            />
            <textarea
              className="textarea-field full-span"
              onChange={(event) =>
                setPlanForm((current) => ({
                  ...current,
                  pointsOfEmphasis: event.target.value,
                }))
              }
              placeholder="Tactical reminders, scouting notes, special situations"
              required
              value={planForm.pointsOfEmphasis}
            />
          </div>
          <div className="stack-actions">
            <button className="primary-button" type="submit">
              {editingPlanId ? 'Update pre-game plan' : 'Save pre-game plan'}
            </button>
            {editingPlanId ? (
              <button
                className="secondary-button"
                onClick={() => resetPlanForm()}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="list-card">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Saved plans</p>
            <h3>Upcoming games</h3>
          </div>
        </div>
        <div className="list">
          {data.preGamePlans.map((plan) => (
            <article className="item-card" key={plan.id}>
              <div className="item-header">
                <div>
                  <h4>{plan.opponent}</h4>
                  <p className="entry-meta">
                    {teamsById[plan.teamId]?.name} • {plan.gameDate}
                  </p>
                </div>
                <button
                  className="ghost-button"
                  onClick={() => {
                    setSelectedPlanId(plan.id);
                    const teamRoster = data.players.filter(
                      (player) => player.teamId === plan.teamId,
                    );
                    setLiveGame(createInitialGameState(plan, teamRoster));
                    setActiveSection('ingame');
                  }}
                  type="button"
                >
                  Open live tracker
                </button>
                <button
                  className="ghost-button"
                  onClick={() => startEditingPlan(plan)}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="ghost-button"
                  onClick={() => deletePlan(plan.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
              <div className="badge-row">
                <span className="badge">Objectives ready</span>
                <span className="badge">Rotation ready</span>
              </div>
              <p className="item-notes">{plan.pointsOfEmphasis}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );

  const renderBoardSection = () => (
    <CoachingBoard
      boards={data.coachBoards}
      onDeleteBoard={deleteBoard}
      onSaveBoard={saveBoard}
    />
  );

  const renderTrainingSection = () => (
    <section className="content-grid">
      <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Training planner</p>
              <h2>{editingTrainingId ? 'Update a practice session' : 'Design a practice session'}</h2>
            </div>
          </div>
        <form className="stack" onSubmit={handleAddTrainingPlan}>
          <div className="field-grid">
            <select
              className="select-field"
              onChange={(event) =>
                setTrainingForm((current) => ({ ...current, teamId: event.target.value }))
              }
              required
              value={trainingForm.teamId}
            >
              {data.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <input
              className="input-field"
              onChange={(event) =>
                setTrainingForm((current) => ({
                  ...current,
                  practiceDate: event.target.value,
                }))
              }
              required
              type="date"
              value={trainingForm.practiceDate}
            />
            <input
              className="input-field full-span"
              onChange={(event) =>
                setTrainingForm((current) => ({ ...current, theme: event.target.value }))
              }
              placeholder="Session theme"
              required
              value={trainingForm.theme}
            />
            <textarea
              className="textarea-field full-span"
              onChange={(event) =>
                setTrainingForm((current) => ({
                  ...current,
                  objectives: event.target.value,
                }))
              }
              placeholder="What must improve in this training session?"
              required
              value={trainingForm.objectives}
            />
            <textarea
              className="textarea-field full-span"
              onChange={(event) =>
                setTrainingForm((current) => ({ ...current, drills: event.target.value }))
              }
              placeholder="Drill sequence and activity plan"
              required
              value={trainingForm.drills}
            />
            <select
              className="select-field full-span"
              onChange={(event) =>
                setTrainingForm((current) => ({
                  ...current,
                  intensity: event.target.value,
                }))
              }
              value={trainingForm.intensity}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <textarea
              className="textarea-field full-span"
              onChange={(event) =>
                setTrainingForm((current) => ({
                  ...current,
                  coachingNotes: event.target.value,
                }))
              }
              placeholder="Coaching cues, standards, and reminders"
              required
              value={trainingForm.coachingNotes}
            />
          </div>
          <div className="stack-actions">
            <button className="primary-button" type="submit">
              {editingTrainingId ? 'Update training plan' : 'Save training plan'}
            </button>
            {editingTrainingId ? (
              <button
                className="secondary-button"
                onClick={() => resetTrainingForm()}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="list-card">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Practice board</p>
            <h3>Saved training sessions</h3>
          </div>
        </div>
        <div className="list">
          {data.trainingPlans.map((plan) => (
            <article className="item-card" key={plan.id}>
              <div className="item-header">
                <div>
                  <h4>{plan.theme}</h4>
                  <p className="entry-meta">
                    {teamsById[plan.teamId]?.name} • {plan.practiceDate}
                  </p>
                </div>
                <div className="stack-actions">
                  <span className="badge">{plan.intensity}</span>
                  <button
                    className="ghost-button"
                    onClick={() => startEditingTraining(plan)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() => deleteTraining(plan.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="stack">
                <div>
                  <span className="label">Objectives</span>
                  <p className="item-notes">{plan.objectives}</p>
                </div>
                <div>
                  <span className="label">Drills</span>
                  <p className="item-notes">{plan.drills}</p>
                </div>
                <div>
                  <span className="label">Coaching notes</span>
                  <p className="item-notes">{plan.coachingNotes}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );

  const renderInGameSection = () => (
    <section className="stack">
      <section className="tracker-card">
        <div className="tracker-head">
          <div>
            <p className="section-kicker">Live game tracker</p>
            <h2>
              {selectedPlan ? `${teamsById[selectedPlan.teamId]?.name} vs ${selectedPlan.opponent}` : 'Select a pre-game plan'}
            </h2>
            <p className="entry-meta">
              {selectedPlan
                ? `Tracking ${rosterForSelectedPlan.length} players for ${selectedPlan.gameDate}`
                : 'Create a pre-game plan first to load a roster into the tracker.'}
            </p>
          </div>
          <div className="stack-actions">
            <select
              className="select-field"
              onChange={(event) => {
                const nextPlan = data.preGamePlans.find(
                  (plan) => plan.id === event.target.value,
                );
                setSelectedPlanId(event.target.value);
                setLiveGame(
                  createInitialGameState(
                    nextPlan ?? null,
                    data.players.filter((player) => player.teamId === nextPlan?.teamId),
                  ),
                );
              }}
              value={selectedPlanId}
            >
              {data.preGamePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {teamsById[plan.teamId]?.name} vs {plan.opponent}
                </option>
              ))}
            </select>
            <button
              className="secondary-button"
              onClick={() => setLiveGame(createInitialGameState(selectedPlan, rosterForSelectedPlan))}
              type="button"
            >
              Reset stats
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-box">
            <span className="label">Points</span>
            <strong>{liveTotals.points}</strong>
          </div>
          <div className="stat-box">
            <span className="label">Rebounds</span>
            <strong>{liveTotals.rebounds}</strong>
          </div>
          <div className="stat-box">
            <span className="label">Assists</span>
            <strong>{liveTotals.assists}</strong>
          </div>
        </div>

        <textarea
          className="textarea-field"
          onChange={(event) =>
            setLiveGame((current) => ({ ...current, notes: event.target.value }))
          }
          placeholder="Bench notes, momentum swings, timeout reminders"
          value={liveGame.notes}
        />
      </section>

      <section className="player-stats">
        {rosterForSelectedPlan.length ? (
          rosterForSelectedPlan.map((player) => {
            const stats = liveGame.playerStats[player.id] ?? {
              points: 0,
              rebounds: 0,
              assists: 0,
              steals: 0,
              blocks: 0,
              fouls: 0,
              minutes: 0,
            };

            return (
              <article className="player-row" key={player.id}>
                <div className="player-headline">
                  <div>
                    <h3>
                      #{player.number} {player.name}
                    </h3>
                    <p className="entry-meta">
                      {player.position} • {player.focus}
                    </p>
                  </div>
                  <span className={stats.fouls >= 4 ? 'foul-badge' : 'badge'}>
                    Fouls: {stats.fouls}
                  </span>
                </div>
                <div className="badge-row">
                  <span className="badge">PTS {stats.points}</span>
                  <span className="badge">REB {stats.rebounds}</span>
                  <span className="badge">AST {stats.assists}</span>
                  <span className="badge">STL {stats.steals}</span>
                  <span className="badge">BLK {stats.blocks}</span>
                  <span className="badge">MIN {stats.minutes}</span>
                </div>
                <div className="stat-line">
                  <span className="label">Points</span>
                  <div className="stat-controls">
                    <button
                      className="stat-button"
                      onClick={() => updateLiveStat(player.id, 'points', -1)}
                      type="button"
                    >
                      -1
                    </button>
                    <button
                      className="stat-button"
                      onClick={() => updateLiveStat(player.id, 'points', 1)}
                      type="button"
                    >
                      +1
                    </button>
                    <button
                      className="stat-button"
                      onClick={() => updateLiveStat(player.id, 'points', 2)}
                      type="button"
                    >
                      +2
                    </button>
                    <button
                      className="stat-button"
                      onClick={() => updateLiveStat(player.id, 'points', 3)}
                      type="button"
                    >
                      +3
                    </button>
                  </div>
                </div>
                <div className="stat-line">
                  <span className="label">Other</span>
                  <div className="stat-controls">
                    <button
                      className="stat-button"
                      onClick={() => updateLiveStat(player.id, 'rebounds', 1)}
                      type="button"
                    >
                      REB
                    </button>
                    <button
                      className="stat-button"
                      onClick={() => updateLiveStat(player.id, 'assists', 1)}
                      type="button"
                    >
                      AST
                    </button>
                    <button
                      className="stat-button"
                      onClick={() => updateLiveStat(player.id, 'steals', 1)}
                      type="button"
                    >
                      STL
                    </button>
                    <button
                      className="stat-button"
                      onClick={() => updateLiveStat(player.id, 'blocks', 1)}
                      type="button"
                    >
                      BLK
                    </button>
                    <button
                      className="stat-button"
                      onClick={() => updateLiveStat(player.id, 'minutes', 1)}
                      type="button"
                    >
                      MIN
                    </button>
                    <button
                      className="stat-button"
                      onClick={() => updateLiveStat(player.id, 'fouls', 1)}
                      type="button"
                    >
                      FOUL
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <p className="empty-state">
            No players are attached to the selected game plan yet.
          </p>
        )}
      </section>
    </section>
  );

  const renderPostGameSection = () => (
    <section className="content-grid">
      <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Post-game review</p>
              <h2>{editingReflectionId ? 'Update reflection' : 'Log reflections'}</h2>
            </div>
          </div>
        <form className="stack" onSubmit={handleAddReflection}>
          <div className="field-grid">
            <select
              className="select-field"
              onChange={(event) =>
                setReflectionForm((current) => ({ ...current, teamId: event.target.value }))
              }
              required
              value={reflectionForm.teamId}
            >
              {data.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <input
              className="input-field"
              onChange={(event) =>
                setReflectionForm((current) => ({ ...current, opponent: event.target.value }))
              }
              placeholder="Opponent"
              required
              value={reflectionForm.opponent}
            />
            <input
              className="input-field full-span"
              onChange={(event) =>
                setReflectionForm((current) => ({ ...current, result: event.target.value }))
              }
              placeholder="Result, for example W 58-49"
              required
              value={reflectionForm.result}
            />
            <textarea
              className="textarea-field full-span"
              onChange={(event) =>
                setReflectionForm((current) => ({
                  ...current,
                  whatWorked: event.target.value,
                }))
              }
              placeholder="What worked"
              required
              value={reflectionForm.whatWorked}
            />
            <textarea
              className="textarea-field full-span"
              onChange={(event) =>
                setReflectionForm((current) => ({
                  ...current,
                  needsWork: event.target.value,
                }))
              }
              placeholder="What needs work"
              required
              value={reflectionForm.needsWork}
            />
            <textarea
              className="textarea-field full-span"
              onChange={(event) =>
                setReflectionForm((current) => ({
                  ...current,
                  nextPractice: event.target.value,
                }))
              }
              placeholder="Next practice actions"
              required
              value={reflectionForm.nextPractice}
            />
          </div>
          <div className="stack-actions">
            <button className="primary-button" type="submit">
              {editingReflectionId ? 'Update reflection' : 'Save reflection'}
            </button>
            {editingReflectionId ? (
              <button
                className="secondary-button"
                onClick={() => resetReflectionForm()}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="list-card">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Reflection log</p>
            <h3>Recent reviews</h3>
          </div>
        </div>
        <div className="list">
          {data.postGameReflections.map((entry) => (
            <article className="item-card" key={entry.id}>
              <div className="item-header">
                <div>
                  <h4>
                    {teamsById[entry.teamId]?.name} vs {entry.opponent}
                  </h4>
                  <p className="entry-meta">
                    {entry.result} • {formatStamp(entry.createdAt)}
                  </p>
                </div>
                <div className="stack-actions">
                  <button
                    className="ghost-button"
                    onClick={() => startEditingReflection(entry)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() => deleteReflection(entry.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="stack">
                <div>
                  <span className="label">What worked</span>
                  <p className="item-notes">{entry.whatWorked}</p>
                </div>
                <div>
                  <span className="label">Needs work</span>
                  <p className="item-notes">{entry.needsWork}</p>
                </div>
                <div>
                  <span className="label">Next practice</span>
                  <p className="item-notes">{entry.nextPractice}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );

  const renderJournalSection = () => (
    <section className="content-grid">
      <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Coaching journal</p>
              <h2>{editingJournalId ? 'Update journal entry' : 'Capture thoughts fast'}</h2>
            </div>
          </div>
        <form className="stack" onSubmit={handleAddJournalEntry}>
          <div className="field-grid">
            <input
              className="input-field full-span"
              onChange={(event) =>
                setJournalForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Entry title"
              required
              value={journalForm.title}
            />
            <select
              className="select-field full-span"
              onChange={(event) =>
                setJournalForm((current) => ({ ...current, category: event.target.value }))
              }
              value={journalForm.category}
            >
              <option value="General">General</option>
              <option value="Practice">Practice</option>
              <option value="Game">Game</option>
              <option value="Culture">Culture</option>
              <option value="Player development">Player development</option>
            </select>
            <textarea
              className="textarea-field full-span"
              onChange={(event) =>
                setJournalForm((current) => ({ ...current, content: event.target.value }))
              }
              placeholder="What did you notice, learn, or want to revisit later?"
              required
              value={journalForm.content}
            />
          </div>
          <div className="stack-actions">
            <button className="primary-button" type="submit">
              {editingJournalId ? 'Update journal entry' : 'Save journal entry'}
            </button>
            {editingJournalId ? (
              <button
                className="secondary-button"
                onClick={() => resetJournalForm()}
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="journal-card">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Entry archive</p>
            <h3>Journal timeline</h3>
          </div>
        </div>
        <div className="journal-list">
          {data.journalEntries.map((entry) => (
            <article className="journal-entry" key={entry.id}>
              <div className="item-header">
                <span className="label">{entry.category}</span>
                <div className="stack-actions">
                  <button
                    className="ghost-button"
                    onClick={() => startEditingJournal(entry)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() => deleteJournal(entry.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <h4>{entry.title}</h4>
              <p className="entry-meta">{formatStamp(entry.createdAt)}</p>
              <p>{entry.content}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );

  return (
    <main className="dashboard-shell">
      <section className="dashboard-panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Navigation</p>
            <h2>Coach dashboard</h2>
          </div>
        </div>
        <div className="stack-actions">
          {quickSections.map((section) => (
            <button
              className={activeSection === section.id ? 'primary-button' : 'secondary-button'}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </div>
      </section>

      {activeSection === 'overview' && renderOverview()}
      {activeSection === 'teams' && renderTeamsSection()}
      {activeSection === 'training' && renderTrainingSection()}
      {activeSection === 'board' && renderBoardSection()}
      {activeSection === 'pregame' && renderPreGameSection()}
      {activeSection === 'ingame' && renderInGameSection()}
      {activeSection === 'postgame' && renderPostGameSection()}
      {activeSection === 'journal' && renderJournalSection()}
    </main>
  );
}
