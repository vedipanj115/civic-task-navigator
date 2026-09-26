import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findCycle } from '../lib/dag';

test('findCycle returns null for an acyclic graph', () => {
  const cycle = findCycle(
    ['a', 'b', 'c'],
    [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
    ],
  );
  assert.equal(cycle, null);
});

test('findCycle detects a direct two-node cycle', () => {
  const cycle = findCycle(
    ['a', 'b'],
    [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'a' },
    ],
  );
  assert.ok(cycle);
  assert.ok(cycle?.includes('a'));
  assert.ok(cycle?.includes('b'));
});

test('findCycle detects a longer cycle', () => {
  const cycle = findCycle(
    ['a', 'b', 'c'],
    [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
      { from: 'c', to: 'a' },
    ],
  );
  assert.ok(cycle);
});

test('findCycle ignores nodes with no edges', () => {
  const cycle = findCycle(['a', 'b', 'isolated'], [{ from: 'a', to: 'b' }]);
  assert.equal(cycle, null);
});
