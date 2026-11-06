// Quest journal text. The main quest's current stage is also shown on the HUD.

export const QUESTS = {
  main: {
    name: 'The Long Way Home',
    stages: [
      'Someone is coughing in the courtyard to the north. Find them.',
      'Get strong enough for Grease, then break through the culvert in the east.',
      'Go through the culvert to the Abandoned District.',
      'Ask around the District. There must be a way across the canal.',
      'Find the Catcher\'s yard, south of the avenue. Take his manhole hook.',
      'Use the hook on the manhole in front of the meat plant.',
      'Find a way to drain the flooded culvert in the south passage.',
      'Open both sluice valves, west and east.',
      'The culvert has drained. Go south, into the Cistern.',
      'Get past Mother Gnaw. The ladder is behind her.',
      'Climb the ladder. Find the house with the yellow window.',
      'Come in out of the rain. Eat. Sleep.',
    ],
  },
  patch: {
    name: 'Patch\'s Kittens',
    stages: [
      'Bring Patch a Fish Head for her kittens.',
      'The kittens have eaten.',
    ],
  },
  cages: {
    name: 'The Cages',
    stages: [
      'Free the cats caged in the Catcher\'s yard. Find a key.',
      'Open all four cages. The Catcher had a key on him.',
      'The cages stand empty.',
    ],
  },
  pale: {
    name: 'A Rat\'s Request',
    stages: [
      'Pale asks you to bring back the Valve Wheel he lost, or at least to end this.',
      'Mother Gnaw is dead. Pale would want to know.',
      'Pale can rest now.',
    ],
  },
};

export function questText(id, stage) {
  const q = QUESTS[id];
  if (!q) return '';
  return q.stages[Math.min(stage, q.stages.length - 1)];
}
