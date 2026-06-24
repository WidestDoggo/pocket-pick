import React, { useEffect, useRef } from 'react';
import { ProfilePanel } from 'lol-draft-companion-frontend';

const profileWithData = {
  mains: {
    TOP: ['Garen', 'Darius'],
    JUNGLE: ['Vi', 'Hecarim'],
    MID: ['Ahri', 'Syndra'],
    ADC: ['Jinx', 'Caitlyn'],
    SUPPORT: ['Thresh', 'Lulu'],
  },
  pocketPicks: [
    { name: 'Zed', archetype: 'Assassin' },
    { name: 'Sivir', archetype: 'Teamfight' },
    { name: 'Jhin', archetype: 'Poke' },
  ],
};

const emptyProfile = {
  mains: { TOP: [], JUNGLE: [], MID: [], ADC: [], SUPPORT: [] },
  pocketPicks: [],
};

function AutoOpen({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    const btn = ref.current?.querySelector('.profile-toggle');
    if (btn) btn.click();
  }, []);
  return <div ref={ref}>{children}</div>;
}

export const WithProfile = () => (
  <div style={{ padding: '16px', background: '#0a0e17', maxWidth: 860 }}>
    <AutoOpen>
      <ProfilePanel profile={profileWithData} setProfile={() => {}} />
    </AutoOpen>
  </div>
);

export const EmptyProfile = () => (
  <div style={{ padding: '16px', background: '#0a0e17', maxWidth: 860 }}>
    <AutoOpen>
      <ProfilePanel profile={emptyProfile} setProfile={() => {}} />
    </AutoOpen>
  </div>
);
