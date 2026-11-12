// Clear / Submit buttons under the bracket, plus what's still missing.
export function BracketActions({ my, projection, locked }) {
  const showHints = !projection && !locked;
  return (
    <div className="pad bracket-pad">
      <div className="row-gap">
        <button type="button" onClick={my.clear} disabled={locked || !my.pickedCount}>Clear</button>
        <button className="primary" disabled={!my.canSubmit} onClick={my.submit}>
          {my.saving ? 'Saving…' : my.existing ? 'Update bracket' : 'Submit bracket'}
        </button>
      </div>
      {showHints && !my.complete && <p className="muted small center">Pick every game to submit.</p>}
      {showHints && my.complete && my.tiebreaker === '' && <p className="muted small center">Add a tiebreaker to submit.</p>}
      {!projection && my.complete && !my.userName.trim() && <p className="muted small center">Enter your name to submit.</p>}
      {locked && <p className="muted small center">Brackets are locked.</p>}
      {my.savedAt && <p className="muted small center">Saved.</p>}
    </div>
  );
}
