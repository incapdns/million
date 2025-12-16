import React from 'react';

export const RenderPortals = ({ portals, count, firstRtPortals }: { portals: any[]; count: number; firstRtPortals: any[] }) => {
  const content = portals.length > 0 ?
    portals : 
    count == 1 ? 
      firstRtPortals :
      portals;

  return <>{content}</>; 
};