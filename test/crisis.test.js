import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCrisis } from '../lib/crisis.js';
import { handlePraise } from '../server.js';

test('detects crisis language', () => {
  for (const t of [
    'I want to kill myself',
    "I don't want to live anymore",
    'I feel like ending my life',
    'there is no point in living',
    'everyone is better off without me',
    'I keep wanting to hurt myself',
    "I can't go on",
  ]) {
    assert.equal(detectCrisis(t), true, t);
  }
});

test('does not fire on ordinary worry', () => {
  for (const t of [
    "The hackathon results came out and I didn't win",
    "I'm worried about money and food",
    'I killed it at the demo today',
    "I can't sleep and my mind won't stop",
    '',
  ]) {
    assert.equal(detectCrisis(t), false, t);
  }
});

test('crisis gate stops recommendations entirely', async () => {
  let called = false;
  const out = await handlePraise(
    { text: 'I want to end my life', artists: ['Sinach'], mode: 'calm' },
    { fetchImpl: () => { called = true; throw new Error('should not be called'); }, apiKey: 'k' },
  );
  assert.equal(out.crisis, true);
  assert.equal(called, false);
  assert.equal(out.picks, undefined);
});
