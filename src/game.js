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
const jumpButton = document.querySelector(".touch-button.jump");
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
  carrier: loadImage("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f9fa.svg"),
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
let furniture = [];
let curtains = [];
let carrier = null;
let finale = null;
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
  jumpsLeft: 2,
  onCurtain: null,
  sass: 100,
  stateTime: 0,
  locked: false,
};

const defaultRooms = [
  { x: 0, w: 830, name: "прихожая", wall: "#aab8b4", trim: "#73675c" },
  { x: 830, w: 820, name: "ванная", wall: "#c4e5e2", trim: "#4aa5a5" },
  { x: 1650, w: 820, name: "кухня", wall: "#ead9bf", trim: "#c97958" },
  { x: 2470, w: 830, name: "комната", wall: "#b9adc8", trim: "#6c587b" },
];

const defaultPlatforms = [
  { x: 0, y: FLOOR_Y, w: WORLD.width, h: 185, type: "floor" },
  { x: 540, y: 495, w: 260, h: 26, type: "shelf" },
  { x: 1190, y: 455, w: 230, h: 26, type: "shelf" },
  { x: 2140, y: 485, w: 270, h: 26, type: "shelf" },
];

const defaultFurniture = [
  { x: 820, y: FLOOR_Y - 68, w: 310, h: 68, type: "sofa" },
  { x: 1680, y: FLOOR_Y - 92, w: 260, h: 92, type: "counter" },
  { x: 2590, y: FLOOR_Y - 74, w: 360, h: 74, type: "bed" },
  { x: 3060, y: FLOOR_Y - 118, w: 120, h: 118, type: "tv" },
];

const defaultCurtains = [
  { x: 1480, y: 92, w: 95, h: FLOOR_Y - 92, name: "штора в ванной" },
  { x: 2860, y: 92, w: 105, h: FLOOR_Y - 92, name: "штора у окна" },
];

let rooms = defaultRooms.map((room) => ({ ...room }));
let platforms = defaultPlatforms.map((platform) => ({ ...platform }));

const levels = [
  {
    title: "Уровень 1: прихожая и ванная",
    intro: "Рейд начался. Попей воды перед домашним хаосом",
    win: "Первый домовой обход завершен",
    playerStart: { x: 110, y: FLOOR_Y - 54 },
    rooms: defaultRooms,
    platforms: [
      { x: 0, y: FLOOR_Y, w: WORLD.width, h: 185, type: "floor" },
      { x: 620, y: 500, w: 250, h: 26, type: "shelf" },
      { x: 1410, y: 440, w: 260, h: 26, type: "shelf" },
      { x: 2420, y: 482, w: 270, h: 26, type: "shelf" },
    ],
    furniture: [
      { x: 520, y: FLOOR_Y - 52, w: 220, h: 52, type: "shoe-rack" },
      { x: 900, y: FLOOR_Y - 72, w: 330, h: 72, type: "sofa" },
      { x: 1760, y: FLOOR_Y - 95, w: 280, h: 95, type: "counter" },
      { x: 2860, y: FLOOR_Y - 112, w: 130, h: 112, type: "tv" },
    ],
    curtains: [
      { x: 1320, y: 92, w: 105, h: FLOOR_Y - 92, name: "мокрая штора" },
      { x: 2700, y: 92, w: 105, h: FLOOR_Y - 92, name: "штора у окна" },
    ],
    waterStations: [{ x: 220, y: FLOOR_Y - 46, w: 58, h: 38, name: "миска с водой" }],
    targets: [
      { x: 340, y: FLOOR_Y - 46, w: 54, h: 42, name: "миска с едой", icon: "bowl", marked: false },
      { x: 520, y: FLOOR_Y - 46, w: 54, h: 42, name: "тапок хозяина", icon: "shoe", marked: false },
      { x: 780, y: 452, w: 56, h: 46, name: "ключи на полке", icon: "box", marked: false },
      { x: 1040, y: FLOOR_Y - 48, w: 76, h: 48, name: "диванная подушка", icon: "pillow", marked: false },
      { x: 1500, y: 390, w: 70, h: 52, name: "банка на высокой полке", icon: "cabinet", marked: false },
      { x: 1910, y: FLOOR_Y - 56, w: 72, h: 54, name: "пакет наполнителя", icon: "bag", marked: false },
      { x: 2520, y: 435, w: 68, h: 48, name: "чайник на полке", icon: "kettle", marked: false },
      { x: 2900, y: FLOOR_Y - 58, w: 74, h: 56, name: "телевизор", icon: "tv", marked: false },
    ],
  },
  {
    title: "Уровень 2: все кроссовки в доме",
    intro: "Кроссовки расставлены слишком самоуверенно",
    win: "Кроссовочный террор завершен",
    playerStart: { x: 110, y: FLOOR_Y - 54 },
    rooms: [
      { x: 0, w: 830, name: "прихожая", wall: "#b1beb8", trim: "#71665b" },
      { x: 830, w: 820, name: "гардероб", wall: "#d8cec0", trim: "#806550" },
      { x: 1650, w: 820, name: "кухня", wall: "#ead9bf", trim: "#c97958" },
      { x: 2470, w: 830, name: "комната", wall: "#b9adc8", trim: "#6c587b" },
    ],
    platforms: [
      { x: 0, y: FLOOR_Y, w: WORLD.width, h: 185, type: "floor" },
      { x: 760, y: 492, w: 270, h: 26, type: "shelf" },
      { x: 1540, y: 448, w: 240, h: 26, type: "shelf" },
      { x: 2300, y: 498, w: 300, h: 26, type: "shelf" },
    ],
    furniture: [
      { x: 520, y: FLOOR_Y - 58, w: 260, h: 58, type: "shoe-rack" },
      { x: 1080, y: FLOOR_Y - 90, w: 260, h: 90, type: "cabinet" },
      { x: 1880, y: FLOOR_Y - 70, w: 320, h: 70, type: "sofa" },
      { x: 2760, y: FLOOR_Y - 74, w: 340, h: 74, type: "bed" },
    ],
    curtains: [
      { x: 1440, y: 92, w: 100, h: FLOOR_Y - 92, name: "гардеробная штора" },
      { x: 2580, y: 92, w: 105, h: FLOOR_Y - 92, name: "фиолетовая штора" },
    ],
    waterStations: [{ x: 220, y: FLOOR_Y - 46, w: 58, h: 38, name: "миска с водой" }],
    targets: [
      { x: 340, y: FLOOR_Y - 46, w: 54, h: 42, name: "миска с едой", icon: "bowl", marked: false },
      { x: 470, y: FLOOR_Y - 46, w: 54, h: 42, name: "кроссовки у входа", icon: "shoe", marked: false },
      { x: 650, y: FLOOR_Y - 46, w: 54, h: 42, name: "кроссовки под лавкой", icon: "shoe", marked: false },
      { x: 880, y: 444, w: 54, h: 42, name: "кроссовки на полке", icon: "shoe", marked: false },
      { x: 1220, y: FLOOR_Y - 46, w: 54, h: 42, name: "кроссовки у шкафа", icon: "shoe", marked: false },
      { x: 1660, y: 400, w: 54, h: 42, name: "кроссовки наверху", icon: "shoe", marked: false },
      { x: 2040, y: FLOOR_Y - 46, w: 54, h: 42, name: "кроссовки у дивана", icon: "shoe", marked: false },
      { x: 2430, y: 450, w: 54, h: 42, name: "кроссовки на дальней полке", icon: "shoe", marked: false },
      { x: 2910, y: FLOOR_Y - 46, w: 54, h: 42, name: "кроссовки под кроватью", icon: "shoe", marked: false },
    ],
  },
  {
    title: "Уровень 3: спальня и переноска",
    intro: "Финальный домашний рейд. Переноска пока закрыта для легенд",
    win: "Какалапочку поймали",
    playerStart: { x: 110, y: FLOOR_Y - 54 },
    rooms: [
      { x: 0, w: 830, name: "коридор", wall: "#b7c6bf", trim: "#6d6a5d" },
      { x: 830, w: 820, name: "спальня", wall: "#d2c2da", trim: "#71547e" },
      { x: 1650, w: 820, name: "гостиная", wall: "#d8c4b3", trim: "#9a6858" },
      { x: 2470, w: 830, name: "лежанка", wall: "#c4d0dc", trim: "#5d7088" },
    ],
    platforms: [
      { x: 0, y: FLOOR_Y, w: WORLD.width, h: 185, type: "floor" },
      { x: 900, y: 485, w: 260, h: 26, type: "shelf" },
      { x: 1740, y: 445, w: 260, h: 26, type: "shelf" },
      { x: 2600, y: 496, w: 260, h: 26, type: "shelf" },
    ],
    furniture: [
      { x: 330, y: FLOOR_Y - 42, w: 330, h: 42, type: "rug" },
      { x: 690, y: FLOOR_Y - 86, w: 410, h: 86, type: "bed" },
      { x: 1350, y: FLOOR_Y - 72, w: 360, h: 72, type: "sofa" },
      { x: 2170, y: FLOOR_Y - 44, w: 340, h: 44, type: "rug" },
      { x: 2900, y: FLOOR_Y - 88, w: 220, h: 88, type: "cabinet" },
    ],
    curtains: [
      { x: 1210, y: 92, w: 105, h: FLOOR_Y - 92, name: "спальная штора" },
      { x: 2520, y: 92, w: 105, h: FLOOR_Y - 92, name: "штора у лежанки" },
    ],
    waterStations: [{ x: 220, y: FLOOR_Y - 46, w: 58, h: 38, name: "миска с водой" }],
    carrier: { x: 3100, y: FLOOR_Y - 76, w: 112, h: 76, name: "переноска" },
    targets: [
      { x: 340, y: FLOOR_Y - 46, w: 54, h: 42, name: "миска с едой", icon: "bowl", marked: false },
      { x: 420, y: FLOOR_Y - 50, w: 82, h: 48, name: "коврик у двери", icon: "pillow", marked: false },
      { x: 850, y: FLOOR_Y - 54, w: 82, h: 54, name: "кровать хозяев", icon: "bed", marked: false },
      { x: 1000, y: 432, w: 72, h: 50, name: "подушка на полке", icon: "pillow", marked: false },
      { x: 1500, y: FLOOR_Y - 52, w: 82, h: 52, name: "диван", icon: "couch", marked: false },
      { x: 1860, y: 392, w: 72, h: 50, name: "плед наверху", icon: "clothes", marked: false },
      { x: 2310, y: FLOOR_Y - 50, w: 82, h: 48, name: "ковер в гостиной", icon: "pillow", marked: false },
      { x: 2700, y: 444, w: 72, h: 50, name: "последняя подушка", icon: "pillow", marked: false },
    ],
  },
];

function getLevel(index) {
  return levels[clamp(index, 0, levels.length - 1)];
}

targets = getLevel(0).targets.map((target) => ({ ...target, marked: false }));
missionText.textContent = getLevel(0).title.toLowerCase();

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isLastLevel() {
  return currentLevelIndex === levels.length - 1;
}

function allTargetsMarked() {
  return targets.length > 0 && targets.every((target) => target.marked);
}

function resetGame(levelIndex = currentLevelIndex) {
  currentLevelIndex = clamp(levelIndex, 0, levels.length - 1);
  const level = getLevel(currentLevelIndex);
  rooms = (level.rooms || defaultRooms).map((room) => ({ ...room }));
  platforms = (level.platforms || defaultPlatforms).map((platform) => ({ ...platform }));
  targets = level.targets.map((target) => ({ ...target, marked: false }));
  waterStations = (level.waterStations || []).map((station) => ({ ...station }));
  furniture = (level.furniture || defaultFurniture).map((item) => ({ ...item }));
  curtains = (level.curtains || defaultCurtains).map((curtain) => ({ ...curtain }));
  carrier = level.carrier ? { ...level.carrier, open: false, caught: false } : null;
  finale = null;
  player.x = level.playerStart?.x ?? 110;
  player.y = level.playerStart?.y ?? FLOOR_Y - player.h;
  player.vx = 0;
  player.vy = 0;
  player.dir = 1;
  player.grounded = false;
  player.coyote = 0;
  player.jumpBuffer = 0;
  player.jumpsLeft = 2;
  player.onCurtain = null;
  player.sass = 50;
  player.stateTime = 0;
  player.locked = false;
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
  if (!target || target.marked || player.sass < 8) {
    setStatus("Мочи не хватает. Экономь рейдовый ресурс");
    return;
  }

  target.marked = true;
  player.sass = clamp(player.sass - 8, 0, 100);
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
    if (isLastLevel() && carrier) {
      carrier.open = true;
      setStatus("Все помечено. Прыгай в переноску, пока люди ничего не поняли");
    } else {
      winGame();
    }
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

function winGame(final = false) {
  won = true;
  running = false;
  document.querySelector(".game-wrap")?.classList.remove("is-playing");
  document.querySelector(".shell")?.classList.remove("is-playing");
  const level = getLevel(currentLevelIndex);
  winTitle.textContent = final ? "Рейд завершен" : level.win;
  winText.textContent = final
    ? "Все предметы помечены, переноска захлопнулась, и Какалапочку унесли. Дорога к ветеринару будет в следующем обновлении."
    : `${level.win}. Обоссано целей: ${targets.length}. Какалапочка торжественно делает вид, что ничего не произошло.`;
  restartButton.textContent = final ? "Начать заново" : "Следующий уровень";
  if (telegram?.MainButton) {
    telegram.MainButton.setText(final ? "Начать заново" : "Следующий уровень");
    telegram.MainButton.show();
  }
  setTimeout(() => winOverlay.classList.add("is-visible"), 400);
}

function getNearbyTarget() {
  const reach = {
    x: player.x - 46,
    y: player.y - 16,
    w: player.w + 92,
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

function getNearbyCurtain() {
  const body = {
    x: player.x + 10,
    y: player.y + 2,
    w: player.w - 20,
    h: player.h - 4,
  };
  return curtains.find((curtain) => rectsOverlap(body, curtain));
}

function getNearbyCarrier() {
  if (!carrier) return null;
  const door = {
    x: carrier.x - 12,
    y: carrier.y - 8,
    w: carrier.w + 24,
    h: carrier.h + 18,
  };
  return rectsOverlap(player, door) ? carrier : null;
}

function updateActionState() {
  const water = getNearbyWater();
  const target = getNearbyTarget();
  const nearCarrier = getNearbyCarrier();
  actionMode = water ? "drink" : "pee";
  if (markButton) {
    markButton.textContent = water ? "Пить" : "Обоссать";
    markButton.setAttribute("aria-label", water ? "Пить воду" : "Обоссать предмет");
    markButton.classList.toggle("is-drink", Boolean(water));
  }
  if (jumpButton) {
    const climbing = Boolean(player.onCurtain);
    jumpButton.textContent = climbing ? "Ползти" : "Прыг";
    jumpButton.setAttribute("aria-label", climbing ? "Ползти по шторе" : "Прыгнуть");
  }
  if (finale) {
    setStatus("Переноска захлопнулась. Миссия выполнена");
    return;
  }
  if (water) {
    setStatus(`Пить: ${water.name}`);
  } else if (nearCarrier && isLastLevel()) {
    setStatus(allTargetsMarked() ? "Переноска открыта. Запрыгивай" : "Сначала обоссать все предметы");
  } else if (target) {
    setStatus(`Обоссать: ${target.name}`);
  } else if (player.onCurtain) {
    setStatus(`Зажми «Ползти»: ${player.onCurtain.name}`);
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

function triggerCarrierFinale() {
  if (!carrier || finale || !allTargetsMarked()) return;
  carrier.open = false;
  carrier.caught = true;
  player.locked = true;
  player.vx = 0;
  player.vy = 0;
  player.x = carrier.x + 18;
  player.y = carrier.y + carrier.h - player.h;
  finale = { time: 0 };
  setStatus("Переноска захлопнулась. Миссия выполнена");
  haptic("action");
}

function updateFinale(dt) {
  if (!finale) return;
  finale.time += dt;
  if (carrier && finale.time > 0.75) {
    carrier.lift = Math.min(96, (finale.time - 0.75) * 92);
  }
  if (finale.time > 2.15 && !won) {
    winGame(true);
  }
}

function updatePlayer(dt) {
  if (player.locked) return;

  const left = keys.has("arrowleft") || keys.has("a") || keys.has("ф");
  const right = keys.has("arrowright") || keys.has("d") || keys.has("в");
  const jumpHeld = keys.has("arrowup") || keys.has("w") || keys.has("ц") || keys.has(" ");
  const jumpPressed = justPressed.has(" ") || justPressed.has("arrowup") || justPressed.has("w") || justPressed.has("ц");
  player.onCurtain = getNearbyCurtain();

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
  if (player.onCurtain) {
    player.vx *= 0.9;
    player.vy = jumpHeld ? -290 : clamp(player.vy + 900 * dt, -80, 130);
    player.coyote = 0.08;
  } else {
    player.vy += WORLD.gravity * dt;
  }
  player.coyote -= dt;
  player.jumpBuffer -= dt;
  player.stateTime += dt;

  if (jumpPressed && !player.onCurtain) {
    player.jumpBuffer = 0.12;
  }

  const canGroundJump = player.coyote > 0;
  const canAirJump = !player.grounded && player.jumpsLeft > 0;
  if (player.jumpBuffer > 0 && (canGroundJump || canAirJump)) {
    player.vy = -760;
    player.grounded = false;
    player.coyote = 0;
    player.jumpBuffer = 0;
    player.jumpsLeft = canGroundJump ? 1 : Math.max(0, player.jumpsLeft - 1);
    setStatus(canGroundJump ? "мяв-прыжок" : "двойной мяв-прыжок");
  }

  if (!jumpHeld && !player.onCurtain && player.vy < -220) {
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
      player.jumpsLeft = 2;
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
  updateFinale(dt);
  updateParticles(dt);

  resizeCanvasToDisplay();
  const targetCameraX = clamp(
    player.x + player.w / 2 - viewportWorldWidth / 2,
    0,
    WORLD.width - viewportWorldWidth,
  );
  cameraX += (targetCameraX - cameraX) * Math.min(1, dt * 7.5);
  cameraY = 0;

  if (carrier && allTargetsMarked() && getNearbyCarrier()) {
    triggerCarrierFinale();
  }

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
  drawCurtains();
  drawFurniture();
  drawStains();
  drawWaterStations();
  drawTargets();
  drawPlatforms();
  drawCarrier(false);
  drawPlayer();
  drawCarrier(true);
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
    ctx.fillStyle = "rgba(147, 219, 255, 0.86)";
    roundRect(station.x - 8, station.y - 8, station.w + 16, station.h + 16, 12, true, true);
    ctx.fillStyle = "#4eb3e8";
    roundRect(station.x + 2, station.y + 18, station.w - 4, 18, 12, true, true);
    ctx.fillStyle = "#d9f6ff";
    ctx.beginPath();
    ctx.ellipse(station.x + station.w / 2, station.y + 22, station.w * 0.34, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1f7aa3";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(station.x + station.w - 10, station.y + 14);
    ctx.lineTo(station.x + station.w + 12, station.y + 4);
    ctx.stroke();
    ctx.fillStyle = "#d9f6ff";
    ctx.beginPath();
    ctx.arc(station.x + station.w / 2, station.y - 13, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawCurtains() {
  for (const curtain of curtains) {
    const wave = Math.sin(performance.now() / 420 + curtain.x * 0.01) * 5;
    ctx.save();
    ctx.fillStyle = "#d7edf3";
    roundRect(curtain.x + 10, curtain.y + 34, curtain.w - 20, 160, 8, true, true);
    ctx.fillStyle = "#9ec4d2";
    ctx.fillRect(curtain.x + 22, curtain.y + 46, curtain.w - 44, 124);
    ctx.strokeStyle = "rgba(35, 54, 61, 0.28)";
    ctx.lineWidth = 4;
    ctx.strokeRect(curtain.x + 22, curtain.y + 46, curtain.w - 44, 124);

    ctx.fillStyle = "#6f4d7f";
    ctx.fillRect(curtain.x - 10, curtain.y + 24, curtain.w + 20, 14);
    ctx.fillStyle = "rgba(117, 63, 93, 0.9)";
    ctx.beginPath();
    ctx.moveTo(curtain.x, curtain.y + 32);
    ctx.bezierCurveTo(curtain.x + 18 + wave, curtain.y + 175, curtain.x - 8 - wave, curtain.y + 360, curtain.x + 18, curtain.y + curtain.h);
    ctx.lineTo(curtain.x + curtain.w - 12, curtain.y + curtain.h);
    ctx.bezierCurveTo(
      curtain.x + curtain.w + 12 - wave,
      curtain.y + 360,
      curtain.x + curtain.w - 18 + wave,
      curtain.y + 175,
      curtain.x + curtain.w,
      curtain.y + 32,
    );
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 235, 220, 0.26)";
    ctx.lineWidth = 3;
    for (let x = curtain.x + 18; x < curtain.x + curtain.w; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(x) * 2, curtain.y + 45);
      ctx.bezierCurveTo(x - 12, curtain.y + 210, x + 10, curtain.y + 420, x - 4, curtain.y + curtain.h - 12);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawFurniture() {
  for (const item of furniture) {
    ctx.save();
    if (item.type === "sofa") {
      ctx.fillStyle = "#77609a";
      roundRect(item.x, item.y + 18, item.w, item.h - 18, 14, true);
      ctx.fillStyle = "#9b85bd";
      roundRect(item.x + 24, item.y, item.w - 48, 44, 12, true);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(item.x + 18, item.y + item.h, item.w - 36, 10);
    } else if (item.type === "bed") {
      ctx.fillStyle = "#d6b59c";
      roundRect(item.x, item.y + 22, item.w, item.h - 22, 10, true);
      ctx.fillStyle = "#e9ddd1";
      roundRect(item.x + 18, item.y, item.w - 36, 42, 10, true);
      ctx.fillStyle = "#9eb7cf";
      roundRect(item.x + 34, item.y + 8, 70, 28, 8, true);
    } else if (item.type === "rug") {
      ctx.fillStyle = "#b85d66";
      roundRect(item.x, item.y + 8, item.w, item.h - 8, 24, true);
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      roundRect(item.x + 34, item.y + 18, item.w - 68, 10, 5, true);
    } else if (item.type === "counter" || item.type === "cabinet") {
      ctx.fillStyle = item.type === "counter" ? "#76b7b0" : "#8a705e";
      roundRect(item.x, item.y, item.w, item.h, 8, true);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(item.x + 16, item.y + 20, item.w - 32, 8);
    } else if (item.type === "shoe-rack") {
      ctx.fillStyle = "#6d5142";
      roundRect(item.x, item.y + 10, item.w, item.h - 10, 8, true);
      ctx.fillStyle = "#a77855";
      ctx.fillRect(item.x + 12, item.y + 18, item.w - 24, 8);
    } else if (item.type === "tv") {
      ctx.fillStyle = "#17191d";
      roundRect(item.x, item.y, item.w, item.h, 8, true);
      ctx.fillStyle = "#273942";
      ctx.fillRect(item.x + 12, item.y + 12, item.w - 24, item.h - 34);
    }
    ctx.restore();
  }
}

function drawCarrier(coverPlayer) {
  if (!carrier) return;
  const lift = carrier.lift || 0;
  const x = carrier.x;
  const y = carrier.y - lift;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(x + carrier.w / 2, carrier.y + carrier.h + 8, carrier.w * 0.55, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!coverPlayer) {
    ctx.fillStyle = carrier.open ? "#f0c58e" : "#c98d62";
    roundRect(x, y + 16, carrier.w, carrier.h - 8, 12, true, true);
    ctx.fillStyle = "#3d2d28";
    roundRect(x + 22, y + 28, carrier.w - 44, carrier.h - 30, 8, true);
    if (carrier.open) {
      ctx.fillStyle = "#1c1513";
      roundRect(x + 28, y + 34, carrier.w - 56, carrier.h - 38, 6, true);
    }
    ctx.strokeStyle = "#5a392f";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x + carrier.w / 2, y + 18, 28, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  if (coverPlayer && carrier.caught) {
    const slam = Math.min(1, finale ? finale.time / 0.4 : 1);
    ctx.fillStyle = "#b97b54";
    roundRect(x + 20, y + 24 - (1 - slam) * 40, carrier.w - 40, carrier.h - 26, 8, true);
    ctx.strokeStyle = "#4c3129";
    ctx.lineWidth = 5;
    roundRect(x + 20, y + 24 - (1 - slam) * 40, carrier.w - 40, carrier.h - 26, 8, false, true);
    ctx.strokeStyle = "#e4cdb7";
    ctx.lineWidth = 4;
    for (let bar = x + 36; bar < x + carrier.w - 28; bar += 18) {
      ctx.beginPath();
      ctx.moveTo(bar, y + 30);
      ctx.lineTo(bar, y + carrier.h - 8);
      ctx.stroke();
    }
    if (finale && finale.time > 0.65) {
      ctx.strokeStyle = "#f1d8bd";
      ctx.lineWidth = 13;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - 20, y + 20);
      ctx.quadraticCurveTo(x - 58, y - 12, x - 82, y + 28);
      ctx.moveTo(x + carrier.w + 20, y + 20);
      ctx.quadraticCurveTo(x + carrier.w + 58, y - 12, x + carrier.w + 82, y + 28);
      ctx.stroke();
    }
  }
  ctx.restore();
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
  resetGame(won && currentLevelIndex === levels.length - 1 ? 0 : currentLevelIndex + 1);
});

if (telegram?.MainButton) {
  telegram.MainButton.onClick(() => {
    resetGame(won && currentLevelIndex === levels.length - 1 ? 0 : currentLevelIndex + 1);
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
