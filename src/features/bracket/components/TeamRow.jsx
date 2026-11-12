import { textForBackground } from '@/shared/utils/colors.js';
import { TeamLogo } from '@/shared/components/TeamLogo.jsx';

// One team line inside a bracket game. Shows a placeholder ("Winner 8/9") until known.
// status (correct/wrong/dead) adds ✓ or ✕ once results are in.
export function TeamRow({ team, placeholder, seed, selected, status, disabled, onClick }) {
  if (!team) {
    return <div className="bk-team empty"><span className="bk-seed">{seed ?? ''}</span><span className="bk-name">{placeholder}</span></div>;
  }
  const style = { '--team': team.color, '--ink': textForBackground(team.color) };
  const mark = selected && status === 'correct' ? '✓' : selected && (status === 'wrong' || status === 'dead') ? '✕' : null;
  return (
    <button
      type="button"
      className={'bk-team' + (selected ? ' sel' : '') + (selected && status ? ` ${status}` : '')}
      style={style}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="bk-seed">{team.seed}</span>
      <TeamLogo team={team} />
      <span className="bk-name">{team.name}</span>
      {mark ? <span className="bk-mark">{mark}</span> : team.record && <span className="bk-record">{team.record}</span>}
    </button>
  );
}
