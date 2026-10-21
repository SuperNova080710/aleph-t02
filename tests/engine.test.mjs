import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  move,
  pause,
  resume,
  advance,
  RULES,
} from "../src/engine.js";
import { load, save, defaults, SAVE_KEY, validSave } from "../src/storage.js";
test("10 input events cause 10 actions; exact movement and bounds", () => {
  const g = createGame();
  for (let i = 0; i < 10; i++) move(g, i % 2 ? -1 : 1);
  assert.equal(g.inputs, 10);
  assert.equal(g.x, 222);
  for (let i = 0; i < 100; i++) move(g, -1);
  assert.equal(g.x, 0);
  for (let i = 0; i < 100; i++) move(g, 1);
  assert.equal(g.x, 444);
});
test("pause freezes the complete model; resume continues", () => {
  const g = createGame();
  advance(g, 1);
  pause(g);
  const snapshot = JSON.stringify(g);
  advance(g, 10);
  move(g, 1);
  assert.equal(JSON.stringify(g), snapshot);
  resume(g);
  advance(g, 0.1);
  assert.ok(g.elapsed > 1);
});
test("collision fails and terminal state does not advance", () => {
  const g = createGame();
  g.bugs = [{ x: g.x, y: 450, w: 32, h: 28, vy: 200 }];
  advance(g, 0.01);
  assert.equal(g.state, "lose");
  const t = g.elapsed;
  advance(g, 10);
  assert.equal(g.elapsed, t);
});
test("success at 30s and reset from either terminal outcome", () => {
  const g = createGame();
  g.elapsed = 29.99;
  g.spawn = 0;
  advance(g, 0.1);
  assert.equal(g.state, "win");
  assert.equal(g.elapsed, 30);
  for (const state of ["win", "lose"]) {
    g.state = state;
    const fresh = createGame();
    assert.equal(fresh.elapsed, 0);
    assert.equal(fresh.score, 0);
    assert.equal(fresh.inputs, 0);
    assert.equal(fresh.bugs.length, 0);
    assert.equal(fresh.x, 222);
  }
});
test("speed changes only fall velocity: same spawn positions and count", () => {
  const a = createGame(1, 17),
    b = createGame(0.8, 17);
  advance(a, 1.8);
  advance(b, 1.8);
  assert.equal(a.bugs.length, b.bugs.length);
  a.bugs.forEach((bug, i) => {
    assert.equal(bug.x, b.bugs[i].x);
    assert.equal(bug.vy * 0.8, b.bugs[i].vy);
  });
  assert.equal(RULES.spawnInterval, 0.85);
});
test("empty, invalid JSON, arrays, type errors and overflow recover to defaults", () => {
  for (const raw of [
    null,
    "",
    "{",
    "[]",
    "null",
    JSON.stringify({ ...defaults(), best: 31 }),
    JSON.stringify({ ...defaults(), best: "10" }),
    JSON.stringify({ ...defaults(), records: [{}] }),
    JSON.stringify({ ...defaults(), wins: 2, rounds: 1 }),
  ]) {
    let saved;
    const s = { getItem: () => raw, setItem: (k, v) => (saved = v) };
    assert.deepEqual(load(s).data, defaults());
  }
});
test("valid records survive reload and storage errors remain recoverable", () => {
  const d = { ...defaults(), best: 12, wins: 1, rounds: 2 };
  let raw;
  const s = {
    setItem: (k, v) => {
      assert.equal(k, SAVE_KEY);
      raw = v;
    },
    getItem: () => raw,
  };
  save(s, d);
  assert.deepEqual(load(s).data, d);
  const broken = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  };
  assert.deepEqual(load(broken).data, defaults());
  assert.match(save(broken, d), /이 탭/);
  assert.ok(validSave(d));
});
