'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createBoardTemplate, createId } from '@/lib/dashboardData';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const clonePieces = (pieces) => pieces.map((piece) => ({ ...piece }));

const palette = [
  { type: 'offense', label: 'O', name: 'Offense player', x: 28, y: 84 },
  { type: 'defense', label: 'X', name: 'Defense player', x: 72, y: 16 },
  { type: 'ball', label: 'Ball', name: 'Ball', x: 52, y: 72 },
  { type: 'cone', label: 'Cone', name: 'Cone', x: 20, y: 50 },
  { type: 'chair', label: 'Chair', name: 'Chair', x: 12, y: 50 },
  { type: 'coach', label: 'Coach', name: 'Coach', x: 90, y: 50 },
  { type: 'screen', label: 'Screen', name: 'Screen pad', x: 38, y: 50 },
];

const pieceClassNames = {
  offense: 'board-piece board-piece-offense',
  defense: 'board-piece board-piece-defense',
  ball: 'board-piece board-piece-ball',
  cone: 'board-piece board-piece-cone',
  chair: 'board-piece board-piece-chair',
  coach: 'board-piece board-piece-coach',
  screen: 'board-piece board-piece-screen',
};

const pieceGlyph = {
  cone: '▲',
  chair: '▭',
  coach: 'C',
  screen: '||',
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
  } else if (template.type === 'screen') {
    label = `Pad ${nextCount}`;
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

  const updatePiece = (pieceId, updates) => {
    setActiveBoard((current) => ({
      ...current,
      pieces: current.pieces.map((piece) =>
        piece.id === pieceId ? { ...piece, ...updates } : piece,
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
      frames: activeBoard.frames.length ? activeBoard.frames : [clonePieces(activeBoard.pieces)],
    });
  };

  const handleSelectBoard = (board) => {
    const clonedBoard = {
      ...board,
      pieces: clonePieces(board.pieces),
      frames: board.frames.map((frame) => clonePieces(frame)),
    };
    setIsPlaying(false);
    setPlaybackIndex(0);
    setActiveBoard(clonedBoard);
    setSelectedPieceId(clonedBoard.pieces[0]?.id ?? null);
  };

  const handleCreateBoard = () => {
    const nextBoard = createBoardTemplate('New full-court board');
    setIsPlaying(false);
    setPlaybackIndex(0);
    setActiveBoard(nextBoard);
    setSelectedPieceId(nextBoard.pieces[0]?.id ?? null);
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
      setPlaybackIndex(0);
      setIsPlaying(false);
    }

    onDeleteBoard(boardId);
  };

  return (
    <section className="board-layout">
      <div className="stack">
        <section className="section-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Coaching board</p>
              <h2>Full-court play designer</h2>
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
            <span className="badge">
              Mode: {isPlaying ? `Playback ${playbackIndex + 1}` : 'Edit'}
            </span>
          </div>
        </section>

        <section className="section-card">
          <div className="coach-board-shell coach-board-full">
            <div className="coach-board full-court-board" ref={boardRef}>
              <div className="midcourt-circle" />
              <div className="midcourt-line" />

              <div className="court-half top-half">
                <div className="paint" />
                <div className="rim top-rim" />
                <div className="backboard top-backboard" />
                <div className="free-throw-circle top-free-throw-circle" />
                <div className="restricted-area top-restricted-area" />
                <div className="three-point-arc top-three-point-arc" />
                <div className="corner-line left top-corner-line" />
                <div className="corner-line right top-corner-line" />
              </div>

              <div className="court-half bottom-half">
                <div className="paint" />
                <div className="rim bottom-rim" />
                <div className="backboard bottom-backboard" />
                <div className="free-throw-circle bottom-free-throw-circle" />
                <div className="restricted-area bottom-restricted-area" />
                <div className="three-point-arc bottom-three-point-arc" />
                <div className="corner-line left bottom-corner-line" />
                <div className="corner-line right bottom-corner-line" />
              </div>

              {visiblePieces.map((piece) => (
                <button
                  className={`${pieceClassNames[piece.type]} ${
                    piece.id === selectedPieceId ? 'board-piece-selected' : ''
                  }`}
                  key={piece.id}
                  onClick={() => setSelectedPieceId(piece.id)}
                  onPointerDown={() => {
                    if (!isPlaying) {
                      setSelectedPieceId(piece.id);
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
              <p className="section-kicker">Piece editor</p>
              <h3>Tune the selected icon</h3>
            </div>
          </div>
          {selectedPiece ? (
            <div className="stack">
              <input
                className="input-field"
                onChange={(event) =>
                  updatePiece(selectedPiece.id, { label: event.target.value })
                }
                value={selectedPiece.label}
              />
              <select
                className="select-field"
                onChange={(event) =>
                  updatePiece(selectedPiece.id, { type: event.target.value })
                }
                value={selectedPiece.type}
              >
                {palette.map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.name}
                  </option>
                ))}
              </select>
              <div className="field-grid">
                <input
                  className="input-field"
                  max="97"
                  min="3"
                  onChange={(event) =>
                    updatePiece(selectedPiece.id, {
                      x: clamp(Number(event.target.value), 3, 97),
                    })
                  }
                  type="number"
                  value={Math.round(selectedPiece.x)}
                />
                <input
                  className="input-field"
                  max="98"
                  min="2"
                  onChange={(event) =>
                    updatePiece(selectedPiece.id, {
                      y: clamp(Number(event.target.value), 2, 98),
                    })
                  }
                  type="number"
                  value={Math.round(selectedPiece.y)}
                />
              </div>
            </div>
          ) : (
            <p className="empty-state">Select an icon on the board to edit or remove it.</p>
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
