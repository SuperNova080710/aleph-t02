export const RULES = Object.freeze({
  width: 480,
  height: 500,
  duration: 30,
  playerWidth: 36,
  playerHeight: 30,
  playerY: 450,
  step: 24,
  spawnInterval: 0.85,
  baseFall: 180,
});
export const SPEEDS = [0.8, 1, 1.2];
export const EXPERIMENT_SEEDS = Array.from(
  { length: 10 },
  (_, i) => 20261021 + i * 7919,
);
export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function createGame(speed = 1, seed = 1) {
  if (!SPEEDS.includes(speed)) throw new Error("Invalid speed");
  return {
    state: "playing",
    speed,
    seed: seed >>> 0,
    elapsed: 0,
    x: 222,
    bugs: [],
    score: 0,
    inputs: 0,
    spawn: 0,
    rng: random(seed),
  };
}
// One accepted input event produces exactly one step, including browser key-repeat events.
export function move(g, direction) {
  if (g.state !== "playing" || ![-1, 1].includes(direction)) return false;
  g.inputs++;
  g.x = Math.max(
    0,
    Math.min(RULES.width - RULES.playerWidth, g.x + direction * RULES.step),
  );
  return true;
}
export function pause(g) {
  if (g.state === "playing") g.state = "paused";
}
export function resume(g) {
  if (g.state === "paused") g.state = "playing";
}
export function advance(g, dt) {
  if (g.state !== "playing" || !Number.isFinite(dt) || dt <= 0) return;
  // Fixed small substeps prevent collision tunnelling at low frame rates.
  let remaining = Math.min(dt, RULES.duration - g.elapsed);
  while (remaining > 1e-9 && g.state === "playing") {
    const step = Math.min(1 / 120, remaining);
    remaining -= step;
    g.elapsed += step;
    g.spawn += step;
    if (g.spawn >= RULES.spawnInterval) {
      g.spawn -= RULES.spawnInterval;
      g.bugs.push({
        x: 12 + g.rng() * 424,
        y: -32,
        w: 32,
        h: 28,
        vy: (RULES.baseFall + g.rng() * 60) * g.speed,
      });
    }
    for (const b of g.bugs) {
      b.y += b.vy * step;
      if (
        g.x < b.x + b.w &&
        g.x + RULES.playerWidth > b.x &&
        RULES.playerY < b.y + b.h &&
        RULES.playerY + RULES.playerHeight > b.y
      ) {
        g.state = "lose";
        break;
      }
    }
    g.bugs = g.bugs.filter((b) => {
      if (b.y > RULES.height) {
        g.score++;
        return false;
      }
      return true;
    });
    if (g.state === "playing" && g.elapsed >= RULES.duration - 1e-8) {
      g.elapsed = RULES.duration;
      g.state = "win";
    }
  }
}
export function result(g, mode = "normal", group = null) {
  return {
    speed: g.speed,
    seed: g.seed,
    time: Number(g.elapsed.toFixed(3)),
    score: g.score,
    outcome: g.state,
    reason: g.state === "win" ? "30초 생존" : "버그 충돌",
    inputs: g.inputs,
    mode,
    group,
  };
}
