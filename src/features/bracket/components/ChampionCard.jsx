import { TeamLogo } from '@/shared/components/TeamLogo.jsx';

export function ChampionCard({ team }) {
  return (
    <div className="bk-champ">
      <span className="bk-champ-label">Champion</span>
      {team ? (
        <span className="bk-champ-team">
          <TeamLogo team={team} size="big" />
          {team.name}
        </span>
      ) : <span className="muted small">Pick a title winner</span>}
    </div>
  );
}
