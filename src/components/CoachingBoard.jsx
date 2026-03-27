'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createBoardTemplate, createId } from '@/lib/dashboardData';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const clonePieces = (pieces) => pieces.map((piece) => ({ ...piece }));

const palette = [
  { type: 'offense', label: '1', name: 'Offense player', x: 28, y: 84 },
  { type: 'defense', label: 'X1', name: 'Defense player', x: 72, y: 16 },
  { type: 'ball', label: 'Ball', name: 'Ball', x: 52, y: 72 },
  { type: 'cone', label: 'Cone', name: 'Cone', x: 20, y: 50 },
  { type: 'chair', label: 'Chair', name: 'Chair', x: 12, y: 50 },
  { type: 'coach', label: 'Coach', name: 'Coach', x: 90, y: 50 },
];

const actionPalette = [
  { type: 'screen', name: 'Screen' },
  { type: 'dribble', name: 'Dribble' },
  { type: 'handoff', name: 'DHO' },
  { type: 'cut', name: 'Cut' },
  { type: 'shot', name: 'Shot' },
];

const courtPresets = {
  nba: {
    label: 'NBA',
    fullLengthFt: 94,
    halfLengthFt: 47,
    widthFt: 50,
    laneWidthFt: 16,
    laneDepthFt: 19,
    threeRadiusFt: 23.75,
    cornerOffsetFt: 3,
    restrictedRadiusFt: 4,
  },
  ncaa: {
    label: 'NCAA',
    fullLengthFt: 94,
    halfLengthFt: 47,
    widthFt: 50,
    laneWidthFt: 12,
    laneDepthFt: 19,
    threeRadiusFt: 22.1458,
    cornerOffsetFt: 3,
    restrictedRadiusFt: 4,
  },
  fiba: {
    label: 'FIBA',
    fullLengthFt: 91.86,
    halfLengthFt: 45.93,
    widthFt: 49.21,
    laneWidthFt: 16.08,
    laneDepthFt: 19.03,
    threeRadiusFt: 22.1458,
    cornerOffsetFt: 2.95,
    restrictedRadiusFt: 4.27,
  },
  high_school: {
    label: 'High School',
    fullLengthFt: 94,
    halfLengthFt: 47,
    widthFt: 50,
    laneWidthFt: 12,
    laneDepthFt: 19,
    threeRadiusFt: 19.75,
    cornerOffsetFt: 5.25,
    restrictedRadiusFt: null,
  },
};

const toCourtX = (feet, widthFt) => 2 + feet * (96 / widthFt);
const toCourtY = (feet, lengthFt) => 2 + feet * (96 / lengthFt);

function drawEnd({ preset, baseline, towardCenter, lengthFt }) {
  const hoopY = toCourtY(baseline + 5.25 * towardCenter, lengthFt);
  const backboardY = toCourtY(baseline + 4 * towardCenter, lengthFt);
  const laneFrontY = toCourtY(
    baseline + preset.laneDepthFt * towardCenter,
    lengthFt,
  );
  const laneLeftX = 50 - (preset.laneWidthFt / 2) * (96 / preset.widthFt);
  const laneRightX = 50 + (preset.laneWidthFt / 2) * (96 / preset.widthFt);
  const freeThrowCircleR = 6 * (96 / preset.widthFt);
  const threeRadiusX = preset.threeRadiusFt * (96 / preset.widthFt);
  const threeRadiusY = preset.threeRadiusFt * (96 / lengthFt);
  const cornerLeftX = toCourtX(preset.cornerOffsetFt, preset.widthFt);
  const cornerRightX = toCourtX(preset.widthFt - preset.cornerOffsetFt, preset.widthFt);
  const dx = 50 - cornerLeftX;
  const verticalScaleRatio = (96 / preset.widthFt) / (96 / lengthFt);
  const arcJoinOffset = Math.sqrt(
    Math.max(0, threeRadiusY ** 2 - (dx * verticalScaleRatio) ** 2),
  );
  const arcJoinY = hoopY + arcJoinOffset * towardCenter;
  const restrictedRadiusX = preset.restrictedRadiusFt
    ? preset.restrictedRadiusFt * (96 / preset.widthFt)
    : null;
  const restrictedRadiusY = preset.restrictedRadiusFt
    ? preset.restrictedRadiusFt * (96 / lengthFt)
    : null;

  return (
    <>
      <rect
        height={Math.abs(laneFrontY - toCourtY(baseline, lengthFt))}
        width={laneRightX - laneLeftX}
        x={laneLeftX}
        y={Math.min(laneFrontY, toCourtY(baseline, lengthFt))}
      />
      <line x1="40" x2="60" y1={backboardY} y2={backboardY} />
      <circle cx="50" cy={hoopY} r="1.2" />
      <circle cx="50" cy={laneFrontY} r={freeThrowCircleR} />
      <path
        d={
          towardCenter > 0
            ? `M ${50 - freeThrowCircleR} ${laneFrontY} A ${freeThrowCircleR} ${freeThrowCircleR} 0 0 0 ${
                50 + freeThrowCircleR
              } ${laneFrontY}`
            : `M ${50 - freeThrowCircleR} ${laneFrontY} A ${freeThrowCircleR} ${freeThrowCircleR} 0 0 1 ${
                50 + freeThrowCircleR
              } ${laneFrontY}`
        }
      />
      {restrictedRadiusX && restrictedRadiusY ? (
        <path
          d={
            towardCenter > 0
              ? `M ${50 - restrictedRadiusX} ${hoopY} A ${restrictedRadiusX} ${restrictedRadiusY} 0 0 0 ${
                  50 + restrictedRadiusX
                } ${hoopY}`
              : `M ${50 - restrictedRadiusX} ${hoopY} A ${restrictedRadiusX} ${restrictedRadiusY} 0 0 1 ${
                  50 + restrictedRadiusX
                } ${hoopY}`
          }
        />
      ) : null}
      <line x1={cornerLeftX} x2={cornerLeftX} y1={toCourtY(baseline, lengthFt)} y2={arcJoinY} />
      <line x1={cornerRightX} x2={cornerRightX} y1={toCourtY(baseline, lengthFt)} y2={arcJoinY} />
      <path
        d={
          towardCenter > 0
            ? `M ${cornerLeftX} ${arcJoinY} A ${threeRadiusX} ${threeRadiusY} 0 0 1 ${cornerRightX} ${arcJoinY}`
            : `M ${cornerLeftX} ${arcJoinY} A ${threeRadiusX} ${threeRadiusY} 0 0 0 ${cornerRightX} ${arcJoinY}`
        }
      />
    </>
  );
}

function CourtLines({ courtType, courtView }) {
  const preset = courtPresets[courtType] ?? courtPresets.ncaa;
  const lengthFt = courtView === 'half' ? preset.halfLengthFt : preset.fullLengthFt;

  return (
    <svg
      aria-hidden="true"
      className="court-lines-layer"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <rect height="96" rx="1.5" ry="1.5" width="96" x="2" y="2" />
      {courtView === 'full' ? (
        <>
          <line x1="2" x2="98" y1="50" y2="50" />
          <circle cx="50" cy="50" r={toCourtX(6, preset.widthFt) - 2} />
          <circle cx="50" cy="50" r="1.2" />
          {drawEnd({ baseline: 0, lengthFt, preset, towardCenter: 1 })}
          {drawEnd({ baseline: lengthFt, lengthFt, preset, towardCenter: -1 })}
        </>
      ) : (
        <>
          {drawEnd({ baseline: 0, lengthFt, preset, towardCenter: 1 })}
          <line x1="2" x2="98" y1="98" y2="98" />
          <path
            d={`M 2 ${toCourtY(lengthFt, lengthFt)} Q 50 ${toCourtY(
              lengthFt - 2,
              lengthFt,
            )} 98 ${toCourtY(lengthFt, lengthFt)}`}
          />
        </>
      )}
    </svg>
  );
}

const pieceClassNames = {
  offense: 'board-piece board-piece-offense',
  defense: 'board-piece board-piece-defense',
  ball: 'board-piece board-piece-ball',
  cone: 'board-piece board-piece-cone',
  chair: 'board-piece board-piece-chair',
  coach: 'board-piece board-piece-coach',
};

const pieceGlyph = {
  cone: '▲',
  chair: '▭',
  coach: 'C',
};

const countByType = (pieces, type) =>
  pieces.filter((piece) => piece.type === type).length;

const buildPieceFromPalette = (template, pieces) => {
  const nextCount = countByType(pieces, template.type) + 1;
  let label = template.label;

  if (template.type === 'offense') {
    label = `${nextCount}`;
  } else if (template.type === 'defense') {
    label = `X${nextCount}`;
  } else if (template.type === 'cone') {
    label = `Cone ${nextCount}`;
  } else if (template.type === 'chair') {
    label = `Chair ${nextCount}`;
  } else if (template.type === 'coach') {
    label = `Coach ${nextCount}`;
  }

  return {
    id: createId(template.type),
    type: template.type,
    label,
    x: template.x,
    y: template.y,
  };
};

export default function CoachingBoard({ boards, onSaveBoard, onDeleteBoard }) {
  const boardRef = useRef(null);
  const playbackIntervalRef = useRef(null);
  const [activeBoard, setActiveBoard] = useState(() => boards[0] ?? createBoardTemplate());
  const [selectedPieceId, setSelectedPieceId] = useState(
    (boards[0] ?? createBoardTemplate()).pieces[0]?.id ?? null,
  );
  const [draggingPieceId, setDraggingPieceId] = useState(null);
  const [selectedActionId, setSelectedActionId] = useState(null);
  const [pendingActionType, setPendingActionType] = useState(null);
  const [pendingActionStart, setPendingActionStart] = useState(null);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!draggingPieceId) {
      return undefined;
    }

    const handlePointerMove = (event) => {
      if (!boardRef.current) {
        return;
      }

      const rect = boardRef.current.getBoundingClientRect();
      const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 3, 97);
      const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 2, 98);

      setActiveBoard((current) => ({
        ...current,
        pieces: current.pieces.map((piece) =>
          piece.id === draggingPieceId ? { ...piece, x, y } : piece,
        ),
      }));
    };

    const handlePointerUp = () => {
      setDraggingPieceId(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingPieceId]);

  useEffect(() => {
    if (!isPlaying) {
      window.clearInterval(playbackIntervalRef.current);
      return undefined;
    }

    if (!activeBoard.frames.length) {
      return undefined;
    }

    playbackIntervalRef.current = window.setInterval(() => {
      setPlaybackIndex((current) =>
        current >= activeBoard.frames.length - 1 ? 0 : current + 1,
      );
    }, 900);

    return () => {
      window.clearInterval(playbackIntervalRef.current);
    };
  }, [activeBoard.frames.length, isPlaying]);

  const visiblePieces = useMemo(() => {
    if (isPlaying && activeBoard.frames.length) {
      return activeBoard.frames[playbackIndex] ?? activeBoard.pieces;
    }
    return activeBoard.pieces;
  }, [activeBoard.frames, activeBoard.pieces, isPlaying, playbackIndex]);

  const selectedPiece =
    activeBoard.pieces.find((piece) => piece.id === selectedPieceId) ?? null;
  const selectedAction =
    activeBoard.actions?.find((action) => action.id === selectedActionId) ?? null;

  const updateAction = (actionId, updates) => {
    setActiveBoard((current) => ({
      ...current,
      actions: (current.actions ?? []).map((action) =>
        action.id === actionId ? { ...action, ...updates } : action,
      ),
    }));
  };

  const addPiece = (template) => {
    const nextPiece = buildPieceFromPalette(template, activeBoard.pieces);
    setActiveBoard((current) => ({
      ...current,
      pieces: [...current.pieces, nextPiece],
    }));
    setSelectedPieceId(nextPiece.id);
    setSelectedActionId(null);
    setIsPlaying(false);
  };

  const duplicateSelectedPiece = () => {
    if (!selectedPiece) {
      return;
    }

    const copy = {
      ...selectedPiece,
      id: createId(selectedPiece.type),
      x: clamp(selectedPiece.x + 4, 3, 97),
      y: clamp(selectedPiece.y + 4, 2, 98),
    };

    setActiveBoard((current) => ({
      ...current,
      pieces: [...current.pieces, copy],
    }));
    setSelectedPieceId(copy.id);
    setSelectedActionId(null);
  };

  const removeSelectedPiece = () => {
    if (!selectedPieceId) {
      return;
    }

    const nextPieces = activeBoard.pieces.filter((piece) => piece.id !== selectedPieceId);
    setActiveBoard((current) => ({
      ...current,
      pieces: nextPieces,
    }));
    setSelectedPieceId(nextPieces[0]?.id ?? null);
  };

  const removeSelectedAction = () => {
    if (!selectedActionId) {
      return;
    }

    const nextActions = (activeBoard.actions ?? []).filter(
      (action) => action.id !== selectedActionId,
    );
    setActiveBoard((current) => ({
      ...current,
      actions: nextActions,
    }));
    setSelectedActionId(nextActions[0]?.id ?? null);
  };

  const handleRecordFrame = () => {
    setActiveBoard((current) => {
      const nextFrames = [...current.frames, clonePieces(current.pieces)];
      setPlaybackIndex(nextFrames.length - 1);
      return {
        ...current,
        frames: nextFrames,
      };
    });
  };

  const handleSaveBoard = () => {
    onSaveBoard({
      ...activeBoard,
      actions: activeBoard.actions ?? [],
      frames: activeBoard.frames.length ? activeBoard.frames : [clonePieces(activeBoard.pieces)],
    });
  };

  const handleSelectBoard = (board) => {
    const clonedBoard = {
      ...board,
      pieces: clonePieces(board.pieces),
      actions: (board.actions ?? []).map((action) => ({ ...action })),
      frames: board.frames.map((frame) => clonePieces(frame)),
    };
    setIsPlaying(false);
    setPlaybackIndex(0);
    setActiveBoard(clonedBoard);
    setSelectedPieceId(clonedBoard.pieces[0]?.id ?? null);
    setSelectedActionId(clonedBoard.actions[0]?.id ?? null);
  };

  const handleCreateBoard = () => {
    const nextBoard = createBoardTemplate('New full-court board');
    setIsPlaying(false);
    setPlaybackIndex(0);
    setActiveBoard(nextBoard);
    setSelectedPieceId(nextBoard.pieces[0]?.id ?? null);
    setSelectedActionId(null);
  };

  const handleClearFrames = () => {
    setActiveBoard((current) => ({ ...current, frames: [] }));
    setPlaybackIndex(0);
    setIsPlaying(false);
  };

  const handleDeleteBoard = (boardId) => {
    if (boardId === activeBoard.id) {
      const remainingBoards = boards.filter((entry) => entry.id !== boardId);
      const nextBoard = remainingBoards[0] ?? createBoardTemplate('New full-court board');
      setActiveBoard(nextBoard);
      setSelectedPieceId(nextBoard.pieces[0]?.id ?? null);
      setSelectedActionId(nextBoard.actions[0]?.id ?? null);
      setPlaybackIndex(0);
      setIsPlaying(false);
    }

    onDeleteBoard(boardId);
  };

  const handleBoardClick = (event) => {
    if (!pendingActionType || !boardRef.current) {
      return;
    }

    const rect = boardRef.current.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 3, 97);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 2, 98);

    if (!pendingActionStart) {
      setPendingActionStart({ x, y });
      setSelectedPieceId(null);
      return;
    }

    const nextAction = {
      id: createId('action'),
      type: pendingActionType,
      startX: pendingActionStart.x,
      startY: pendingActionStart.y,
      endX: x,
      endY: y,
    };

    setActiveBoard((current) => ({
      ...current,
      actions: [...(current.actions ?? []), nextAction],
    }));
    setSelectedActionId(nextAction.id);
    setPendingActionStart(null);
    setPendingActionType(null);
  };

  const renderActionPath = (action) => {
    const selectedClass =
      action.id === selectedActionId ? 'board-action-selected' : '';
    const baseProps = {
      className: `board-action board-action-${action.type} ${selectedClass}`.trim(),
      onClick: (event) => {
        event.stopPropagation();
        setSelectedActionId(action.id);
        setSelectedPieceId(null);
      },
    };

    if (action.type === 'screen') {
      return (
        <g key={action.id} {...baseProps}>
          <line
            x1={`${action.startX}%`}
            y1={`${action.startY}%`}
            x2={`${action.endX}%`}
            y2={`${action.endY}%`}
          />
          <line
            x1={`${action.startX - 1.6}%`}
            y1={`${action.startY - 1.6}%`}
            x2={`${action.startX + 1.6}%`}
            y2={`${action.startY + 1.6}%`}
          />
          <line
            x1={`${action.endX - 1.6}%`}
            y1={`${action.endY - 1.6}%`}
            x2={`${action.endX + 1.6}%`}
            y2={`${action.endY + 1.6}%`}
          />
        </g>
      );
    }

    if (action.type === 'dribble') {
      const midX = (action.startX + action.endX) / 2;
      const path = `M ${action.startX} ${action.startY} Q ${midX - 4} ${
        (action.startY + action.endY) / 2
      } ${midX} ${((action.startY + action.endY) / 2) - 5} T ${action.endX} ${action.endY}`;
      return <path key={action.id} d={path} {...baseProps} />;
    }

    if (action.type === 'handoff') {
      const controlX = (action.startX + action.endX) / 2 + 4;
      const controlY = (action.startY + action.endY) / 2;
      const path = `M ${action.startX} ${action.startY} Q ${controlX} ${controlY} ${action.endX} ${action.endY}`;
      return <path key={action.id} d={path} {...baseProps} />;
    }

    if (action.type === 'shot') {
      const controlX = (action.startX + action.endX) / 2;
      const controlY = Math.min(action.startY, action.endY) - 10;
      const path = `M ${action.startX} ${action.startY} Q ${controlX} ${controlY} ${action.endX} ${action.endY}`;
      return <path key={action.id} d={path} {...baseProps} />;
    }

    return (
      <line
        key={action.id}
        x1={`${action.startX}%`}
        y1={`${action.startY}%`}
        x2={`${action.endX}%`}
        y2={`${action.endY}%`}
        {...baseProps}
      />
    );
  };

  return (
    <section className="board-layout">
      <div className="stack">
        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Coaching board</p>
              <h2>
                {activeBoard.courtView === 'half'
                  ? 'Half-court play designer'
                  : 'Full-court play designer'}
              </h2>
            </div>
          </div>

          <div className="field-grid">
            <input
              className="input-field full-span"
              onChange={(event) =>
                setActiveBoard((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Board name"
              value={activeBoard.name}
            />
            <select
              className="select-field full-span"
              onChange={(event) =>
                setActiveBoard((current) => ({
                  ...current,
                  courtType: event.target.value,
                }))
              }
              value={activeBoard.courtType ?? 'ncaa'}
            >
              {Object.entries(courtPresets).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.label}
                </option>
              ))}
            </select>
            <select
              className="select-field full-span"
              onChange={(event) =>
                setActiveBoard((current) => ({
                  ...current,
                  courtView: event.target.value,
                }))
              }
              value={activeBoard.courtView ?? 'full'}
            >
              <option value="full">Full Court</option>
              <option value="half">Half Court</option>
            </select>
            <textarea
              className="textarea-field full-span"
              onChange={(event) =>
                setActiveBoard((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Teaching notes, options, counters, or timing cues"
              value={activeBoard.notes}
            />
          </div>

          <div className="stack-actions">
            <button className="primary-button" onClick={handleSaveBoard} type="button">
              Save board
            </button>
            <button className="secondary-button" onClick={handleCreateBoard} type="button">
              New board
            </button>
            <button className="secondary-button" onClick={handleRecordFrame} type="button">
              Record frame
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                if (!activeBoard.frames.length) {
                  setIsPlaying(false);
                  return;
                }
                setIsPlaying((current) => !current);
                setPlaybackIndex(0);
              }}
              type="button"
            >
              {isPlaying ? 'Pause playback' : 'Play back'}
            </button>
            <button className="secondary-button" onClick={handleClearFrames} type="button">
              Clear frames
            </button>
          </div>

          <div className="badge-row">
            <span className="badge">Frames: {activeBoard.frames.length}</span>
            <span className="badge">Pieces: {activeBoard.pieces.length}</span>
            <span className="badge">Actions: {(activeBoard.actions ?? []).length}</span>
            <span className="badge">
              Mode: {isPlaying ? `Playback ${playbackIndex + 1}` : 'Edit'}
            </span>
            {pendingActionType ? (
              <span className="warning-badge">
                Adding {pendingActionType}
                {pendingActionStart ? ' • pick end point' : ' • pick start point'}
              </span>
            ) : null}
          </div>
        </section>

        <section className="section-card">
          <div className="coach-board-shell coach-board-full">
            <div
              className={`coach-board ${
                activeBoard.courtView === 'half' ? 'half-court-board' : 'full-court-board'
              }`}
              onClick={handleBoardClick}
              ref={boardRef}
            >
              <CourtLines
                courtType={activeBoard.courtType ?? 'ncaa'}
                courtView={activeBoard.courtView ?? 'full'}
              />

              <svg className="board-actions-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <marker
                    id="action-arrow"
                    markerHeight="6"
                    markerWidth="6"
                    orient="auto-start-reverse"
                    refX="5"
                    refY="3"
                  >
                    <path d="M0,0 L6,3 L0,6 z" fill="#fff4df" />
                  </marker>
                </defs>
                {(activeBoard.actions ?? []).map(renderActionPath)}
              </svg>

              {visiblePieces.map((piece) => (
                <button
                  className={`${pieceClassNames[piece.type]} ${
                    piece.id === selectedPieceId ? 'board-piece-selected' : ''
                  }`}
                  key={piece.id}
                  onClick={() => {
                    setSelectedPieceId(piece.id);
                    setSelectedActionId(null);
                  }}
                  onPointerDown={() => {
                    if (!isPlaying) {
                      setSelectedPieceId(piece.id);
                      setSelectedActionId(null);
                      setDraggingPieceId(piece.id);
                    }
                  }}
                  style={{
                    left: `${piece.x}%`,
                    top: `${piece.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  type="button"
                >
                  {pieceGlyph[piece.type] ?? piece.label}
                </button>
              ))}
            </div>
          </div>
          <p className="helper-text">
            Drag any icon on the full court, drop a frame at each stage of the action,
            then play the sequence back like a teaching animation.
          </p>
        </section>
      </div>

      <div className="stack">
        <section className="list-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Icon tray</p>
              <h3>Add players and equipment</h3>
            </div>
          </div>
          <div className="board-tool-grid">
            {palette.map((item) => (
              <button
                className="board-tool"
                key={item.type}
                onClick={() => addPiece(item)}
                type="button"
              >
                <span className={pieceClassNames[item.type]}>
                  {pieceGlyph[item.type] ?? item.label}
                </span>
                <strong>{item.name}</strong>
              </button>
            ))}
          </div>
          <div className="stack-actions">
            <button
              className="secondary-button"
              onClick={duplicateSelectedPiece}
              type="button"
            >
              Duplicate selected
            </button>
            <button
              className="secondary-button"
              onClick={removeSelectedPiece}
              type="button"
            >
              Remove selected
            </button>
          </div>
        </section>

        <section className="list-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Action tools</p>
              <h3>Draw play actions</h3>
            </div>
          </div>
          <div className="board-tool-grid">
            {actionPalette.map((item) => (
              <button
                className={`board-tool ${
                  pendingActionType === item.type ? 'board-tool-active' : ''
                }`}
                key={item.type}
                onClick={() => {
                  setPendingActionType(item.type);
                  setPendingActionStart(null);
                  setSelectedActionId(null);
                }}
                type="button"
              >
                <span className={`action-chip action-chip-${item.type}`}>{item.name}</span>
                <strong>{item.name}</strong>
              </button>
            ))}
          </div>
          <div className="stack-actions">
            <button
              className="secondary-button"
              onClick={() => {
                setPendingActionType(null);
                setPendingActionStart(null);
              }}
              type="button"
            >
              Cancel action
            </button>
            <button
              className="secondary-button"
              onClick={removeSelectedAction}
              type="button"
            >
              Remove selected action
            </button>
          </div>
        </section>

        <section className="list-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Action editor</p>
              <h3>Tune the selected action</h3>
            </div>
          </div>
          {selectedAction ? (
            <div className="stack">
              <select
                className="select-field"
                onChange={(event) =>
                  updateAction(selectedAction.id, { type: event.target.value })
                }
                value={selectedAction.type}
              >
                {actionPalette.map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.name}
                  </option>
                ))}
              </select>
              <div className="field-grid">
                <input
                  className="input-field"
                  onChange={(event) =>
                    updateAction(selectedAction.id, {
                      startX: clamp(Number(event.target.value), 3, 97),
                    })
                  }
                  type="number"
                  value={Math.round(selectedAction.startX)}
                />
                <input
                  className="input-field"
                  onChange={(event) =>
                    updateAction(selectedAction.id, {
                      startY: clamp(Number(event.target.value), 2, 98),
                    })
                  }
                  type="number"
                  value={Math.round(selectedAction.startY)}
                />
                <input
                  className="input-field"
                  onChange={(event) =>
                    updateAction(selectedAction.id, {
                      endX: clamp(Number(event.target.value), 3, 97),
                    })
                  }
                  type="number"
                  value={Math.round(selectedAction.endX)}
                />
                <input
                  className="input-field"
                  onChange={(event) =>
                    updateAction(selectedAction.id, {
                      endY: clamp(Number(event.target.value), 2, 98),
                    })
                  }
                  type="number"
                  value={Math.round(selectedAction.endY)}
                />
              </div>
            </div>
          ) : (
            <p className="empty-state">
              Select an action line on the board to edit or remove it.
            </p>
          )}
        </section>

        <section className="list-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Saved boards</p>
              <h3>Play library</h3>
            </div>
          </div>
          <div className="list">
            {boards.map((board) => (
              <article className="item-card" key={board.id}>
                <div className="item-header">
                  <div>
                    <h4>{board.name}</h4>
                    <p className="entry-meta">
                      {board.frames.length} recorded frames • {board.pieces.length} icons
                    </p>
                  </div>
                  <div className="stack-actions">
                    <button
                      className="ghost-button"
                      onClick={() => handleSelectBoard(board)}
                      type="button"
                    >
                      Open
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => handleDeleteBoard(board.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="item-notes">{board.notes || 'No coaching notes yet.'}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
