// The wording layer. Deterministic templates: warm, short, never clinical, and
// no ability to name music (that is recommend.js's job, grounded in Qloo).

import { themeOf } from './themes.js';

const OPENERS = {
  calm: [
    'Take a breath. Your mind has been running hard, and it is allowed to rest for one song.',
    'You do not have to solve everything tonight. Let one song hold you for a few minutes.',
  ],
  dance: [
    'Let us move this worry out of your body. One song, on your feet.',
    'Heavy thoughts hate a joyful noise. Stand up for one song.',
  ],
  release: [
    'It hurts because it mattered. You are allowed to feel all of it. Put on a song and let it out.',
    'You do not have to be strong right now. Let a song say what you cannot, and let yourself feel it.',
  ],
  heal: [
    'This chapter ended, but you did not. Put on a song that reminds you of your worth.',
    'You are allowed to hurt and to rise in the same night. Let one song lift you.',
  ],
};

const WORRY_TOPICS = [
  {
    test: /\b(result|results|winner|winners|announce\w*|didn'?t win|not win|lost|rejected|rejection)\b/i,
    line: 'Waiting on results and watching others win is exhausting. Your effort was real even when the outcome is not yours yet.',
  },
  {
    test: /\b(money|broke|rent|bills?|food|eat|hungry|debt|afford|fees)\b/i,
    line: 'Worry about money and food is heavy. It is a real pressure, and it is okay to take a few minutes off from carrying it.',
  },
  {
    test: /\b(alone|lonely|nobody|no one|miss)\b/i,
    line: 'Feeling alone makes everything louder. You are not wrong to want company, and music can be a little of it.',
  },
  {
    test: /\b(sleep|night|awake|3am|can'?t sleep)\b/i,
    line: 'Night makes worries bigger than they are. Keep the volume low and let the song do the talking.',
  },
];

const HEART_TOPICS = [
  {
    test: /\b(broke\s+up|break\s*up|breakup|dumped|left\s+me|ended\s+(it|things)|she\s+left|he\s+left|walked\s+out)\b/i,
    line: 'A breakup can feel like the ground moved. However it ended, the grief is real and it deserves room.',
  },
  {
    test: /\b(cheat\w*|betray\w*|lied|lies|trust)\b/i,
    line: 'Being hurt by someone you trusted is a particular kind of pain. None of this makes you less worthy of love.',
  },
  {
    test: /\b(miss|still love|can'?t forget|memories|text(ing)?|call(ing)?)\b/i,
    line: 'Missing someone is not weakness, it is how much you cared. If you feel like texting tonight, maybe wait until after the song.',
  },
  {
    test: /\b(alone|lonely|empty|nobody|no one)\b/i,
    line: 'The quiet after a breakup is loud. You are not as alone as it feels, and music can keep you company for a while.',
  },
];

const AFTER = {
  worry: [
    'When it ends, take one slow breath. Then do one small thing: drink some water.',
    'When the song ends, write the one worry that is loudest on paper. You can face it tomorrow, not tonight.',
    'When it ends, stay for one more if you still need it. There is no rush.',
  ],
  heartbreak: [
    'When it ends, take one slow breath and drink some water. You have carried a lot today.',
    'When the song ends, reach out to one person who loves you, even with just "hey". Do not carry this alone.',
    'When it ends, stay for one more if you need to. Healing is not a straight line.',
  ],
};

function pick(list, seed) {
  return list[seed % list.length];
}

export function composeMessage({ text = '', mode = 'calm', seed = Date.now() } = {}) {
  const m = OPENERS[mode] ? mode : 'calm';
  const theme = themeOf(m);
  const topics = theme === 'heartbreak' ? HEART_TOPICS : WORRY_TOPICS;
  const topic = topics.find((t) => t.test.test(text));
  return {
    opener: pick(OPENERS[m], seed),
    topic: topic ? topic.line : null,
    after: pick(AFTER[theme], seed >> 1),
  };
}
