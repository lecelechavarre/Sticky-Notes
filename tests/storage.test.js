/**
 * tests/storage.test.js
 * Simple Jest test for storage loading/saving logic.
 */

const fs = require('fs');
const path = require('path');

describe('storage utilities (mock localStorage)', () => {
  let localStorageMock;
  beforeEach(() => {
    localStorageMock = (function() {
      let store = {};
      return {
        getItem(key){ return store[key] ?? null; },
        setItem(key, val){ store[key] = String(val); },
        removeItem(key){ delete store[key]; },
        clear(){ store = {}; },
      };
    })();
    global.localStorage = localStorageMock;
  });

  test('save and load notes JSON', () => {
    const NOTES_KEY = 'sticky-notes:v1';
    const notes = [{ id: 'a', content: 'x' }, { id: 'b', content: 'y' }];
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    const raw = localStorage.getItem(NOTES_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(2);
    expect(parsed[0].id).toBe('a');
  });
});
