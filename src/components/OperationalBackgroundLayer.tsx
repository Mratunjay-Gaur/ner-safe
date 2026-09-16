import React from 'react';
import { HERO_HOME_BG_URL } from './HomeIntroScreen';

interface OperationalBackgroundLayerProps {
  isVisible: boolean;
}

export const OperationalBackgroundLayer: React.FC<
  OperationalBackgroundLayerProps
> = ({ isVisible }) => {
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-opacity duration-500 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Mountain image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700"
        style={{
          backgroundImage: `url('${HERO_HOME_BG_URL}')`,
          opacity: 0.72,
          filter: 'saturate(0.95) contrast(1.05) brightness(0.82)',
        }}
      />

      {/* Subtle deep navy & slate dark overlay: prevents white blowout while preserving mountain landscape visibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B1320]/45 via-[#0F172A]/40 to-[#0B1320]/50" />
      <div className="absolute inset-0 bg-[#0B1320]/25" />
    </div>
  );
};