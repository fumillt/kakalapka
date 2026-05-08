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
const markButton = document.querySelector(".touch-button.mark");
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
  bed: loadImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f6cf.svg"),
  water: loadImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f963.svg"),
  vet: loadImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f3e5.svg"),
};

for (const image of document.querySelectorAll("[data-kakalapka-image]")) {
  const key = image.dataset.kakalapkaImage;
  if (window.KAKALAPKA_IMAGES?.[key]) {
    image.src = window.KAKALAPKA_IMAGES[key];
  }
}

const WORLD = { width: 3300, height: 850, gravity: 2400 };
const VIEW_HEIGHT = 720;
const FLOOR_Y = 665;

const keys = new Set();
const justPressed = new Set();
let running = false;
let won = false;
let lastTime = 0;
let cameraX = 0;
let cameraY = 0;
let particles = [];
let stains = [];
let waterStations = [];
let currentLevelIndex = 0;
let targets = [];
let actionMode = "pee";
let renderScale = 1;
let viewportWorldWidth = 1280;

function resizeCanvasToDisplay() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  renderScale = canvas.height / VIEW_HEIGHT;
  viewportWorldWidth = canvas.width / renderScale;
}

function syncAppHeight() {
  const height = telegram?.viewportHeight || window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${height}px`);
  resizeCanvasToDisplay();
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

const defaultRooms = [
  { x: 0, w: 830, name: "прихожая", wall: "#aab8b4", trim: "#73675c" },
  { x: 830, w: 820, name: "ванная", wall: "#c4e5e2", trim: "#4aa5a5" },
  { x: 1650, w: 820, name: "кухня", wall: "#ead9bf", trim: "#c97958" },
  { x: 2470, w: 830, name: "комната", wall: "#b9adc8", trim: "#6c587b" },
];

const defaultPlatforms = [
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

let rooms = defaultRooms.map((room) => ({ ...room }));
let platforms = defaultPlatforms.map((platform) => ({ ...platform }));

const levels = [
  {
    title: "Уровень 1: домашний рейд",
    intro: "Какалапочка вышла на рейд",
    win: "Дом захвачен",
    playerStart: { x: 110, y: FLOOR_Y - 54 },
    rooms: defaultRooms,
    platforms: defaultPlatforms,
    waterStations: [{ x: 142, y: FLOOR_Y - 46, w: 58, h: 38, name: "миска с водой" }],
    targets: [
      { x: 260, y: 520, w: 52, h: 42, name: "тапок хозяина", icon: "shoe", marked: false },
      { x: 560, y: 420, w: 54, h: 48, name: "коробка у двери", icon: "box", marked: false },
      { x: 1032, y: 493, w: 62, h: 45, name: "бирюзовая тумба", icon: "cabinet", marked: false },
      { x: 1328, y: 360, w: 74, h: 62, name: "трон в ванной", icon: "toilet", marked: false },
      { x: 1600, y: 510, w: 66, h: 48, name: "пакет наполнителя", icon: "bag", marked: false },
      { x: 1880, y: 506, w: 48, h: 42, name: "миска с едой", icon: "bowl", marked: false },
      { x: 2248, y: 404, w: 64, h: 48, name: "чайник", icon: "kettle", marked: false },
      { x: 2784, y: 500, w: 70, h: 48, name: "диванная подушка", icon: "pillow", marked: false },
      { x: 3140, y: 392, w: 70, h: 56, name: "телевизор", icon: "tv", marked: false },
    ],
  },
  {
    title: "Уровень 2: все кроссовки в доме",
    intro: "Найди и пометь каждую пару кроссовок",
    win: "Кроссовочный террор завершен",
    playerStart: { x: 110, y: FLOOR_Y - 54 },
    rooms: defaultRooms,
    platforms: defaultPlatforms,
    waterStations: [{ x: 1880, y: 506, w: 58, h: 38, name: "миска с водой" }],
    targets: [
      { x: 250, y: 520, w: 52, h: 42, name: "кроссовки у входа", icon: "shoe", marked: false },
      { x: 500, y: 424, w: 52, h: 42, name: "кроссовки на полке", icon: "shoe", marked: false },
      { x: 842, y: 546, w: 52, h: 42, name: "кроссовки у ванной", icon: "shoe", marked: false },
      { x: 1058, y: 494, w: 52, h: 42, name: "кроссовки под тумбой", icon: "shoe", marked: false },
      { x: 1578, y: 514, w: 52, h: 42, name: "кроссовки возле наполнителя", icon: "shoe", marked: false },
      { x: 2188, y: 410, w: 52, h: 42, name: "кроссовки на столе", icon: "shoe", marked: false },
      { x: 2470, y: 546, w: 52, h: 42, name: "кроссовки у стула", icon: "shoe", marked: false },
      { x: 2800, y: 504, w: 52, h: 42, name: "кроссовки на диване", icon: "shoe", marked: false },
      { x: 3140, y: 406, w: 52, h: 42, name: "кроссовки у телевизора", icon: "shoe", marked: false },
    ],
  },
  {
    title: "Уровень 3: ковры и кровати",
    intro: "Мягкое должно стать подозрительным",
    win: "Спальня потеряла невинность",
    playerStart: { x: 110, y: FLOOR_Y - 54 },
    rooms: [
      { x: 0, w: 830, name: "коридор", wall: "#b7c6bf", trim: "#6d6a5d" },
      { x: 830, w: 820, name: "спальня", wall: "#d2c2da", trim: "#71547e" },
      { x: 1650, w: 820, name: "гостиная", wall: "#d8c4b3", trim: "#9a6858" },
      { x: 2470, w: 830, name: "лежанка", wall: "#c4d0dc", trim: "#5d7088" },
    ],
    platforms: [
      { x: 0, y: FLOOR_Y, w: WORLD.width, h: 185, type: "floor" },
      { x: 160, y: 568, w: 250, h: 30, type: "rug" },
      { x: 560, y: 500, w: 260, h: 30, type: "bed" },
      { x: 980, y: 432, w: 260, h: 28, type: "bed" },
      { x: 1380, y: 530, w: 230, h: 28, type: "shelf" },
      { x: 1780, y: 470, w: 270, h: 30, type: "sofa" },
      { x: 2200, y: 560, w: 230, h: 28, type: "rug" },
      { x: 2620, y: 490, w: 260, h: 30, type: "bed" },
      { x: 3000, y: 420, w: 220, h: 28, type: "shelf" },
    ],
    waterStations: [{ x: 1460, y: 486, w: 58, h: 38, name: "миска с водой" }],
    targets: [
      { x: 230, y: 520, w: 76, h: 48, name: "коврик у двери", icon: "pillow", marked: false },
      { x: 640, y: 448, w: 78, h: 54, name: "кровать хозяев", icon: "bed", marked: false },
      { x: 1070, y: 380, w: 78, h: 54, name: "подушка на кровати", icon: "pillow", marked: false },
      { x: 1440, y: 478, w: 70, h: 50, name: "плед", icon: "clothes", marked: false },
      { x: 1860, y: 418, w: 82, h: 54, name: "диван", icon: "couch", marked: false },
      { x: 2280, y: 512, w: 76, h: 48, name: "ковер в гостиной", icon: "pillow", marked: false },
      { x: 2710, y: 438, w: 78, h: 54, name: "гостевая кровать", icon: "bed", marked: false },
      { x: 3060, y: 368, w: 70, h: 50, name: "последняя подушка", icon: "pillow", marked: false },
    ],
  },
];

const vetLevel = {
  title: "Финал: ветеринар",
  intro: "Какалапочка попала к ветеринару. Рейд окончен",
  win: "Ветеринар озадачен",
  isFinal: true,
  playerStart: { x: 170, y: FLOOR_Y - 54 },
  rooms: [
    { x: 0, w: 1100, name: "приёмная", wall: "#d8e4df", trim: "#6e8c82" },
    { x: 1100, w: 1100, name: "кабинет", wall: "#d6e4ec", trim: "#5c7d92" },
    { x: 2200, w: 1100, name: "стол осмотра", wall: "#e7ded2", trim: "#8d765c" },
  ],
  platforms: [
    { x: 0, y: FLOOR_Y, w: WORLD.width, h: 185, type: "floor" },
    { x: 520, y: 560, w: 260, h: 30, type: "table" },
    { x: 1120, y: 500, w: 320, h: 30, type: "counter" },
    { x: 1780, y: 455, w: 300, h: 30, type: "table" },
    { x: 2420, y: 525, w: 360, h: 30, type: "vet" },
  ],
  waterStations: [],
  targets: [
    { x: 620, y: 506, w: 72, h: 52, name: "переноска", icon: "box", marked: false },
    { x: 1240, y: 446, w: 72, h: 52, name: "шкафчик с лекарствами", icon: "cabinet", marked: false },
    { x: 1880, y: 402, w: 72, h: 52, name: "ноутбук ветеринара", icon: "laptop", marked: false },
    { x: 2530, y: 472, w: 78, h: 56, name: "стол осмотра", icon: "vet", marked: false },
  ],
};

function getLevel(index) {
  return levels[index] || vetLevel;
}

targets = getLevel(0).targets.map((target) => ({ ...target, marked: false }));
missionText.textContent = getLevel(0).title.toLowerCase();

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetGame(levelIndex = currentLevelIndex) {
  currentLevelIndex = Math.max(0, levelIndex);
  const level = getLevel(currentLevelIndex);
  rooms = (level.rooms || defaultRooms).map((room) => ({ ...room }));
  platforms = (level.platforms || defaultPlatforms).map((platform) => ({ ...platform }));
  targets = level.targets.map((target) => ({ ...target, marked: false }));
  waterStations = (level.waterStations || []).map((station) => ({ ...station }));
  player.x = level.playerStart?.x ?? 110;
  player.y = level.playerStart?.y ?? FLOOR_Y - player.h;
  player.vx = 0;
  player.vy = 0;
  player.dir = 1;
  player.grounded = false;
  player.coyote = 0;
  player.jumpBuffer = 0;
  player.sass = level.isFinal ? 100 : 65;
  player.stateTime = 0;
  cameraX = 0;
  cameraY = 0;
  particles = [];
  stains = [];
  won = false;
  running = true;
  document.querySelector(".game-wrap")?.classList.add("is-playing");
  document.querySelector(".shell")?.classList.add("is-playing");
  winOverlay.classList.remove("is-visible");
  startOverlay.classList.remove("is-visible");
  telegram?.MainButton?.hide();
  missionText.textContent = level.title.toLowerCase();
  setStatus(level.intro);
  updateHud();
}

function setStatus(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
}

function updateHud() {
  const marked = targets.filter((target) => target.marked).length;
  scoreText.textContent = `${marked} / ${targets.length}`;
  sassText.textContent = `${Math.round(player.sass)}%`;
}

function markTarget(target) {
  if (!target || target.marked || player.sass < 12) {
    setStatus("Мочи не хватает. Найди миску с водой");
    return;
  }

  target.marked = true;
  player.sass = clamp(player.sass - 12, 0, 100);
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

  setStatus(`${target.name}: обоссано`);
  updateHud();

  const marked = targets.filter((item) => item.marked).length;
  if (marked === targets.length) {
    winGame();
  }
}

function emptyPee() {
  if (player.sass < 6) {
    setStatus("Пустой бак. Нужно попить воды");
    return;
  }
  player.sass = clamp(player.sass - 6, 0, 100);
  stains.push({
    x: player.x + player.w / 2,
    y: player.y + player.h + 4,
    rx: 42,
    ry: 10,
    alpha: 0.72,
  });
  for (let i = 0; i < 10; i += 1) {
    particles.push({
      x: player.x + player.w / 2,
      y: player.y + 38,
      vx: (Math.random() - 0.5) * 120,
      vy: -60 - Math.random() * 80,
      life: 0.25 + Math.random() * 0.18,
      size: 2 + Math.random() * 2,
    });
  }
  setStatus("Какалапочка сделала лужу просто так");
  updateHud();
}

function drinkWater(station) {
  player.sass = clamp(player.sass + 35, 0, 100);
  setStatus(`${station.name}: бак пополнен`);
  updateHud();
}

function winGame() {
  won = true;
  running = false;
  document.querySelector(".game-wrap")?.classList.remove("is-playing");
  document.querySelector(".shell")?.classList.remove("is-playing");
  const level = getLevel(currentLevelIndex);
  winTitle.textContent = level.win;
  winText.textContent = `${level.win}. Обоссано целей: ${targets.length}. Какалапочка торжественно делает вид, что ничего не произошло.`;
  restartButton.textContent = "Следующий уровень";
  if (telegram?.MainButton) {
    telegram.MainButton.setText("Следующий уровень");
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

function getNearbyWater() {
  const reach = {
    x: player.x - 26,
    y: player.y - 14,
    w: player.w + 52,
    h: player.h + 32,
  };
  return waterStations.find((station) => rectsOverlap(reach, station));
}

function updateActionState() {
  const water = getNearbyWater();
  const target = getNearbyTarget();
  actionMode = water ? "drink" : "pee";
  if (markButton) {
    markButton.textContent = water ? "Пить" : "Обоссать";
    markButton.setAttribute("aria-label", water ? "Пить воду" : "Обоссать предмет");
    markButton.classList.toggle("is-drink", Boolean(water));
  }
  if (water) {
    setStatus(`Пить: ${water.name}`);
  } else if (target) {
    setStatus(`Обоссать: ${target.name}`);
  } else {
    setStatus("Можно обоссать предмет или сделать лужу");
  }
}

function useAction() {
  const water = getNearbyWater();
  if (water) {
    drinkWater(water);
    return;
  }
  const target = getNearbyTarget();
  if (target) {
    markTarget(target);
  } else {
    emptyPee();
  }
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
    setStatus("мяв-прыжок");
  }

  if (!jumpHeld && player.vy < -220) {
    player.vy = -220;
  }

  moveAndCollide(dt);

  if (justPressed.has("e") || justPressed.has("у")) {
    haptic("action");
    useAction();
  }
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
    const level = getLevel(currentLevelIndex);
    player.x = level.playerStart?.x ?? 110;
    player.y = level.playerStart?.y ?? FLOOR_Y - player.h;
    player.vx = 0;
    player.vy = 0;
    setStatus("Какалапочка сделала вид, что так и надо");
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

  resizeCanvasToDisplay();
  const targetCameraX = clamp(
    player.x + player.w / 2 - viewportWorldWidth / 2,
    0,
    WORLD.width - viewportWorldWidth,
  );
  cameraX += (targetCameraX - cameraX) * Math.min(1, dt * 7.5);
  cameraY = 0;

  updateActionState();
  updateHud();
}

function draw() {
  resizeCanvasToDisplay();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(renderScale, renderScale);
  ctx.translate(-Math.round(cameraX), -Math.round(cameraY));

  drawWorld();
  drawStains();
  drawWaterStations();
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

function drawWaterStations() {
  for (const station of waterStations) {
    ctx.save();
    const sprite = objectSprites.water;
    ctx.fillStyle = "rgba(147, 219, 255, 0.86)";
    roundRect(station.x - 8, station.y - 8, station.w + 16, station.h + 16, 12, true, true);
    if (sprite?.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, station.x, station.y - 4, station.w, station.h + 8);
    } else {
      ctx.fillStyle = "#65c9ff";
      ctx.beginPath();
      ctx.ellipse(station.x + station.w / 2, station.y + station.h / 2, station.w / 2, station.h / 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#d9f6ff";
    ctx.beginPath();
    ctx.arc(station.x + station.w / 2, station.y - 13, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
    if (p.type === "rug") {
      ctx.fillStyle = "#b85d66";
      roundRect(p.x + 14, p.y - 10, p.w - 28, 18, 9, true);
    }
    if (p.type === "bed") {
      ctx.fillStyle = "#e6d8c8";
      roundRect(p.x + 12, p.y - 38, p.w - 24, 42, 8, true);
      ctx.fillStyle = "#9eb7cf";
      roundRect(p.x + 26, p.y - 32, 58, 25, 8, true);
    }
    if (p.type === "vet") {
      ctx.fillStyle = "#dce7ea";
      roundRect(p.x + 20, p.y - 34, p.w - 40, 38, 8, true);
      ctx.fillStyle = "#77a7b4";
      ctx.fillRect(p.x + 54, p.y - 50, p.w - 108, 18);
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

  ctx.strokeStyle = "#3b261b";
  ctx.lineWidth = 13;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-32, 12);
  ctx.quadraticCurveTo(-84, -2, -96, 24 + Math.sin(t * 6) * 9);
  ctx.stroke();

  ctx.fillStyle = "#d8bd90";
  ctx.beginPath();
  ctx.ellipse(-4, 10, 45, 25, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#c6a574";
  ctx.beginPath();
  ctx.ellipse(22, -1, 31, 26, 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2a1f1d";
  ctx.beginPath();
  ctx.moveTo(5, -22);
  ctx.lineTo(15, -53);
  ctx.lineTo(26, -20);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(35, -22);
  ctx.lineTo(47, -51);
  ctx.lineTo(54, -17);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#2b211f";
  ctx.beginPath();
  ctx.ellipse(32, -4, 25, 24, 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d9eff2";
  ctx.beginPath();
  ctx.ellipse(23, -8, 5, 8, 0.12, 0, Math.PI * 2);
  ctx.ellipse(42, -8, 5, 8, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#30464b";
  ctx.beginPath();
  ctx.ellipse(24, -8, 2, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(41, -8, 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#eee8db";
  ctx.lineWidth = 1.4;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(34, 1);
    ctx.lineTo(68, -6 + side * 8);
    ctx.moveTo(34, 4);
    ctx.lineTo(70, 4 + side * 9);
    ctx.stroke();
  }

  ctx.strokeStyle = "#4c3429";
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(-14, 28);
  ctx.lineTo(-14 + Math.sin(t * 13) * 7, 42);
  ctx.moveTo(22, 27);
  ctx.lineTo(22 - Math.sin(t * 13) * 5, 42);
  ctx.stroke();

  ctx.fillStyle = "#fff7e9";
  ctx.beginPath();
  ctx.ellipse(-15 + Math.sin(t * 13) * 7, 43, 10, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(22 - Math.sin(t * 13) * 5, 43, 10, 5, 0, 0, Math.PI * 2);
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
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.max(canvas.width, canvas.height) * 0.62;
  const gradient = ctx.createRadialGradient(cx, cy, 120, cx, cy, radius);
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
  resetGame(currentLevelIndex + 1);
});

if (telegram?.MainButton) {
  telegram.MainButton.onClick(() => {
    resetGame(currentLevelIndex + 1);
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
