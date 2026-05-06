const portrait = (label, bg, face = "#2b211f") => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 800">
      <rect width="640" height="800" fill="${bg}"/>
      <ellipse cx="320" cy="438" rx="205" ry="186" fill="#d8bd90"/>
      <ellipse cx="320" cy="392" rx="146" ry="132" fill="${face}"/>
      <path d="M174 260 238 96 294 278Z" fill="#2b211f"/>
      <path d="M466 260 402 96 346 278Z" fill="#2b211f"/>
      <path d="M206 246 238 142 272 262Z" fill="#e3bfb4"/>
      <path d="M434 246 402 142 368 262Z" fill="#e3bfb4"/>
      <ellipse cx="264" cy="366" rx="42" ry="54" fill="#d9eff2"/>
      <ellipse cx="376" cy="366" rx="42" ry="54" fill="#d9eff2"/>
      <ellipse cx="276" cy="372" rx="15" ry="35" fill="#263f46"/>
      <ellipse cx="364" cy="372" rx="15" ry="35" fill="#263f46"/>
      <ellipse cx="320" cy="450" rx="39" ry="27" fill="#17110f"/>
      <path d="M320 470 C284 506 244 510 204 486" stroke="#f7efe0" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M320 470 C356 506 396 510 436 486" stroke="#f7efe0" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M202 430 H82 M208 458 H70 M438 430 H558 M432 458 H570" stroke="#f7efe0" stroke-width="7" stroke-linecap="round"/>
      <text x="320" y="708" text-anchor="middle" font-family="system-ui, sans-serif" font-size="48" font-weight="800" fill="#fff8e8">${label}</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

window.KAKALAPKA_IMAGES = {
  close: portrait("Какалапочка", "#3b3029"),
  bathroom: portrait("ванная", "#276c73"),
  bed: portrait("после рейда", "#4d4261"),
  cabinet: portrait("смотрит сверху", "#6f4b32"),
};
