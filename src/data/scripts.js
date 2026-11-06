// All story events, written as async functions. `c` is the ScriptContext from
// scenes/WorldScene: await c.say(...), await c.choose(...), await c.battle(...).

const TOM = ['OLD TOM', 'tom'];
const PATCH = ['PATCH', 'patch'];
const RAG = ['RAG', 'crow'];
const PALE = ['PALE', 'pale'];
const LADY = ['THE OLD WOMAN', 'lady'];

const say = (c, who, ...lines) => lines.reduce(
  (p, line) => p.then(() => c.say(who[0], who[1], line)),
  Promise.resolve(),
);
const narrate = (c, ...lines) => lines.reduce(
  (p, line) => p.then(() => c.say(null, null, line)),
  Promise.resolve(),
);

export const SCRIPTS = {
  // ------------------------------------------------------------ New game
  async intro(c) {
    c.setBlack(true);
    await c.wait(600);
    await c.titleCard('It has rained for nine days.');
    await c.titleCard('The city has not noticed. It never does.');
    await c.titleCard('Down in the gutter, something small opens its eyes.');
    c.setBlack(false);
    await c.wait(700);
    await narrate(c, 'You are cold. You are hungry. You are, somehow, still alive.');
    c.hint('MOVE: WASD or ARROWS    INTERACT: E or SPACE    MENU: ESC');
    await c.wait(200);
    await narrate(c, 'Somewhere north of here, across the street, somebody is coughing.');
    c.flag('intro_done');
    c.save('auto');
  },

  // ------------------------------------------------------------ Old Tom
  async tom(c) {
    if (c.flagged('killed_mother')) {
      await say(c, TOM, 'I can smell the sewers on you. And something else. Is that... clean water?', 'Don\'t tell me. Go on. Get out of here before it stops being true.');
      return;
    }
    if (c.flagged('killed_grease')) {
      await say(c, TOM, 'So Grease is dead. Well. You\'re a mean little thing when it counts.', 'East, through the culvert. Don\'t stop for anything with a leash.');
    } else if (!c.flagged('met_tom')) {
      c.flag('met_tom');
      await say(c, TOM,
        '*cough* ...Well, look at that. Still breathing. I had a bet with the water about you.',
        'Sit by the barrel a moment. You\'re shaking so hard you\'ll wake the rats.',
        'Listen, kid. You stay here, you die here. Everybody does. I\'m only slower than most.',
        'There\'s a story. East through the District, over the canal. A place called Marrow Lane.',
        'A house with a yellow window. An old woman puts a bowl on the step. Every night. Warm bed by the fire, they say.',
        'Nobody\'s ever come back to say it\'s true.',
        '...Nobody comes back from anywhere, so that doesn\'t mean much.');
      const pick = await c.choose('What do you do?', ['Ask how to get out', 'Ask how to stay alive']);
      if (pick === 1) {
        await say(c, TOM,
          'Eat before you\'re starving. Starving makes your claws weak. Dig through the trash. Press E on anything that looks searchable.',
          'When something comes at you, watch it. Big hits, you can see them coming. When you see one, DEFEND.',
          'Bracing cuts the damage in half and more, and your next strike lands harder. Don\'t be proud. Be alive.',
          'Those dry boxes? Curl up in one and you can rest and save. Resting burns food, though.');
      }
      await say(c, TOM,
        'Only way out is the culvert, far east end of this street. Grease has it. Rat the size of a dog.',
        'He gets braver the more of his pack is around him. Kill the small ones first, or don\'t, but don\'t pretend I didn\'t warn you.',
        'There\'s a rusty nail in the scrap yard, south and east. Jam it in your paw. Fight the small rats until you\'ve got some weight behind you.');
      c.advance('main', 1);
      c.give('crust', 1);
      c.hint('Open the menu with ESC to eat, equip gear and check your quest.');
      return;
    } else if (!c.flagged('tom_fed')) {
      await say(c, TOM, 'Back again. You look worse. That\'s good. Means you\'ve been fighting.');
    }
    if (c.flagged('tom_fed')) {
      await say(c, TOM, 'Go on. I\'ve got a good fire and no plans.');
      return;
    }
    if (c.has('crust') || c.has('fish_head')) {
      const food = c.has('fish_head') ? 'fish_head' : 'crust';
      const pick = await c.choose('Tom looks thin. Share some food?', ['Give it to him', 'Keep it']);
      if (pick === 0) {
        c.take(food, 1);
        c.flag('tom_fed');
        await say(c, TOM, '...', 'Nobody\'s done that in a while. Here. Had it since before you were born.', 'I won\'t need it where I\'m not going.');
        c.give('tom_tag', 1);
        return;
      }
    }
    if (!c.flagged('killed_grease')) await say(c, TOM, 'Culvert\'s east. Mind the fat one.');
  },

  async enterDistrict(c) {
    if (c.flagged('seen_district')) return;
    c.flag('seen_district');
    c.advance('main', 3);
    c.sfx('howl');
    await narrate(c, 'You crawl out of the pipe into a street with no lights on.', 'Somewhere in the dark, a dog is howling. Nearby, something large answers it.');
    c.hint('Dogs and people hunt you on sight. Break their line of sight to lose them.');
  },

  async enterPlant(c) {
    if (c.flagged('seen_plant')) return;
    c.flag('seen_plant');
    await narrate(c, 'Hooks. Rows and rows of hooks. It is colder in here than outside, and the smell gets into your teeth.');
  },

  async enterCistern(c) {
    c.advance('main', 9);
    if (c.flagged('seen_cistern')) return;
    c.flag('seen_cistern');
    c.sfx('stinger');
    await narrate(c, 'The tunnel opens out into blackness. The air is thick and warm, like breath.', 'A dry box by the wall. Somebody thought it worth a last rest.');
  },

  async enterMarrow(c) {
    if (c.flagged('seen_marrow')) return;
    c.flag('seen_marrow');
    await narrate(c, 'You drag yourself up into the open air. Streetlights. Working ones.', 'Nothing here is trying to kill you. You do not trust that yet.');
  },

  async greaseAmbush(c) {
    c.sfx('squeak');
    c.shake(200);
    await narrate(c, 'The culvert stinks of fat and old blood. Something enormous heaves itself up out of the dark.');
    await c.say('GREASE', 'grease', '*chitter* Fresh. Thin. But fresh.');
    const res = await c.battle(['rat', 'grease'], { boss: true, bg: 'gutter', music: 'boss' });
    if (res !== 'win') return;
    c.flag('killed_grease');
    c.refreshEntities();
    await narrate(c, 'What is left of Grease slides into the gutter water. The rest of his pack has gone.', 'The culvert stands open.');
    c.advance('main', 2);
    c.save('auto');
  },

  // ------------------------------------------------------------ District
  async patch(c) {
    const stage = c.questStage('patch');
    if (stage === 1) {
      await say(c, PATCH, 'They\'re sleeping. All three. I forgot what that sounds like.');
      return;
    }
    if (stage === -1) {
      await say(c, PATCH,
        'Don\'t come closer. I\'ll open you up, I swear it.',
        '...You\'re just a kid. You\'re starving too.',
        'The plant used to throw out fish. Now there\'s nothing, and I can\'t leave them. Not with that man out there, with his van and his net.');
      c.setQuest('patch', 0);
    }
    if (c.has('fish_head')) {
      const pick = await c.choose('Give Patch your Fish Head?', ['Give it', 'Not now']);
      if (pick === 0) {
        c.take('fish_head', 1);
        c.setQuest('patch', 1, true);
        c.sfx('eat');
        await say(c, PATCH,
          '...',
          'I had a person once, did you know? She had a bottlecap on a string. She said it was lucky. I kept it, after.',
          'Take it. It didn\'t work for me. Maybe it needed someone who gives away fish.');
        c.give('capcharm', 1);
        await say(c, PATCH, 'The Catcher\'s yard is south of the avenue, behind the wire gate. He wears his keys on his belt. If you\'re going down there... the cats in those cages. Please.');
        return;
      }
    }
    await say(c, PATCH, 'A fish head. Just one. They\'re so small.');
  },

  async kittens(c) {
    if (c.questStage('patch') === 1) await narrate(c, 'Three kittens in a damp heap, bellies round. One twitches, chasing something in a dream.');
    else await narrate(c, 'Three kittens, too quiet. They lift their heads when you come close, then let them fall.');
  },

  async poster(c) {
    c.sfx('paper');
    await narrate(c, 'A poster, peeling off the post. There are dozens of them along this street, all the same.', '"LOST. BUTTON. Small gray cat, white chest. Very gentle. Afraid of thunder."', '"If found, please. 14 MARROW LANE. I leave the light on. PLEASE."');
    if (!c.has('poster')) {
      await narrate(c, 'Marrow Lane. So it is a real place. You pull the poster down and carry it in your teeth.');
      c.give('poster', 1);
    }
    c.flag('read_poster');
    if (c.mainStage() < 4) await narrate(c, 'The crow on the plaza watches you with one bright, greedy eye. Crows see everything.');
  },

  async rag(c) {
    if (!c.flagged('met_rag')) {
      c.flag('met_rag');
      await say(c, RAG,
        'Kraa. A cat with a plan. How sad. I am Rag. I trade. You got shiny, I got goods. Bottlecaps, yes, those are shiny.',
        'Why would a crow want bottlecaps? Why would a cat want to live? We all have our habits.');
    }
    if (c.mainStage() >= 2 && c.mainStage() <= 3) {
      await say(c, RAG,
        'Marrow Lane? Over the canal. Bridge fell in the spring. You can\'t fly, so, no. Under, then.',
        'Manhole outside the meat plant goes down to the old sewer. Runs right under the canal, comes up on the far side.',
        'But it wants a hook to lift the lid, and the only hook is on the belt of the Catcher.',
        'Wire gate, south of the avenue. He is a big man who likes his job. Bring a stomach for it. And some way to not be under his net.');
      c.advance('main', 4);
    }
    const stock = [
      { id: 'crust', cost: 2 },
      { id: 'rag', cost: 5 },
      { id: 'salve', cost: 6 },
      { id: 'fish_head', cost: 6 },
      { id: 'firecracker', cost: 8 },
    ];
    for (;;) {
      const labels = stock.map((s) => `${c.itemName(s.id)} - ${s.cost} caps`);
      labels.push('Leave');
      const pick = await c.choose(`Bottlecaps: ${c.state.caps}`, labels);
      if (pick >= stock.length) break;
      const offer = stock[pick];
      if (c.state.caps < offer.cost) {
        await say(c, RAG, 'Kraa! No shiny, no goods. I am a crow of principle.');
        continue;
      }
      c.state.caps -= offer.cost;
      c.give(offer.id, 1);
    }
    await say(c, RAG, 'Don\'t die near me unless you mean it. I do have standards, but they are low.');
  },

  async cage(c, ent) {
    const key = `cage_${ent.x}`;
    if (c.flagged(key)) {
      await narrate(c, 'The cage door hangs open. A few gray hairs stuck in the wire. That\'s all.');
      return;
    }
    if (!c.has('cage_key')) {
      if (c.questStage('cages') < 0) c.setQuest('cages', 0);
      await narrate(c, 'A cat stares out through the wire, too tired to hiss. The padlock will not move.');
      return;
    }
    c.flag(key);
    c.sfx('unlock');
    c.setEntityTile(ent, 'cage_open');
    const opened = [24, 26, 28, 30].filter((x) => c.flagged(`cage_${x}`)).length;
    await narrate(c, ['You work the key into the lock with your teeth. It takes a long time. The cat does not thank you. It looks at you once, and it runs.',
      'This one has to be nudged out. It stands in the rain with its eyes shut, as if it had forgotten about rain.',
      'This one bites you on the way past. Fair enough.',
      'The last one is barely a year old. It sniffs your face, then follows the others into the dark.'][opened - 1] || 'The cage swings open.');
    if (opened === 4) {
      c.setQuest('cages', 2, true);
      await narrate(c, 'The yard is quiet now. You feel a little taller, which is ridiculous, and you allow it.');
      c.gainXp(30);
    }
  },

  async catcherAmbush(c) {
    c.sfx('stinger');
    await narrate(c, 'A man the size of a door straightens up in the middle of the yard. He has a pole in one hand, and a net in the other.');
    await c.say('THE CATCHER', 'catcher', 'There you are. Forty a head, and they don\'t ask what shape the head\'s in.');
    const res = await c.battle(['catcher'], { boss: true, bg: 'district', music: 'boss' });
    if (res !== 'win') return;
    c.flag('killed_catcher');
    c.refreshEntities();
    await narrate(c, 'He sits down in the mud, looking surprised, and then he does not look like anything.', 'You take the hook and the key from his belt.');
    c.advance('main', 5);
    c.setQuest('cages', 1);
    c.save('auto');
  },

  async manhole(c) {
    if (!c.has('hook')) {
      await narrate(c, 'An iron manhole, marked SEWER. You can hear water moving a long way down.', 'There is a slot for a lifting hook. You do not have one.');
      if (c.mainStage() === 3) await narrate(c, 'Somebody around here must know who has one.');
      return;
    }
    const pick = await c.choose('Lever the lid up with the hook, and go down?', ['Go down', 'Not yet']);
    if (pick !== 0) return;
    c.sfx('door');
    if (!c.flagged('entered_sewers')) {
      c.flag('entered_sewers');
      c.advance('main', 6);
    }
    await c.travel('sewers', 'entry');
    if (!c.flagged('sewer_intro')) {
      c.flag('sewer_intro');
      c.sfx('stinger');
      await narrate(c, 'The lid drops shut above you with a sound like a dropped coffin.', 'Green dark, and the slow drip of something that is not water. Something large has been eating here.');
    }
  },

  async ledger(c) {
    c.sfx('paper');
    await narrate(c, 'A ledger, kept in careful handwriting.', '"Animal Control contract. 40 per head, delivered to rear door."', '"Do not ask what the plant does with them. Foreman says the tins are labeled as tuna."', 'You look down at the can on the shelf. You decide not to think about this.');
  },

  // ------------------------------------------------------------ Sewers
  async deadExterminator(c) {
    if (c.flagged('searched_body')) {
      await narrate(c, 'He has nothing else to give you.');
      return;
    }
    c.flag('searched_body');
    await narrate(c, 'A man in a rubber suit, slumped over a toolbag. Something has been at him, slowly.', 'In the bag: a rusted valve wheel. You work it free.');
    c.give('valve_wheel', 1);
    c.give('rubber', 1);
    await narrate(c, 'You also tear a strip of rubber from his suit. It might keep the worst of the poison off.');
    c.advance('main', 7);
  },

  async pale(c) {
    if (c.flagged('killed_mother')) {
      await say(c, PALE, 'She has stopped singing. I can hear the water by itself now.', 'I had forgotten that it sounds like that. Thank you. Or. I don\'t know what to say to you. Thank you.');
      if (c.questStage('pale') === 1) c.setQuest('pale', 2, true);
      return;
    }
    if (!c.flagged('met_pale')) {
      c.flag('met_pale');
      await say(c, PALE,
        'Stop. There. I know that smell. Cat, wet, frightened. Don\'t bite me. I have no eyes and very little meat.',
        'I am called Pale. I am the last one who remembers being only a rat.',
        'They poured the green stuff down the pipes. Everyone who drank it grew. My mother grew the most. She is in the cistern, past the south culvert.',
        'She doesn\'t know you. She doesn\'t know me. She is only hungry. Same as you, little cat. It is not such a great difference.',
        'The culvert is flooded. There are two sluice valves, west room and east room. Turn both and the water will fall. You need a wheel to turn them. Look on the dead man in the pump room.');
      c.setQuest('pale', 0);
      await say(c, PALE, 'Here. It came down the drain one day. I don\'t know what it does. I am told it glows.');
      c.give('glowstick', 1);
      c.hint('Equip the Glowstick as a CHARM to see further in the dark.');
      await say(c, PALE, 'Whatever you do to her, do it quickly. And kill the little ones first, or she will eat them and mend.', 'When the water rises, make yourself small.');
      return;
    }
    await say(c, PALE, 'West room. East room. Then south. Kill the little ones first. When the water rises, make yourself small.');
  },

  async valveA(c) {
    await valve(c, 'valve_a', 'west');
  },

  async valveB(c) {
    await valve(c, 'valve_b', 'east');
  },

  // ------------------------------------------------------------ Boss
  async motherAmbush(c) {
    c.sfx('stinger');
    c.shake(600);
    await narrate(c, 'The whole far end of the chamber moves.', 'It was never a wall. It breathes. Dozens of milky eyes roll slowly and find nothing, and hundreds of pink, blind things crawl across it.', 'Under the sound of the water, it is singing.');
    const res = await c.battle(['mother'], { boss: true, bg: 'sewer', music: 'boss' });
    if (res !== 'win') return;
    c.flag('killed_mother');
    c.refreshEntities();
    await narrate(c, 'She goes down slowly, the way a building does. The singing stops.', 'Behind her, in the wet brick, iron rungs lead up. There is air coming down them. Air that smells of nothing at all.');
    c.advance('main', 10);
    if (c.questStage('pale') === 0) c.setQuest('pale', 1);
    c.save('auto');
  },

  // ------------------------------------------------------------ Marrow Lane
  async rainThins(c) {
    c.flag('rain_thinned');
    c.setWeather('drizzle_light');
    await narrate(c, 'The rain is thinning.', 'You stop in the road, one paw up, and listen to it. It has not done that in nine days.');
  },

  async almostHome(c) {
    c.flag('almost_home');
    await narrate(c, 'There. A yellow window. It is smaller than you imagined, and it is the most enormous thing you have ever seen.');
  },

  async stepBowl(c) {
    await narrate(c, 'A chipped blue bowl on the doorstep, with BUTTON painted on it in shaky letters.', 'It is full. Fresh. Somebody filled it tonight, and last night, and every night.', 'You are so hungry. And you are not Button. Your claws find the door anyway.');
  },

  async homeDoor(c) {
    c.setMusic('none');
    await narrate(c, 'You scratch at the door. Once. It is a very small sound.', 'For a long moment, nothing.', 'Then, slowly, on the other side: footsteps. A chain. A lock.');
    c.sfx('door');
    c.warmFlash();
    await c.wait(600);
    await say(c, LADY,
      'Button? Oh, Button, is it...',
      '...',
      'Oh. No. No, you aren\'t him, are you?',
      'He\'d be such an old boy by now.',
      'Well. Look at you. You\'re soaked through. Look at the state of your poor ear.',
      'Come on, then. Come in. Come in out of that. Mind the step.');
    c.advance('main', 11);
    await c.travel('house', 'door');
    c.save('auto');
    await narrate(c, 'It is warm.', 'You had forgotten. It goes all the way in.');
    c.hint('There is a bowl. There is a bed. Nothing here will hurt you.');
  },

  // ------------------------------------------------------------ Home
  async lady(c) {
    if (c.flagged('ate_home')) {
      await say(c, LADY, 'There now. There. I think you\'ll be stopping a while, won\'t you?', 'I\'ve kept his bed aired. Go on. It\'s all right. He wouldn\'t mind.');
    } else {
      await say(c, LADY, 'Go on, love, your bowl\'s there. It\'s only tuna. Eat, eat. No one\'s going to take it off you.');
    }
    c.sfx('purr');
  },

  async bowl(c, ent) {
    if (c.flagged('ate_home')) {
      await narrate(c, 'You have licked the bowl so clean it shines. You lick it once more, to be sure.');
      return;
    }
    c.flag('ate_home');
    c.sfx('eat');
    c.state.stats.hunger = 100;
    c.state.stats.hp = c.effective().hpMax;
    c.state.status.poison = 0;
    c.setEntityTile(ent, 'bowl_empty');
    await narrate(c, 'You eat. You eat like something is going to come and stop you.', 'Nothing comes.', 'You slow down. You have never in your life eaten slowly. It turns out to be nice.');
    c.hint('Hunger: full. Health: full. For the first time, those numbers do not matter.');
  },

  async bed(c) {
    if (!c.flagged('ate_home')) {
      await narrate(c, 'A small, soft bed by the wall, with a dent in it that is exactly the shape of a cat.', 'But the bowl first. You have not survived this long by leaving food.');
      return;
    }
    const pick = await c.choose('Curl up and sleep?', ['Sleep', 'Not just yet']);
    if (pick !== 0) return;
    c.flag('finished');
    c.save('auto');
    await c.ending();
  },
};

async function valve(c, flag, side) {
  if (c.flagged(flag)) {
    await narrate(c, `The ${side} valve is open. Sludge is sucking away somewhere below.`);
    return;
  }
  if (!c.has('valve_wheel')) {
    await narrate(c, 'A big sluice valve, with a square stem and no wheel on it. Somebody took the wheel off.');
    return;
  }
  const pick = await c.choose('Fit the wheel, and throw your whole weight on it?', ['Turn it', 'Leave it']);
  if (pick !== 0) return;
  c.flag(flag);
  c.sfx('valve');
  c.shake(500);
  await narrate(c, `The ${side} valve shrieks open. Far off, something enormous begins to drain.`);
  if (c.flagged('valve_a') && c.flagged('valve_b')) {
    c.flag('sluice_open');
    c.refreshEntities();
    c.sfx('flood');
    c.shake(900);
    await narrate(c, 'Every pipe in the sewer groans at once. The south culvert is emptying. The sludge pours away and what it leaves behind is a low, open tunnel.');
    c.advance('main', 8);
    c.save('auto');
    return;
  }
  await narrate(c, 'One more should do it. And it should be heard by everything down here.');
  c.sfx('stinger');
}
