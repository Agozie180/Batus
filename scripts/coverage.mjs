// Measures how well Qloo knows the gospel artists Batus is built for.
//   QLOO_API_KEY=... npm run coverage            (default list)
//   QLOO_API_KEY=... npm run coverage -- "Sinach" "Your Artist"
// Writes COVERAGE.md so the README can quote real numbers instead of guesses.
import { writeFile } from 'node:fs/promises';
import { createQlooClient } from '../lib/qloo.js';

const DEFAULTS = {
  'Nigerian gospel': ['Sinach', 'Nathaniel Bassey', 'Mercy Chinwo', 'Frank Edwards', 'Dunsin Oyekan', 'Minister Prudence', 'Eben', 'Ada Ehi', 'Tope Alabi', 'Mercy Chinwo', 'Chioma Jesus', 'Preye Odede'],
  'International worship': ['The Belonging Co', 'Elevation Worship', 'Maverick City Music', 'Hillsong Worship', 'Bethel Music', 'Travis Greene', 'Kirk Franklin', 'Tasha Cobbs Leonard'],
};

const key = process.env.QLOO_API_KEY;
if (!key) {
  console.error('Set QLOO_API_KEY first.');
  process.exit(1);
}
const qloo = createQlooClient({ apiKey: key });
const groups = process.argv.length > 2 ? { Custom: process.argv.slice(2) } : DEFAULTS;

const lines = ['# Qloo coverage check', '', `Run: ${new Date().toISOString()}`, ''];
let total = 0;
let found = 0;
for (const [group, names] of Object.entries(groups)) {
  lines.push(`## ${group}`, '', '| Artist | In Qloo | Matched as |', '|---|---|---|');
  for (const name of [...new Set(names)]) {
    total += 1;
    try {
      const hit = await qloo.searchArtist(name);
      if (hit) found += 1;
      lines.push(`| ${name} | ${hit ? 'yes' : 'no'} | ${hit ? hit.name : ''} |`);
    } catch (err) {
      lines.push(`| ${name} | error (${err.status ?? 'network'}) | |`);
    }
  }
  lines.push('');
}
lines.splice(4, 0, `**Found ${found} of ${total} artists.** A match means Qloo returned a top result; check the "Matched as" column for look-alikes.`, '');
await writeFile(new URL('../COVERAGE.md', import.meta.url), lines.join('\n'));
console.log(lines.slice(4, 6).join('\n'));
