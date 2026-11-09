// hilfe.js – Kleinkram ohne Abhängigkeiten

// Wiederholbarer Zufall (mulberry32): gleicher Startwert, gleiche Welt
export function zufall(saat) {
  let a = saat >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const klemme = (v, a, b) => (v < a ? a : v > b ? b : v);

export function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function leinwand(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
