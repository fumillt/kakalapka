const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const scoreText = document.querySelector("#scoreText");
const sassText = document.querySelector("#sassText");
const missionText = document.querySelector("#missionText");
const toast = document.querySelector("#toast");
const startOverlay = document.querySelector("#startOverlay");
const winOverlay = document.querySelector("#winOverlay");
const winTitle = document.querySelector("#winTitle");
const winText = document.querySelector("#winText");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");
const touchButtons = document.querySelectorAll(".touch-button");
const telegram = window.Telegram?.WebApp;

function loadImage(src) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = src;
  return image;
}

const catSprites = {
  idle: loadImage(window.KAKALAPKA_IMAGES?.idle || "./assets/cat/portrait.jpeg"),
  run: loadImage(window.KAKALAPKA_IMAGES?.run || "./assets/cat/floor.jpeg"),
  jump: loadImage(window.KAKALAPKA_IMAGES?.jump || "./assets/cat/sink.jpeg"),
  victory: loadImage(window.KAKALAPKA_IMAGES?.victory || "./assets/cat/towel.jpeg"),
};

const objectSprites = {
  shoe: loadImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f45f.svg"),
  box: loadImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4e6.svg"),
  cabinet: loadImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f5c4.svg"),
  toilet: loadImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f6bd.svg"),
  bag: loadImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f6cd.svg"),
  bowl: loadImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f963.svg"),
  kettle: loadImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1fad6.svg"),
  pillow: loadImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f6cf.svg"),
  tv: loadImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4fa.svg"),
  couch: loadImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f6cb.svg"),
  clothes: loadImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f456.svg"),
  laptop: loadImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4bb.svg"),
  bathtub: loadImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f6c1.svg"),
};

for (const image of document.querySelectorAll("[data-kakalapka-image]")) {
  const key = image.dataset.kakalapkaImage;
  if (window.KAKALAPKA_IMAGES?.[key]) {
    image.src = window.KAKALAPKA_IMAGES[key];
  }
}

const WORLD = { width: 3300, height: 850, gravity: 2400 };
const FLOOR_Y = 665;

const keys = new Set();
const justPressed = new Set();
let running = false;
let won = false;
let lastTime = 0;
let toastTimer = 0;
let cameraX = 0;
let cameraY = 0;
let particles = [];
let stains = [];
let currentLevelIndex = 0;
let targets = [];

function syncAppHeight() {
  const height = telegram?.viewportHeight || window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${height}px`);
}

function initTelegram() {
  syncAppHeight();
  window.addEventListener("resize", syncAppHeight);

  if (!telegram) return;

  document.body.classList.add("telegram");
  telegram.ready();
  telegram.expand();
  telegram.disableVerticalSwipes?.();
  telegram.setHeaderColor?.("#15110f");
  telegram.setBackgroundColor?.("#15110f");
  telegram.onEvent?.("viewportChanged", syncAppHeight);
}

function haptic(kind = "light") {
  navigator.vibrate?.(kind === "action" ? 45 : 18);
  if (telegram?.HapticFeedback) {
    if (kind === "action") {
      telegram.HapticFeedback.impactOccurred("medium");
    } else {
      telegram.HapticFeedback.selectionChanged();
    }
  }
}

const player = {
  x: 110,
  y: 568,
  w: 78,
  h: 54,
  vx: 0,
  vy: 0,
  dir: 1,
  grounded: false,
  coyote: 0,
  jumpBuffer: 0,
  sass: 100,
  stateTime: 0,
};

const rooms = [
  { x: 0, w: 830, name: "прихожая", wall: "#aab8b4", trim: "#73675c" },
  { x: 830, w: 820, name: "ванная", wall: "#c4e5e2", trim: "#4aa5a5" },
  { x: 1650, w: 820, name: "кухня", wall: "#ead9bf", trim: "#c97958" },
  { x: 2470, w: 830, name: "комната", wall: "#b9adc8", trim: "#6c587b" },
];

const platforms = [
  { x: 0, y: FLOOR_Y, w: WORLD.width, h: 185, type: "floor" },
  { x: 96, y: 566, w: 230, h: 32, type: "shoe-rack" },
  { x: 410, y: 470, w: 220, h: 28, type: "shelf" },
  { x: 768, y: 590, w: 180, h: 26, type: "threshold" },
  { x: 930, y: 540, w: 190, h: 26, type: "bath-cabinet" },
  { x: 1210, y: 432, w: 210, h: 26, type: "toilet" },
  { x: 1510, y: 560, w: 185, h: 26, type: "hamper" },
  { x: 1740, y: 552, w: 250, h: 30, type: "counter" },
  { x: 2108, y: 456, w: 250, h: 28, type: "table" },
  { x: 2408, y: 592, w: 180, h: 26, type: "chair" },
  { x: 2640, y: 550, w: 350, h: 36, type: "sofa" },
  { x: 3048, y: 452, w: 180, h: 28, type: "tv-stand" },
];

const levels = [
  {
    title: "Уровень 1: весь дом мой",
    intro: "Какалапочка вышла на рейд",
    win: "Дом захвачен",
    targets: [
      { x: 250, y: 520, w: 48, h: 44, name: "тапок хозяина", icon: "shoe", marked: false },
      { x: 560, y: 420, w: 54, h: 48, name: "коробка у двери", icon: "box", marked: false },
      { x: 1032, y: 493, w: 62, h: 45, name: "бирюзовая тумба", icon: "cabinet", marked: false },
      { x: 1328, y: 360, w: 74, h: 62, name: "трон в ванной", icon: "toilet", marked: false },
      { x: 1582, y: 510, w: 66, h: 48, name: "пакет наполнителя", icon: "bag", marked: false },
      { x: 1868, y: 506, w: 48, h: 42, name: "миска с едой", icon: "bowl", marked: false },
      { x: 2248, y: 404, w: 64, h: 48, name: "чайник", icon: "kettle", marked: false },
      { x: 2764, y: 500, w: 70, h: 48, name: "диванная подушка", icon: "pillow", marked: false },
      { x: 3124, y: 392, w: 70, h: 56, name: "телевизор", icon: "tv", marked: false },
    ],
  },
  {
    title: "Уровень 2: все кроссовки в доме",
    intro: "Найди и пометь каждую пару кроссовок",
    win: "Кроссовочный террор завершен",
    targets: [
      { x: 148, y: 520, w: 52, h: 42, name: "черные кроссовки у входа", icon: "shoe", marked: false },
      { x: 254, y: 520, w: 52, h: 42, name: "белые кроссовки у входа", icon: "shoe", marked: false },
      { x: 454, y: 424, w: 52, h: 42, name: "кроссовки на полке", icon: "shoe", marked: false },
      { x: 792, y: 546, w: 52, h: 42, name: "кроссовки у порога ванной", icon: "shoe", marked: false },
      { x: 1010, y: 494, w: 52, h: 42, name: "кроссовки под тумбой", icon: "shoe", marked: false },
      { x: 1546, y: 514, w: 52, h: 42, name: "кроссовки возле наполнителя", icon: "shoe", marked: false },
      { x: 1788, y: 506, w: 52, h: 42, name: "кухонные беговые кроссовки", icon: "shoe", marked: false },
      { x: 2138, y: 410, w: 52, h: 42, name: "кроссовки на столе", icon: "shoe", marked: false },
      { x: 2450, y: 546, w: 52, h: 42, name: "кроссовки у стула", icon: "shoe", marked: false },
      { x: 2748, y: 504, w: 52, h: 42, name: "кроссовки на диване", icon: "shoe", marked: false },
      { x: 3104, y: 406, w: 52, h: 42, name: "кроссовки у телевизора", icon: "shoe", marked: false },
      { x: 3208, y: 616, w: 52, h: 42, name: "последние спрятанные кроссовки", icon: "shoe", marked: false },
    ],
  },
  {
    title: "Уровень 3: ванная без свидетелей",
    intro: "Ванная слишком чистая. Это подозрительно",
    win: "Ванная стала честной",
    targets: [
      { x: 960, y: 494, w: 64, h: 50, name: "полотенце", icon: "clothes", marked: false },
      { x: 1108, y: 494, w: 64, h: 50, name: "ванная тумба", icon: "cabinet", marked: false },
      { x: 1300, y: 364, w: 78, h: 62, name: "унитаз", icon: "toilet", marked: false },
      { x: 1468, y: 504, w: 70, h: 52, name: "ванна", icon: "bathtub", marked: false },
      { x: 1588, y: 510, w: 68, h: 50, name: "пакет наполнителя", icon: "bag", marked: false },
      { x: 1744, y: 506, w: 64, h: 50, name: "миска", icon: "bowl", marked: false },
    ],
  },
  {
    title: "Уровень 4: финал на диване",
    intro: "Финальный рейд: важные вещи хозяев",
    win: "Финальный хаос оформлен",
    targets: [
      { x: 1860, y: 506, w: 64, h: 50, name: "миска на кухне", icon: "bowl", marked: false },
      { x: 2212, y: 404, w: 70, h: 52, name: "чайник", icon: "kettle", marked: false },
      { x: 2458, y: 546, w: 64, h: 50, name: "ноутбук", icon: "laptop", marked: false },
      { x: 2708, y: 496, w: 76, h: 54, name: "диван", icon: "couch", marked: false },
      { x: 2868, y: 498, w: 70, h: 52, name: "подушка", icon: "pillow", marked: false },
      { x: 3108, y: 394, w: 78, h: 58, name: "телевизор", icon: "tv", marked: false },
      { x: 3208, y: 616, w: 56, h: 42, name: "последний кроссовок", icon: "shoe", marked: false },
    ],
  },
];

targets = levels[0].targets.map((target) => ({ ...target, marked: false }));
missionText.textContent = levels[0].title.toLowerCase();

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetGame(levelIndex = currentLevelIndex) {
  currentLevelIndex = clamp(levelIndex, 0, levels.length - 1);
  const level = levels[currentLevelIndex];
  targets = level.targets.map((target) => ({ ...target, marked: false }));
  player.x = 110;
  player.y = 568;
  player.vx = 0;
  player.vy = 0;
  player.dir = 1;
  player.grounded = false;
  player.coyote = 0;
  player.jumpBuffer = 0;
  player.sass = 100;
  player.stateTime = 0;
  cameraX = 0;
  cameraY = 0;
  particles = [];
  stains = [];
  won = false;
  running = true;
  winOverlay.classList.remove("is-visible");
  startOverlay.classList.remove("is-visible");
  telegram?.MainButton?.hide();
  missionText.textContent = level.title.toLowerCase();
  showToast(level.intro);
  updateHud();
}

function showToast(message, seconds = 1.4) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = seconds;
}

function updateHud() {
  const marked = targets.filter((target) => target.marked).length;
  scoreText.textContent = `${marked} / ${targets.length}`;
  sassText.textContent = `${Math.round(player.sass)}%`;
}

function markTarget(target) {
  if (!target || target.marked || player.sass < 8) return;

  target.marked = true;
  player.sass = clamp(player.sass - 7, 0, 100);
  stains.push({
    x: target.x + target.w / 2,
    y: target.y + target.h - 4,
    rx: target.w * 0.58,
    ry: 12,
    alpha: 0.86,
  });

  for (let i = 0; i < 20; i += 1) {
    particles.push({
      x: player.x + player.w * (player.dir > 0 ? 0.82 : 0.18),
      y: player.y + 34,
      vx: player.dir * (160 + Math.random() * 110) + (Math.random() - 0.5) * 60,
      vy: -130 - Math.random() * 80,
      life: 0.42 + Math.random() * 0.24,
      size: 2 + Math.random() * 3,
    });
  }

  showToast(`${target.name}: обоссано`);
  updateHud();

  const marked = targets.filter((item) => item.marked).length;
  if (marked === targets.length) {
    winGame();
  }
}

function winGame() {
  won = true;
  running = false;
  const level = levels[currentLevelIndex];
  const hasNext = currentLevelIndex < levels.length - 1;
  winTitle.textContent = level.win;
  winText.textContent = `${level.win}. Обоссано целей: ${targets.length}. Какалапочка торжественно делает вид, что ничего не произошло.`;
  restartButton.textContent = hasNext ? "Следующий уровень" : "Начать заново";
  if (telegram?.MainButton) {
    telegram.MainButton.setText(hasNext ? "Следующий уровень" : "Начать заново");
    telegram.MainButton.show();
  }
  setTimeout(() => winOverlay.classList.add("is-visible"), 400);
}

function getNearbyTarget() {
  const reach = {
    x: player.x - 24,
    y: player.y - 16,
    w: player.w + 48,
    h: player.h + 34,
  };
  return targets.find((target) => !target.marked && rectsOverlap(reach, target));
}

function updatePlayer(dt) {
  const left = keys.has("arrowleft") || keys.has("a") || keys.has("ф");
  const right = keys.has("arrowright") || keys.has("d") || keys.has("в");
  const jumpHeld = keys.has("arrowup") || keys.has("w") || keys.has("ц") || keys.has(" ");

  const accel = player.grounded ? 4200 : 2600;
  const maxSpeed = 390;
  const friction = player.grounded ? 3300 : 780;

  if (left) {
    player.vx -= accel * dt;
    player.dir = -1;
  }
  if (right) {
    player.vx += accel * dt;
    player.dir = 1;
  }
  if (!left && !right) {
    const slow = Math.min(Math.abs(player.vx), friction * dt);
    player.vx -= Math.sign(player.vx) * slow;
  }

  player.vx = clamp(player.vx, -maxSpeed, maxSpeed);
  player.vy += WORLD.gravity * dt;
  player.coyote -= dt;
  player.jumpBuffer -= dt;
  player.stateTime += dt;

  if (justPressed.has(" ") || justPressed.has("arrowup") || justPressed.has("w") || justPressed.has("ц")) {
    player.jumpBuffer = 0.12;
  }

  if (player.jumpBuffer > 0 && player.coyote > 0) {
    player.vy = -760;
    player.grounded = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
    showToast("мяв-прыжок", 0.55);
  }

  if (!jumpHeld && player.vy < -220) {
    player.vy = -220;
  }

  moveAndCollide(dt);

  if (justPressed.has("e") || justPressed.has("у")) {
    haptic("action");
    const target = getNearbyTarget();
    if (target) {
      markTarget(target);
    } else {
      showToast("подойди ближе и жми «Обоссать»", 0.95);
    }
  }

  player.sass = clamp(player.sass + dt * 2.4, 0, 100);
}

function moveAndCollide(dt) {
  player.x += player.vx * dt;
  player.x = clamp(player.x, 18, WORLD.width - player.w - 18);

  const horizontalBody = { x: player.x, y: player.y, w: player.w, h: player.h };
  for (const platform of platforms) {
    if (platform.type === "floor") continue;
    if (!rectsOverlap(horizontalBody, platform)) continue;
    if (player.vx > 0) player.x = platform.x - player.w;
    if (player.vx < 0) player.x = platform.x + platform.w;
    player.vx = 0;
  }

  player.y += player.vy * dt;
  player.grounded = false;
  const verticalBody = { x: player.x, y: player.y, w: player.w, h: player.h };

  for (const platform of platforms) {
    if (!rectsOverlap(verticalBody, platform)) continue;
    if (player.vy > 0) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.grounded = true;
      player.coyote = 0.1;
    } else if (player.vy < 0 && platform.type !== "floor") {
      player.y = platform.y + platform.h;
      player.vy = 0;
    }
    verticalBody.x = player.x;
    verticalBody.y = player.y;
  }

  if (player.y > WORLD.height + 120) {
    player.x = 110;
    player.y = 568;
    player.vx = 0;
    player.vy = 0;
    showToast("Какалапочка сделала вид, что так и надо");
  }
}

function updateParticles(dt) {
  particles = particles.filter((particle) => {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 700 * dt;
    return particle.life > 0;
  });
}

function update(dt) {
  if (!running) return;

  updatePlayer(dt);
  updateParticles(dt);

  const targetCameraX = clamp(player.x + player.w / 2 - canvas.width / 2, 0, WORLD.width - canvas.width);
  cameraX += (targetCameraX - cameraX) * Math.min(1, dt * 7.5);
  cameraY = 0;

  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) toast.classList.remove("is-visible");
  }

  const nearby = getNearbyTarget();
  if (nearby && toastTimer <= 0.05) {
    showToast(`Обоссать: ${nearby.name}`, 0.22);
  }

  updateHud();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-Math.round(cameraX), -Math.round(cameraY));

  drawWorld();
  drawStains();
  drawTargets();
  drawPlatforms();
  drawPlayer();
  drawParticles();

  ctx.restore();
  drawVignette();
}

function drawWorld() {
  for (const room of rooms) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
    gradient.addColorStop(0, room.wall);
    gradient.addColorStop(1, "#f7efe2");
    ctx.fillStyle = gradient;
    ctx.fillRect(room.x, 0, room.w, FLOOR_Y);

    ctx.fillStyle = room.trim;
    ctx.fillRect(room.x, FLOOR_Y - 30, room.w, 30);
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    for (let x = room.x + 80; x < room.x + room.w; x += 150) {
      ctx.fillRect(x, 88, 2, FLOOR_Y - 118);
    }

    ctx.fillStyle = "rgba(34, 26, 21, 0.55)";
    ctx.font = "700 26px system-ui, sans-serif";
    ctx.fillText(room.name, room.x + 34, 76);
  }

  ctx.fillStyle = "#d9c4a4";
  ctx.fillRect(0, FLOOR_Y, WORLD.width, WORLD.height - FLOOR_Y);
  ctx.strokeStyle = "rgba(91, 62, 42, 0.22)";
  ctx.lineWidth = 2;
  for (let x = 0; x < WORLD.width; x += 96) {
    ctx.beginPath();
    ctx.moveTo(x, FLOOR_Y);
    ctx.lineTo(x + 54, WORLD.height);
    ctx.stroke();
  }
}

function drawPlatforms() {
  for (const p of platforms) {
    if (p.type === "floor") continue;

    ctx.fillStyle = "#795642";
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = "#a77855";
    ctx.fillRect(p.x, p.y, p.w, 7);
    ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
    ctx.fillRect(p.x + 8, p.y + p.h, p.w - 16, 10);

    if (p.type === "toilet") {
      ctx.fillStyle = "#f6f4ed";
      roundRect(p.x + 50, p.y - 74, 96, 72, 22, true);
      ctx.strokeStyle = "#d6d2c8";
      ctx.lineWidth = 6;
      roundRect(p.x + 66, p.y - 46, 66, 28, 18, false, true);
    }
    if (p.type === "sofa") {
      ctx.fillStyle = "#7e6ba0";
      roundRect(p.x + 18, p.y - 42, p.w - 36, 52, 8, true);
      ctx.fillStyle = "#a590c0";
      roundRect(p.x + 44, p.y - 64, p.w - 88, 38, 8, true);
    }
  }
}

function drawTargets() {
  for (const target of targets) {
    ctx.save();
    ctx.globalAlpha = target.marked ? 0.42 : 1;
    const pulse = target.marked ? 0 : Math.sin(performance.now() / 170) * 2;
    const x = target.x;
    const y = target.y + pulse;

    ctx.fillStyle = target.marked ? "#7d6b52" : "#f4dfae";
    ctx.strokeStyle = target.marked ? "#4d3f31" : "#573b2e";
    ctx.lineWidth = 4;

    const sprite = objectSprites[target.icon];
    if (sprite?.complete && sprite.naturalWidth > 0) {
      ctx.fillStyle = target.marked ? "rgba(91, 73, 52, 0.66)" : "rgba(255, 248, 227, 0.86)";
      roundRect(x - 8, y - 8, target.w + 16, target.h + 16, 12, true, true);
      ctx.drawImage(sprite, x - 2, y - 2, target.w + 4, target.h + 4);
      if (!target.marked) {
        ctx.fillStyle = "#fff6d5";
        ctx.beginPath();
        ctx.arc(x + target.w / 2, y - 14, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      continue;
    }

    if (target.icon === "shoe") {
      roundRect(x, y + 16, target.w, 22, 10, true, true);
      ctx.fillStyle = "#3b3029";
      ctx.fillRect(x + 32, y + 28, 18, 6);
    } else if (target.icon === "box") {
      ctx.fillRect(x, y, target.w, target.h);
      ctx.strokeRect(x, y, target.w, target.h);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + target.w / 2, y + 16);
      ctx.lineTo(x + target.w, y);
      ctx.stroke();
    } else if (target.icon === "cabinet") {
      ctx.fillStyle = "#39aeb1";
      roundRect(x, y, target.w, target.h, 6, true, true);
      ctx.fillStyle = "#d8fff9";
      ctx.fillRect(x + 8, y + 10, target.w - 16, 5);
    } else if (target.icon === "toilet") {
      ctx.fillStyle = "#fbfaf6";
      roundRect(x, y + 12, target.w, 34, 18, true, true);
      ctx.strokeStyle = "#d4d1c8";
      roundRect(x + 10, y + 18, target.w - 20, 15, 10, false, true);
    } else if (target.icon === "bag") {
      ctx.fillStyle = "#907044";
      roundRect(x, y + 8, target.w, target.h, 8, true, true);
      ctx.fillStyle = "#2b8d55";
      ctx.fillRect(x + 6, y + 16, target.w - 12, 12);
    } else if (target.icon === "bowl") {
      ctx.fillStyle = "#e8545b";
      roundRect(x, y + 20, target.w, 18, 12, true, true);
      ctx.fillStyle = "#f1c870";
      ctx.fillRect(x + 9, y + 14, target.w - 18, 8);
    } else if (target.icon === "kettle") {
      ctx.fillStyle = "#cfd8dc";
      roundRect(x + 8, y + 10, target.w - 18, target.h - 8, 12, true, true);
      ctx.beginPath();
      ctx.arc(x + 16, y + 10, 18, Math.PI, Math.PI * 1.9);
      ctx.stroke();
    } else if (target.icon === "pillow") {
      ctx.fillStyle = "#f2b3a8";
      roundRect(x, y + 6, target.w, target.h, 14, true, true);
    } else if (target.icon === "tv") {
      ctx.fillStyle = "#17191d";
      roundRect(x, y, target.w, target.h, 5, true, true);
      ctx.fillStyle = "#263b46";
      ctx.fillRect(x + 8, y + 8, target.w - 16, target.h - 18);
    }

    if (!target.marked) {
      ctx.fillStyle = "#fff6d5";
      ctx.beginPath();
      ctx.arc(x + target.w / 2, y - 12, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawStains() {
  for (const stain of stains) {
    ctx.save();
    ctx.globalAlpha = stain.alpha;
    ctx.fillStyle = "#d7c45b";
    ctx.beginPath();
    ctx.ellipse(stain.x, stain.y, stain.rx, stain.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawImageCover(image, x, y, width, height) {
  const ratio = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / ratio;
  const sourceHeight = height / ratio;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawPlayer() {
  const t = player.stateTime;
  const speed = Math.abs(player.vx);
  const bob = player.grounded ? Math.sin(t * 16) * Math.min(speed / 180, 1) * 3 : 0;
  const x = player.x + player.w / 2;
  const y = player.y + player.h / 2 + bob;
  const dir = player.dir;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);

  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 34, 46, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  const sprite = !player.grounded ? catSprites.jump : speed > 80 ? catSprites.run : catSprites.idle;
  if (sprite?.complete && sprite.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(4, -2, 48, 43, -0.08, 0, Math.PI * 2);
    ctx.clip();
    drawImageCover(sprite, -50, -52, 100, 96);
    ctx.restore();

    ctx.strokeStyle = "#fff4dd";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(4, -2, 48, 43, -0.08, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#d8bd90";
    ctx.beginPath();
    ctx.ellipse(-4, 10, 45, 25, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b211f";
    ctx.beginPath();
    ctx.ellipse(32, -4, 25, 24, 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#3b261b";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-30, 18);
  ctx.quadraticCurveTo(-82, 4, -96, 26 + Math.sin(t * 6) * 9);
  ctx.stroke();

  ctx.fillStyle = "#fff7e9";
  ctx.beginPath();
  ctx.ellipse(-18 + Math.sin(t * 13) * 7, 41, 10, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(22 - Math.sin(t * 13) * 5, 41, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawParticles() {
  for (const particle of particles) {
    ctx.save();
    ctx.globalAlpha = clamp(particle.life * 2.1, 0, 1);
    ctx.fillStyle = "#f1dc55";
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawVignette() {
  const gradient = ctx.createRadialGradient(640, 360, 120, 640, 360, 760);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.26)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function roundRect(x, y, width, height, radius, fill, stroke = false) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
  lastTime = now;
  update(dt);
  draw();
  justPressed.clear();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", " ", "a", "d", "w", "e", "ф", "в", "ц", "у"].includes(key)) {
    event.preventDefault();
  }
  if (!keys.has(key)) justPressed.add(key);
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

startButton.addEventListener("click", () => resetGame(0));
restartButton.addEventListener("click", () => {
  const nextLevel = currentLevelIndex < levels.length - 1 ? currentLevelIndex + 1 : 0;
  resetGame(nextLevel);
});

if (telegram?.MainButton) {
  telegram.MainButton.onClick(() => {
    const nextLevel = currentLevelIndex < levels.length - 1 ? currentLevelIndex + 1 : 0;
    resetGame(nextLevel);
    telegram.MainButton.hide();
  });
}

for (const button of touchButtons) {
  const key = button.dataset.key;
  const press = (event) => {
    event.preventDefault();
    if (!keys.has(key)) justPressed.add(key);
    keys.add(key);
    haptic(key === "e" ? "action" : "light");
    button.classList.add("is-held");
    button.setPointerCapture?.(event.pointerId);
  };
  const release = (event) => {
    event.preventDefault();
    keys.delete(key);
    button.classList.remove("is-held");
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", () => {
    keys.delete(key);
    button.classList.remove("is-held");
  });
}

document.addEventListener("contextmenu", (event) => event.preventDefault());

initTelegram();
updateHud();
requestAnimationFrame(loop);
