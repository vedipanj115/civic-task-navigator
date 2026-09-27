import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Procedure } from '@cn/shared';

import { resolveTask } from '../../engine/resolve';

function makeProcedure(procedureId: string, name: string, synonyms: string[]): Procedure {
  return {
    procedureId,
    name,
    synonyms,
    city: 'MUMBAI',
    appliesTo: { entityTypes: ['PROPRIETORSHIP'], activities: ['FOOD_SERVICE'] },
    summary: 'summary',
    steps: [],
  };
}

const foodOutlet = makeProcedure('proc_food_outlet_mumbai', 'Open a small food outlet', [
  'restaurant',
  'cafe',
  'eatery',
  'food stall',
]);
const retailShop = makeProcedure('proc_retail_shop_mumbai', 'Open a retail shop', ['shop', 'store', 'boutique']);
const procedures = [foodOutlet, retailShop];

test('exact synonym match resolves with confidence 1', () => {
  const result = resolveTask('restaurant', procedures);
  assert.equal(result.resolved, true);
  if (result.resolved) {
    assert.equal(result.procedureId, 'proc_food_outlet_mumbai');
    assert.equal(result.confidence, 1);
  }
});

test('filler and punctuation are stripped before a clear-winner match resolves', () => {
  const result = resolveTask('Please, I want to open a small restaurant!', procedures);
  assert.equal(result.resolved, true);
  if (result.resolved) {
    assert.equal(result.procedureId, 'proc_food_outlet_mumbai');
  }
});

test('a nonsense query with no candidate >= 0.3 is unrecognised and returns every procedure', () => {
  const result = resolveTask('renew my passport please', procedures);
  assert.equal(result.resolved, false);
  assert.equal(result.procedureId, null);
  assert.equal(result.candidates.length, procedures.length);
});

test('two close candidates within 0.15 of each other are ambiguous', () => {
  const shopA = makeProcedure('proc_a', 'Open a retail kiosk', []);
  const shopB = makeProcedure('proc_b', 'Open a retail store', []);
  const result = resolveTask('open a retail shop', [shopA, shopB]);
  assert.equal(result.resolved, false);
  assert.equal(result.procedureId, null);
  assert.ok(result.candidates.length >= 2);
});

test('never silently resolves a low-confidence match', () => {
  // "cafe" alone only overlaps one of the food-outlet synonyms/name tokens
  // out of several query tokens once combined with unrelated words — still
  // must not cross the 0.6 bar without being a clear, high-confidence match.
  const result = resolveTask('cafe compliance audit renewal', procedures);
  if (result.resolved) {
    assert.ok(result.confidence >= 0.6);
  }
});

test('missing/empty query is the caller\'s responsibility, not resolveTask\'s — city scoping works', () => {
  const result = resolveTask('boutique', procedures, 'MUMBAI');
  assert.equal(result.resolved, true);
  if (result.resolved) assert.equal(result.procedureId, 'proc_retail_shop_mumbai');
});
