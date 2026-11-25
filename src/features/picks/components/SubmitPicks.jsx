// Under the cards: Clear / Save draft, then Submit. A draft stays on this device only (so a
// refresh to check scores keeps your picks); Submit is what puts you in the pool.
export function SubmitPicks({ canSubmit, saving, isUpdate, missingName, locked, saved, onSubmit, draftAt, canSaveDraft, onSaveDraft, onClear }) {
  return (
    <>
      <div className="row-gap picks-draft-row">
        <button type="button" onClick={onClear} disabled={!canSaveDraft && !draftAt}>Clear</button>
        <button type="button" onClick={onSaveDraft} disabled={!canSaveDraft}>Save draft</button>
      </div>
      <button className="primary big" disabled={!canSubmit} onClick={onSubmit}>
        {saving ? 'Saving…' : isUpdate ? 'Update picks' : 'Submit picks'}
      </button>
      {draftAt && <p className="muted small center">Draft saved on this device at {new Date(draftAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Submit to enter your picks.</p>}
      {missingName && <p className="muted small center">Enter your name to submit.</p>}
      {locked && <p className="muted small center">Picks are locked for this week.</p>}
      {saved && <p className="muted small center">Saved.</p>}
    </>
  );
}
