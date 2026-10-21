import { writeFile } from "node:fs/promises";
import {
  createGame,
  advance,
  move,
  result,
  EXPERIMENT_SEEDS,
  RULES,
} from "../src/engine.js";
// Deterministic, deliberately limited pilot. This is NOT a human usability study.
// React every 0.2s, only to bugs below y=340, one 24px input per reaction.
function pilot(g) {
  const b = g.bugs
    .filter((b) => b.y > 340 && b.y < 480)
    .sort((a, b) => b.y - a.y)[0];
  if (!b) return;
  if (g.x < b.x + b.w + 5 && g.x + 36 > b.x - 5)
    move(g, g.x + 18 < b.x + 16 ? -1 : 1);
}
const records = [];
for (const [group, speed] of [
  ["A", 1],
  ["B", 0.8],
])
  for (const seed of EXPERIMENT_SEEDS) {
    const g = createGame(speed, seed);
    let tick = 0;
    while (g.state === "playing") {
      if (tick % 24 === 0) pilot(g);
      advance(g, 1 / 120);
      tick++;
    }
    records.push(result(g, "experiment", group));
  }
function stats(group) {
  const a = records.filter((r) => r.group === group),
    t = a.map((r) => r.time).sort((a, b) => a - b);
  return {
    count: a.length,
    medianSeconds: (t[4] + t[5]) / 2,
    minSeconds: t[0],
    maxSeconds: t[9],
    wins: a.filter((r) => r.outcome === "win").length,
    collisions: a.filter((r) => r.outcome === "lose").length,
  };
}
const output = {
  source: "deterministic-automated-pilot-not-human",
  rules: RULES,
  changedParameter: "fall speed multiplier only",
  fixed:
    "same 10 seeds, player dimensions/step, spawn interval, pilot reaction 0.2 seconds, threshold y=340",
  groups: { A: stats("A"), B: stats("B") },
  selectedSpeed: 1,
  reason:
    "1.0×는 생존 중앙값 30초·충돌 4회, 0.8×는 중앙값 22.9165초·충돌 7회였습니다. 이 자동 파일럿에서는 1.0×가 더 안정적이므로 기본값으로 선택합니다. 속도가 느리면 버그가 오래 남아 반드시 쉽지는 않습니다. 사람 플레이의 난이도를 보증하지 않으며, 학생은 20회 기록 후 최종 판단해야 합니다.",
  records,
};
await writeFile(
  "docs/evidence/automated-20-runs.json",
  JSON.stringify(output, null, 2),
);
console.log(output.groups);
