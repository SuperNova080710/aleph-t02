import {
  RULES,
  EXPERIMENT_SEEDS,
  createGame,
  move,
  pause,
  resume,
  advance,
  result,
} from "./engine.js";
import { load, save, defaults } from "./storage.js";
const $ = (id) => document.getElementById(id);
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  };
}
const loaded = load(storage);
let data = loaded.data,
  game = null,
  last = 0,
  experiment = false,
  roundGroup = null,
  finished = false;
const ctx = $("canvas").getContext("2d");
const media = matchMedia("(prefers-reduced-motion: reduce)");
$("speed").value = data.speed;
$("reduced").checked = data.reduced || media.matches;
$("save-status").textContent = loaded.message;
const labels = {
  playing: "진행 중",
  paused: "일시정지",
  win: "성공",
  lose: "실패",
};
function persist() {
  $("save-status").textContent = save(storage, data);
}
function effects() {
  document.body.classList.toggle(
    "reduced",
    $("reduced").checked || media.matches,
  );
  if ($("reduced").checked || media.matches)
    $("finish-effect").className = "finish-effect";
}
function experimentRecords() {
  return data.records.filter((r) => r.mode === "experiment");
}
function nextTrial() {
  const records = experimentRecords();
  for (const group of ["A", "B"])
    for (const seed of EXPERIMENT_SEEDS)
      if (!records.some((r) => r.group === group && r.seed === seed))
        return {
          group,
          seed,
          speed: group === "A" ? 1 : 0.8,
          index: EXPERIMENT_SEEDS.indexOf(seed) + 1,
        };
  return null;
}
function start() {
  let speed = Number($("speed").value),
    seed = crypto.getRandomValues(new Uint32Array(1))[0];
  roundGroup = null;
  if (experiment) {
    const trial = nextTrial();
    if (!trial) {
      experiment = false;
      $("experiment-status").textContent =
        "20판 비교 완료. 결과를 확인하고 최종 선택 이유를 작성해주세요.";
    } else {
      ({ speed, seed } = trial);
      roundGroup = trial.group;
      $("experiment-status").textContent =
        `${trial.group} ${trial.index}/10 · 속도 ${speed}× · 중도 재시작은 같은 판을 다시 합니다.`;
    }
  }
  game = createGame(speed, seed);
  finished = false;
  last = performance.now();
  $("overlay").hidden = true;
  render();
  $("arena").focus({ preventScroll: true });
}
function setOverlay(title, copy, button, label) {
  $("overlay").hidden = false;
  $("overlay-title").textContent = title;
  $("overlay-copy").textContent = copy;
  $("primary").innerHTML = "";
  $("primary").textContent = button;
  $("overlay-label").textContent = label;
}
function togglePause() {
  if (!game) return;
  if (game.state === "playing") {
    pause(game);
    setOverlay(
      "잠시 쉬어가세요.",
      "시간과 버그가 모두 멈췄습니다. 준비되면 이어서 진행하세요.",
      "계속하기 ↗",
      "SYSTEM PAUSED",
    );
  } else if (game.state === "paused") {
    resume(game);
    last = performance.now();
    $("overlay").hidden = true;
    $("arena").focus({ preventScroll: true });
  }
  render();
}
function autoPause() {
  if (game?.state === "playing") togglePause();
}
function finish() {
  if (finished) return;
  finished = true;
  const record = result(game, roundGroup ? "experiment" : "normal", roundGroup);
  data.best = Math.max(data.best, game.elapsed);
  data.rounds++;
  if (game.state === "win") data.wins++;
  data.records.push(record);
  data.records = data.records.slice(-200);
  persist();
  renderHistory();
  setOverlay(
    game.state === "win" ? "시스템을 지켰습니다!" : "다시, 한 칸 더.",
    `${game.elapsed.toFixed(1)}초 생존 · ${game.score}마리 회피 · ${record.reason}`,
    "다시 시작 ↗",
    game.state === "win" ? "MISSION COMPLETE" : "CONNECTION LOST",
  );
  if (!$("reduced").checked && !media.matches) {
    $("finish-effect").className = "finish-effect";
    void $("finish-effect").offsetWidth;
    $("finish-effect").className = `finish-effect fire ${game.state}`;
  }
  $("primary").focus({ preventScroll: true });
}
function render() {
  const state = game?.state;
  const text = labels[state] || "준비";
  if ($("state").textContent !== text) $("state").textContent = text;
  $("time").innerHTML =
    `${Math.max(0, 30 - (game?.elapsed || 0)).toFixed(1)}<small>s</small>`;
  $("score").textContent = String(game?.score || 0).padStart(2, "0");
  $("inputs").textContent = String(game?.inputs || 0).padStart(2, "0");
  $("active-speed").textContent =
    `SPEED ${(game?.speed || data.speed).toFixed(1)}×`;
  $("best").textContent = data.best.toFixed(1);
  $("best-bar").style.width = `${(data.best / 30) * 100}%`;
  $("wins").textContent = data.wins;
  $("rounds").textContent = data.rounds;
  $("pause").disabled = !["playing", "paused"].includes(state);
  $("pause").innerHTML =
    state === "paused" ? "계속하기 <kbd>P</kbd>" : "일시정지 <kbd>P</kbd>";
  $("left").disabled = $("right").disabled = state !== "playing";
  draw();
}
function draw() {
  const { width: w, height: h } = RULES;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#080f1c";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#14243a";
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = "#33536d";
  ctx.beginPath();
  ctx.moveTo(0, 491);
  ctx.lineTo(w, 491);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#263b4f";
  ctx.font = "9px monospace";
  ctx.fillText("DEFENSE LINE", 12, 486);
  for (const b of game?.bugs || []) {
    ctx.fillStyle = "#ee747b";
    ctx.beginPath();
    ctx.roundRect(b.x, b.y + 3, b.w, b.h - 3, 7);
    ctx.fill();
    ctx.strokeStyle = "#ee747b";
    ctx.lineWidth = 2;
    for (const dx of [-5, b.w + 5])
      for (const dy of [9, 18]) {
        ctx.beginPath();
        ctx.moveTo(b.x + (dx < 0 ? 0 : b.w), b.y + dy);
        ctx.lineTo(b.x + dx, b.y + dy - 3);
        ctx.stroke();
      }
    ctx.fillStyle = "#371c2f";
    ctx.fillRect(b.x + 7, b.y + 10, 5, 5);
    ctx.fillRect(b.x + 20, b.y + 10, 5, 5);
    ctx.fillRect(b.x + 12, b.y + 21, 8, 2);
  }
  const x = game?.x ?? 222,
    y = 450;
  ctx.fillStyle = "#182d48";
  ctx.beginPath();
  ctx.ellipse(x + 18, y + 35, 26, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#77baff";
  ctx.beginPath();
  ctx.roundRect(x, y, 36, 30, 6);
  ctx.fill();
  ctx.fillStyle = "#172b40";
  ctx.beginPath();
  ctx.roundRect(x + 4, y + 5, 28, 14, 3);
  ctx.fill();
  ctx.fillStyle = "#b2f1cb";
  ctx.fillRect(x + 9, y + 9, 5, 5);
  ctx.fillRect(x + 22, y + 9, 5, 5);
  ctx.fillStyle = "#b3d9ff";
  ctx.fillRect(x + 15, y + 23, 6, 3);
  ctx.fillRect(x + 16, y - 6, 4, 6);
  ctx.fillStyle = "#b2f1cb";
  ctx.fillRect(x + 14, y - 10, 8, 5);
  ctx.fillStyle = "#417cad";
  ctx.fillRect(x + 3, y + 30, 9, 4);
  ctx.fillRect(x + 24, y + 30, 9, 4);
  ctx.fillStyle = "#b2f1cb";
  ctx.fillRect(0, 0, w * (1 - (game?.elapsed || 0) / 30), 3);
}
const median = (values) => {
  const a = [...values].sort((a, b) => a - b);
  return a.length
    ? (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2
    : 0;
};
function renderHistory() {
  $("history").replaceChildren();
  for (const r of data.records.slice(-20).reverse()) {
    const row = document.createElement("tr");
    for (const value of [
      r.group || "일반",
      r.speed + "×",
      r.time.toFixed(1) + "초",
      r.score,
      r.reason,
    ]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    $("history").append(row);
  }
  const records = experimentRecords();
  const groups = ["A", "B"].map((group) =>
    records.filter((r) => r.group === group),
  );
  $("comparison").textContent = records.length
    ? groups
        .map(
          (rows, i) =>
            `${i ? "B 0.8×" : "A 1.0×"}: ${rows.length}/10판, 생존 중앙값 ${median(rows.map((r) => r.time)).toFixed(2)}초, 범위 ${rows.length ? Math.min(...rows.map((r) => r.time)).toFixed(2) : "0"}–${rows.length ? Math.max(...rows.map((r) => r.time)).toFixed(2) : "0"}초, 성공 ${rows.filter((r) => r.outcome === "win").length}회, 충돌 ${rows.filter((r) => r.outcome === "lose").length}회`,
        )
        .join(" / ")
    : "완료한 비교 기록이 없습니다. 사람이 실제로 플레이한 결과가 여기에 쌓입니다.";
}
$("primary").onclick = () =>
  game?.state === "paused" ? togglePause() : start();
$("restart").onclick = start;
$("pause").onclick = togglePause;
$("left").onclick = () => {
  if (game) move(game, -1);
  render();
};
$("right").onclick = () => {
  if (game) move(game, 1);
  render();
};
window.addEventListener("keydown", (e) => {
  if (
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    e.isComposing ||
    ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "SUMMARY", "A"].includes(
      e.target.tagName,
    ) ||
    e.target.isContentEditable
  )
    return;
  if (["ArrowLeft", "KeyA", "ArrowRight", "KeyD"].includes(e.code)) {
    if (game?.state === "playing") {
      e.preventDefault();
      move(game, ["ArrowLeft", "KeyA"].includes(e.code) ? -1 : 1);
      render();
    }
  }
  if (e.code === "KeyP" && !e.repeat) {
    e.preventDefault();
    togglePause();
  }
  if (e.code === "KeyR" && !e.repeat) {
    e.preventDefault();
    start();
  }
});
window.addEventListener("blur", autoPause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) autoPause();
});
$("speed").onchange = () => {
  data.speed = Number($("speed").value);
  persist();
  if (!game) render();
};
$("reduced").onchange = () => {
  data.reduced = $("reduced").checked;
  effects();
  persist();
};
media.addEventListener("change", effects);
$("finish-effect").addEventListener("animationend", () => {
  $("finish-effect").className = "finish-effect";
});
$("reset-data").onclick = () => {
  if (!confirm("최고 기록과 모든 플레이 기록·설정을 초기화할까요?")) return;
  data = defaults();
  game = null;
  experiment = false;
  roundGroup = null;
  $("speed").value = data.speed;
  $("reduced").checked = media.matches;
  $("judgment").value = "";
  $("exit-experiment").hidden = true;
  $("experiment-status").textContent = "기록을 초기화했습니다.";
  persist();
  effects();
  renderHistory();
  setOverlay(
    "준비되셨나요?",
    "최고 기록 0초, 현재 판과 저장 기록이 초기화되었습니다.",
    "게임 시작 ↗",
    "READY TO DEFEND",
  );
  render();
};
$("experiment").onclick = () => {
  if (experimentRecords().length === 20) {
    if (
      !confirm(
        "기존 비교 20판을 지우고 새 비교를 시작할까요? 먼저 JSON을 저장할 수 있습니다.",
      )
    )
      return;
    data.records = data.records.filter((r) => r.mode !== "experiment");
    persist();
    renderHistory();
  }
  experiment = true;
  $("exit-experiment").hidden = false;
  start();
};
$("exit-experiment").onclick = () => {
  experiment = false;
  $("exit-experiment").hidden = true;
  $("experiment-status").textContent =
    "일반 게임입니다. 비교 기록은 남아 있으며 다시 이어갈 수 있습니다.";
  start();
};
$("export").onclick = () => {
  const payload = {
    schema: "bug-dodger-play-records-v2",
    source: "browser-play",
    exportedAt: new Date().toISOString(),
    rules: RULES,
    records: data.records,
    comparison: $("comparison").textContent,
    studentJudgment: $("judgment").value,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "bug-dodger-play-records.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $("export-status").textContent =
    "JSON 다운로드를 요청했습니다. 브라우저의 다운로드 목록을 확인하세요.";
};
function frame(now) {
  const dt = last ? (now - last) / 1000 : 0;
  last = now;
  if (game?.state === "playing") {
    // A suspended or severely stalled frame is paused rather than fast-forwarded.
    if (dt > 0.5) {
      autoPause();
    } else {
      advance(game, dt);
      if (["win", "lose"].includes(game.state)) finish();
      render();
    }
  }
  requestAnimationFrame(frame);
}
effects();
renderHistory();
render();
requestAnimationFrame(frame);
