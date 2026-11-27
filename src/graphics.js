export const sceneGlyphs = [
  `<svg viewBox="0 0 100 64" fill="none"><path d="M5 52c12-9 10-30 28-32s20 20 31 19 20-17 31-6M5 43c12-8 12-25 25-29s23 16 34 15S82 16 95 23M6 33C18 25 15 9 29 7s23 11 35 12 22-9 31-4M7 59c13-5 15-22 29-27s18 17 29 17 21-9 30-5"/><circle cx="34" cy="20" r="3" class="glyph-node"/></svg>`,
  `<svg viewBox="0 0 100 64" fill="none"><ellipse cx="50" cy="13" rx="25" ry="8"/><path d="M25 13v36c0 11 50 11 50 0V13M25 35c0 11 50 11 50 0M32 59v4m36-4v4M19 30h62"/><path d="M25 35v14c0 11 50 11 50 0V35c-8 7-42 7-50 0Z" fill="currentColor" opacity=".13"/><circle cx="81" cy="30" r="3" class="glyph-node"/></svg>`,
  `<svg viewBox="0 0 100 64" fill="none"><path d="M12 53V29L50 9l38 20v24H12ZM28 53V25m22 28V10m22 43V25M12 34h76M50 49V35m0 7c-9 0-12-7-12-7s11-1 12 7Zm0-5c8 0 11-7 11-7s-10-1-11 7Z"/><circle cx="88" cy="29" r="3" class="glyph-node"/></svg>`
];
export function waterReading(tower,index) {
  const id=`WT-${String(index+1).padStart(2,'0')}`,color=tower.level<45?'#ffb45b':'#45d9ff';
  return `<div class="asset-reading water-reading" style="--water:${color}"><span>${id}</span><svg class="water-gauge" viewBox="0 0 64 64" aria-hidden="true"><circle class="gauge-track" cx="32" cy="32" r="26"/><circle class="gauge-progress" cx="32" cy="32" r="26" pathLength="100" stroke-dasharray="${tower.level} 100" transform="rotate(-90 32 32)"/><circle class="gauge-core" cx="32" cy="32" r="20"/></svg><strong data-reading="${index}">—</strong></div>`;
}
export function greenhouseReading(g,index) {
  const color=g.temp>27?'#ffae61':'#a1ee7b';
  return `<div class="asset-reading climate-reading" style="--climate:${color}"><span>${g.id}</span><strong data-reading="${index}">—</strong><svg class="greenhouse-glyph" viewBox="0 0 180 58" aria-hidden="true" fill="none"><path class="greenhouse-ground" d="M2 52h176"/><path class="greenhouse-fill" d="M20 49V25L68 7l54 10 39 19v13H20Z"/><path d="M20 49V25L68 7l54 10 39 19v13H20ZM20 25l40 15h101M60 40v9M68 7v28m54-18v23M39 18l39 19m18-25 36 28M20 49h141"/><path class="vent-window" d="m116 17 13 -${Math.round(g.vent/10)} 17 8 -13 ${Math.round(g.vent/10)}Z"/><circle cx="39" cy="18" r="3" class="greenhouse-node"/><circle cx="132" cy="40" r="3" class="greenhouse-node"/></svg><small><span class="temperature">${g.temp}°C</span> · 湿度 <b class="humidity">${g.humidity}%</b></small><small>土壤 <b class="soil">${g.soil}%</b> · 通风 <b class="ventilation">${g.vent}%</b></small></div>`;
}
