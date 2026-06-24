import { ChampionSelectModal } from 'lol-draft-companion-frontend';

export const OpenEmpty = () => (
  <ChampionSelectModal
    team="blue"
    slot={0}
    taken={new Set()}
    onPick={() => {}}
    onClear={() => {}}
    onClose={() => {}}
  />
);
