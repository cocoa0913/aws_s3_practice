import { useCallback, useState } from 'react';
import BrickBreaker from './BrickBreaker.jsx';
import { clearRanking, loadRanking, saveScore } from './storage.js';

const SCREENS = {
  HOME: 'home',
  PLAY: 'play',
  GAMEOVER: 'gameover',
  RANKING: 'ranking',
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [finalScore, setFinalScore] = useState(0);
  const [name, setName] = useState('');
  const [gameKey, setGameKey] = useState(0);
  const [ranking, setRanking] = useState(() => loadRanking());
  const [myEntryId, setMyEntryId] = useState(null);

  const handleGameOver = useCallback((score) => {
    setFinalScore(score);
    setScreen(SCREENS.GAMEOVER);
  }, []);

  const startGame = () => {
    setMyEntryId(null);
    setGameKey((k) => k + 1);
    setScreen(SCREENS.PLAY);
  };

  const submitScore = () => {
    const { entry, ranking: newRanking } = saveScore(name, finalScore);
    setRanking(newRanking);
    setMyEntryId(entry.id);
    setScreen(SCREENS.RANKING);
  };

  const handleClearRanking = () => {
    if (!window.confirm('랭킹을 모두 삭제할까요?')) return;
    clearRanking();
    setRanking([]);
    setMyEntryId(null);
  };

  return (
    <div className="app">
      <h1 className="title">스와이프 벽돌깨기</h1>
      {screen === SCREENS.HOME && (
        <Home onStart={startGame} onShowRanking={() => setScreen(SCREENS.RANKING)} />
      )}
      {screen === SCREENS.PLAY && (
        <Play key={gameKey} onGameOver={handleGameOver} onQuit={() => setScreen(SCREENS.HOME)} />
      )}
      {screen === SCREENS.GAMEOVER && (
        <GameOver
          score={finalScore}
          name={name}
          setName={setName}
          onSubmit={submitScore}
          onSkip={() => setScreen(SCREENS.RANKING)}
          onRetry={startGame}
        />
      )}
      {screen === SCREENS.RANKING && (
        <Ranking
          ranking={ranking}
          myEntryId={myEntryId}
          onBack={() => setScreen(SCREENS.HOME)}
          onRetry={startGame}
          onClear={handleClearRanking}
        />
      )}
    </div>
  );
}

function Home({ onStart, onShowRanking }) {
  return (
    <>
      <p className="subtitle">아래 발사대에서 스와이프 → 공이 그 방향으로 발사됩니다</p>
      <div className="card">
        <div style={{ lineHeight: 1.6, fontSize: 14, color: '#cdd3ee' }}>
          <p style={{ margin: '0 0 8px' }}>
            <strong>룰</strong>
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#aab1d4' }}>
            <li>한 번 방향을 정하면 보유한 공이 모두 그 방향으로 발사됩니다.</li>
            <li>공이 모두 회수되면 새 줄의 벽돌이 위에서 내려옵니다.</li>
            <li>라운드가 진행될수록 새로 등장하는 벽돌의 체력이 늘어납니다.</li>
            <li>파란 + 픽업에 닿으면 공이 1개 추가됩니다.</li>
            <li>벽돌이 빨간 라인 아래로 내려가면 게임 오버.</li>
          </ul>
        </div>
        <button className="btn primary" onClick={onStart}>게임 시작</button>
        <button className="btn ghost" onClick={onShowRanking}>랭킹 보기</button>
      </div>
    </>
  );
}

function Play({ onGameOver, onQuit }) {
  const [hud, setHud] = useState({ round: 1, score: 0, ballCount: 1 });
  return (
    <>
      <div className="hud">
        <span>라운드 <strong>{hud.round}</strong></span>
        <span>점수 <strong>{hud.score}</strong></span>
        <span>공 <strong>x{hud.ballCount}</strong></span>
      </div>
      <BrickBreaker onHud={setHud} onGameOver={onGameOver} />
      <button className="btn ghost" style={{ width: 'min(380px, 100%)' }} onClick={onQuit}>
        그만두기
      </button>
      <p className="help">발사대에서 위쪽으로 드래그 → 손을 떼면 발사</p>
    </>
  );
}

function GameOver({ score, name, setName, onSubmit, onSkip, onRetry }) {
  return (
    <div className="card">
      <p className="subtitle" style={{ marginBottom: 0 }}>GAME OVER</p>
      <div className="score-big">{score}</div>
      <p className="subtitle">최종 점수</p>

      <label className="label" htmlFor="name-input">이름 (최대 12자)</label>
      <input
        id="name-input"
        className="input"
        type="text"
        maxLength={12}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="이름을 입력하세요"
        autoFocus
      />
      <button className="btn primary" onClick={onSubmit}>점수 등록 후 랭킹 보기</button>
      <button className="btn ghost" onClick={onSkip}>건너뛰고 랭킹 보기</button>
      <button className="btn ghost" onClick={onRetry}>다시 시작</button>
    </div>
  );
}

function Ranking({ ranking, myEntryId, onBack, onRetry, onClear }) {
  return (
    <div className="card" style={{ width: 'min(420px, 100%)' }}>
      <p className="subtitle" style={{ marginBottom: 12 }}>🏆 랭킹 TOP 10</p>
      {ranking.length === 0 ? (
        <p className="empty">아직 기록이 없습니다. 첫 기록의 주인공이 되어보세요!</p>
      ) : (
        <ol className="ranking-list">
          {ranking.map((r, i) => (
            <li key={r.id || `${r.name}-${i}`} className={r.id === myEntryId ? 'me' : ''}>
              <span className={`rank ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''}`}>
                {i + 1}
              </span>
              <span className="name">{r.name}</span>
              <span className="score">{r.score}</span>
            </li>
          ))}
        </ol>
      )}
      <button className="btn primary" onClick={onRetry}>다시 도전</button>
      <button className="btn ghost" onClick={onBack}>홈으로</button>
      {ranking.length > 0 && (
        <button className="btn ghost" onClick={onClear}>랭킹 초기화</button>
      )}
    </div>
  );
}
