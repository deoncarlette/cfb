import { pickStatus } from '../bracketLogic.js';
import { BracketView } from './BracketView.jsx';

// Read-only view of someone else's bracket (opened from Standings after lock).
export function PlayerBracket({ entry, seeds, results, anyResults, eliminated, onClose }) {
  const picks = entry.picks || {};
  return (
    <>
      <div className="pad bracket-pad">
        <div className="section-heading">
          <span className="section-label">{entry.user_name}'s bracket</span>
          <button className="link" onClick={onClose}>Close</button>
        </div>
      </div>
      <div className="bracket-wrap">
        <BracketView
          seeds={seeds}
          winners={picks}
          statusFor={anyResults ? key => pickStatus(key, picks, results, eliminated) : null}
          locked
        />
      </div>
    </>
  );
}
