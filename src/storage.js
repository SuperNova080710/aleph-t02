import { SPEEDS, EXPERIMENT_SEEDS } from "./engine.js";
export const SAVE_KEY = "bugDodger_v2";
export const defaults = () => ({
  version: 2,
  best: 0,
  wins: 0,
  rounds: 0,
  speed: 1,
  reduced: false,
  records: [],
});
const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
export function validRecord(r) {
  return (
    r &&
    SPEEDS.includes(r.speed) &&
    integer(r.seed, 0, 4294967295) &&
    typeof r.time === "number" &&
    Number.isFinite(r.time) &&
    r.time >= 0 &&
    r.time <= 30 &&
    integer(r.score, 0, 100) &&
    integer(r.inputs, 0, 1000000) &&
    ["win", "lose"].includes(r.outcome) &&
    r.reason === (r.outcome === "win" ? "30초 생존" : "버그 충돌") &&
    (r.outcome !== "win" || r.time === 30) &&
    ["normal", "experiment"].includes(r.mode) &&
    (r.mode === "normal"
      ? r.group === null
      : ["A", "B"].includes(r.group) &&
        r.speed === (r.group === "A" ? 1 : 0.8) &&
        EXPERIMENT_SEEDS.includes(r.seed))
  );
}
export function validSave(d) {
  return (
    d &&
    d.version === 2 &&
    typeof d.best === "number" &&
    Number.isFinite(d.best) &&
    d.best >= 0 &&
    d.best <= 30 &&
    integer(d.wins, 0, 1e9) &&
    integer(d.rounds, d.wins, 1e9) &&
    SPEEDS.includes(d.speed) &&
    typeof d.reduced === "boolean" &&
    Array.isArray(d.records) &&
    d.records.length <= 200 &&
    d.records.every(validRecord)
  );
}
export function load(storage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw === null || raw === "")
      return {
        data: defaults(),
        message: "새 기록으로 시작합니다. 기본 최고 기록 0초.",
      };
    const data = JSON.parse(raw);
    if (!validSave(data)) throw new Error("invalid");
    return { data, message: "이 브라우저의 기록을 불러왔습니다." };
  } catch {
    const data = defaults();
    try {
      storage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      /* Memory-only fallback. */
    }
    return {
      data,
      message:
        "저장값 손상 또는 저장소 접근 제한: 기본값 0초로 복구했습니다. 게임은 계속할 수 있습니다.",
    };
  }
}
export function save(storage, data) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(data));
    return "기록이 이 브라우저에 저장되었습니다.";
  } catch {
    return "저장 공간을 사용할 수 없습니다. 현재 기록은 이 탭에서만 유지됩니다.";
  }
}
