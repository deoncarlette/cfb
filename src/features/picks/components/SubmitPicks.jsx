export function SubmitPicks({ canSubmit, saving, isUpdate, missingName, locked, saved, onSubmit }) {
  return (
    <>
      <button className="primary big" disabled={!canSubmit} onClick={onSubmit}>
        {saving ? 'Saving…' : isUpdate ? 'Update picks' : 'Submit picks'}
      </button>
      {missingName && <p className="muted small center">Enter your name to submit.</p>}
      {locked && <p className="muted small center">Picks are locked for this week.</p>}
      {saved && <p className="muted small center">Saved.</p>}
    </>
  );
}
