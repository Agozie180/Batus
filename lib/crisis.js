// Safety gate. Runs BEFORE any recommendation logic. If it fires, the app stops
// recommending music and points to real human help instead.
//
// This is a conservative keyword screen, not a clinical tool. It errs on the
// side of showing support resources (a false positive costs one extra card; a
// false negative costs far more).

const PATTERNS = [
  /\b(kill|killing|end|ending|take)\s+(my\s*self|myself|my\s+own\s+life|my\s+life)\b/i,
  /\bsuicid(e|al)\b/i,
  /\b(want|wanna|wish|going|plan(ning)?)\s+(to\s+)?(die|be\s+dead|disappear\s+forever)\b/i,
  /\b(don'?t|do\s+not|no\s+longer)\s+(want|wish)\s+to\s+(live|be\s+alive|exist)\b/i,
  /\b(no\s+(reason|point)\s+(to|in)\s+(live|living|going\s+on|continu\w*))\b/i,
  /\bbetter\s+off\s+(dead|without\s+me)\b/i,
  /\b(hurt|harm|cut|cutting)\s+(my\s*self|myself)\b/i,
  /\bself[-\s]?harm\b/i,
  /\bend\s+it\s+all\b/i,
  /\bcan'?t\s+(go\s+on|take\s+it\s+any\s*more|do\s+this\s+any\s*more)\b/i,
  /\bnot\s+worth\s+living\b/i,
  /\bcan'?t\s+live\s+without\b/i,
  /\b(nothing|no\s+one|nobody)\s+(left\s+)?to\s+live\s+for\b/i,
  /\blife\s+(is|has)\s+(over|ended|no\s+meaning)\b/i,
  /\b(i\s+)?(just\s+)?want\s+(it|everything|the\s+pain)\s+to\s+(stop|end)\b/i,
];

export function detectCrisis(text) {
  if (typeof text !== 'string' || !text.trim()) return false;
  return PATTERNS.some((re) => re.test(text));
}

// Deliberately no invented phone numbers: a wrong number in a crisis card is
// worse than none. findahelpline.com lists verified services by country.
export const CRISIS_RESPONSE = {
  title: "I'm pausing the music. You matter more than the playlist.",
  body: [
    "What you wrote sounds heavy, and I don't want to answer it with a song suggestion.",
    "Please reach out to a real person right now: someone you trust, a pastor or elder you are close to, or your local emergency number if you might act on these thoughts.",
    "If you are not sure who to call, findahelpline.com lists free, confidential helplines by country, including Nigeria.",
    "You don't have to carry this alone tonight.",
  ],
  resources: [
    { label: 'Find a helpline in your country', url: 'https://findahelpline.com' },
    { label: 'Befrienders Worldwide', url: 'https://www.befrienders.org' },
  ],
};
