// Safety gate. Runs BEFORE any recommendation logic. If it fires, the app stops
// recommending music and points to real human help instead.
//
// This is a conservative keyword screen, not a clinical tool. It errs on the
// side of showing support resources (a false positive costs one extra card; a
// false negative costs far more).

const PATTERNS = [
  // Direct intent
  /\b(kill|killing|end|ending|take|off)\s+(my\s*self|myself|my\s+own\s+life|my\s+life)\b/i,
  /\b(hang|drown|shoot|stab|poison|starve|burn|cut|cutting|hurt|harm|hurting|harming)\s+(my\s*self|myself)\b/i,
  /\bsuicid(e|al)\b/i,
  /\b(unalive|un-alive|kms)\b/i,
  /\bself[-\s]?harm\b/i,
  /\boverdos(e|ing)\b/i,
  /\bjump(ing)?\s+(off|from)\s+(a|the|my)\s+(bridge|building|roof|cliff|balcony|window)\b/i,
  /\bend\s+(my|this|the)\s+(life|pain|suffering)\b/i,
  /\bend\s+it\s+(all|tonight|now|today)\b/i,
  // Wanting to die / death wishes (including indirect phrasing like "I wish for death")
  /\b(want|wan+a|ready|need|plan(ning)?|hoping|hope|pray(ing)?)\s+(for\s+|to\s+|of\s+)?(die|dying|death|be\s+dead|not\s+be\s+(alive|here)|not\s+exist|disappear(\s+forever)?)\b/i,
  /\b(wish(es|ing)?|long(ing)?|crave|craving|welcome|seek(ing)?)\s+(for\s+)?(an?\s+)?(death|to\s+die|to\s+be\s+dead|to\s+not\s+(be\s+)?alive|to\s+disappear|to\s+not\s+wake)\b/i,
  /\bwish\s+(i|that\s+i)\s+(was|were|am|could\s+be)\s+(dead|gone|not\s+alive|never\s+born)\b/i,
  /\bwish\s+(i|that\s+i)\s+(would|could|will)\s+(just\s+)?(die|disappear|vanish|not\s+wake)/i,
  /\bwish\s+(i|that\s+i)\s+(was|were|had)n'?t\s+(alive|born|here)\b/i,
  /\bnever\s+(been\s+born|woken\s+up|wake\s+up)\b/i,
  /\b(thinking|thought|thoughts)\s+(of|about)\s+(death|dying|ending\s+(it|everything))\b/i,
  /\bdeath\s+wish\b/i,
  /\b(hope|pray)\s+(that\s+)?i\s+(die|just\s+die|don'?t\s+wake)/i,
  /\b(rather|better)\s+(be\s+)?(dead|died)\b/i,
  /\bbetter\s+off\s+(dead|without\s+me)\b/i,
  /\bnot\s+(wake|waking)\s+up\b/i,
  // Hopelessness
  /\b(don'?t|do\s+not|no\s+longer)\s+(want|wish)\s+to\s+(live|be\s+alive|exist|be\s+here|wake\s+up)\b/i,
  /\bno\s+(reason|point)\s+(to|in|anymore)\s*(live|living|going\s+on|continu\w*|life|anything)?\b.*\b(live|living|life|anymore|going\s+on)\b/i,
  /\b(tired|sick|done)\s+(of|with)\s+(living|life|being\s+alive)\b/i,
  /\bgive\s+up\s+on\s+life\b/i,
  /\bcan'?t\s+(go\s+on|take\s+it\s+any\s*more|do\s+this\s+any\s*more)\b/i,
  /\b(not|isn'?t|is\s+not)\s+worth\s+(it\s+to\s+)?(living|life|being\s+alive)\b/i,
  /\blife\s+(isn'?t|is\s+not)\s+worth\b/i,
  /\bcan'?t\s+live\s+without\b/i,
  /\b(nothing|no\s+one|nobody)\s+(left\s+)?to\s+live\s+for\b/i,
  /\blife\s+(is|has)\s+(over|ended|no\s+meaning|no\s+point)\b/i,
  /\b(i\s+)?(just\s+)?want\s+(it|everything|the\s+pain)\s+to\s+(stop|end)\b/i,
];

// Light normalisation so curly quotes, shouting, stretched letters and simple
// letter-for-number swaps ("k1ll myself") do not slip past.
function variants(text) {
  const base = text.toLowerCase().replace(/[‘’ʼ`]/g, "'").replace(/\s+/g, ' ');
  const stretched = base.replace(/(.)\1{2,}/g, '$1$1');
  const leet = stretched.replace(/[01345@$]/g, (c) => ({ 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', '@': 'a', $: 's' }[c]));
  const squashed = base.replace(/(.)\1+/g, '$1'); // "dieee" -> "die"
  return [...new Set([base, stretched, leet, squashed])];
}

export function detectCrisis(text) {
  if (typeof text !== 'string' || !text.trim()) return false;
  return variants(text).some((t) => PATTERNS.some((re) => re.test(t)));
}

// Deliberately no invented phone numbers: a wrong number in a crisis card is
// worse than none. findahelpline.com lists verified services by country.
export const CRISIS_RESPONSE = {
  title: "I'm pausing the music. You matter more than the playlist.",
  body: [
    "What you wrote sounds heavy, and I don't want to answer it with a song suggestion.",
    "Please reach out to a real person right now: someone you trust (family, a friend, a faith leader), or your local emergency number if you might act on these thoughts.",
    "If you are not sure who to call, findahelpline.com lists free, confidential helplines by country, including Nigeria.",
    "You don't have to carry this alone tonight.",
  ],
  resources: [
    { label: 'Find a helpline in your country', url: 'https://findahelpline.com' },
    { label: 'Befrienders Worldwide', url: 'https://www.befrienders.org' },
  ],
};
