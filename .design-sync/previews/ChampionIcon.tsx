import { ChampionIcon } from 'lol-draft-companion-frontend';

export const EmptySlot = () => (
  <div style={{ padding: '24px', background: '#0a0e17', display: 'flex', gap: '12px', alignItems: 'center' }}>
    <ChampionIcon name={undefined} size={56} />
    <span style={{ color: '#8693ad', fontSize: 13 }}>Empty pick slot</span>
  </div>
);

export const Champions = () => (
  <div style={{ padding: '24px', background: '#0a0e17', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
    <ChampionIcon name="Jinx" size={56} />
    <ChampionIcon name="Ahri" size={56} />
    <ChampionIcon name="Thresh" size={56} />
    <ChampionIcon name="Darius" size={56} />
    <ChampionIcon name="Lux" size={56} />
    <ChampionIcon name="Zed" size={56} />
    <ChampionIcon name="Vi" size={56} />
    <ChampionIcon name="Orianna" size={56} />
  </div>
);

export const Sizes = () => (
  <div style={{ padding: '24px', background: '#0a0e17', display: 'flex', gap: '14px', alignItems: 'center' }}>
    <ChampionIcon name="Jinx" size={32} />
    <ChampionIcon name="Jinx" size={48} />
    <ChampionIcon name="Jinx" size={56} />
    <ChampionIcon name="Jinx" size={72} />
    <ChampionIcon name="Jinx" size={96} />
  </div>
);
