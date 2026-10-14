// The wording layer. Deterministic templates: warm, short, never clinical, and
// no ability to name music (that is recommend.js's job, grounded in Qloo).

const OPENERS = {
  calm: [
    'Take a breath. Your mind has been running hard, and it is allowed to rest for one song.',
    'You do not have to solve everything tonight. Let one song hold you for a few minutes.',
  ],
  dance: [
    'Let us move this worry out of your body. One song, on your feet.',
    'Heavy thoughts hate a joyful noise. Stand up for one song.',
  ],
};

const TOPIC_LINES = [
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

const AFTER = [
  'When it ends, take one slow breath. Then do one small thing: drink some water.',
  'When the song ends, write the one worry that is loudest on paper. You can face it tomorrow, not tonight.',
  'When it ends, stay for one more if you still need it. There is no rush.',
];

function pick(list, seed) {
  return list[seed % list.length];
}

export function composeMessage({ text = '', mode = 'calm', seed = Date.now() } = {}) {
  const m = OPENERS[mode] ? mode : 'calm';
  const topic = TOPIC_LINES.find((t) => t.test.test(text));
  return {
    opener: pick(OPENERS[m], seed),
    topic: topic ? topic.line : null,
    after: pick(AFTER, seed >> 1),
  };
}
