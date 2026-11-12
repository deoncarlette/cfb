export function TopBar({ theme }) {
  return (
    <div className="topbar">
      <div className="brand-mark">
        <span className="brand-badge">B</span>
        <span className="brand">Backfield Brainiacs</span>
      </div>
      <button className="link" onClick={theme.cycle}>{theme.label}</button>
    </div>
  );
}
