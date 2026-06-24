import { Recommendations } from 'lol-draft-companion-frontend';

const ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

const richResult = {
  analysis: {
    damageSplit: { ad: 3, ap: 1 },
    needs: {
      peel: { weight: 0.7, note: 'Peel / engage' },
      tank: { weight: 0.5, note: 'Frontline needed' },
    },
    threats: ['Assassin', 'Dive'],
  },
  recommendations: [
    {
      name: 'Jinx',
      source: 'main',
      archetype: null,
      reason: 'Strong AD carry that shores up your damage split. Late-game teamfight presence counters their dive comp.',
    },
    {
      name: 'Caitlyn',
      source: 'pocket',
      archetype: 'Poke',
      reason: 'Long-range poke fills the gap in your teamfight setup and pressures their engage before it starts.',
    },
  ],
};

const balancedResult = {
  analysis: {
    damageSplit: { ad: 2, ap: 2 },
    needs: {},
    threats: [],
  },
  recommendations: [
    {
      name: 'Ahri',
      source: 'main',
      archetype: null,
      reason: 'Balanced AP mid that fits the comp perfectly. Good roam potential to enable your side lanes.',
    },
  ],
};

const emptyResult = {
  analysis: { damageSplit: { ad: 0, ap: 0 }, needs: {}, threats: [] },
  recommendations: [],
};

export const WithRecommendations = () => (
  <div style={{ padding: '16px', background: '#0a0e17', maxWidth: 400 }}>
    <Recommendations
      result={richResult}
      myRole="ADC"
      onRoleChange={() => {}}
      roles={ROLES}
      profileEmpty={false}
      onPick={null}
      myPickSet={false}
    />
  </div>
);

export const Actionable = () => (
  <div style={{ padding: '16px', background: '#0a0e17', maxWidth: 400 }}>
    <Recommendations
      result={richResult}
      myRole="ADC"
      onRoleChange={() => {}}
      roles={ROLES}
      profileEmpty={false}
      onPick={() => {}}
      myPickSet={true}
    />
  </div>
);

export const BalancedComp = () => (
  <div style={{ padding: '16px', background: '#0a0e17', maxWidth: 400 }}>
    <Recommendations
      result={balancedResult}
      myRole="MID"
      onRoleChange={() => {}}
      roles={ROLES}
      profileEmpty={false}
    />
  </div>
);

export const EmptyProfile = () => (
  <div style={{ padding: '16px', background: '#0a0e17', maxWidth: 400 }}>
    <Recommendations
      result={emptyResult}
      myRole="MID"
      onRoleChange={() => {}}
      roles={ROLES}
      profileEmpty={true}
    />
  </div>
);
