/* ===================================================================
 *  UTILITÁRIOS — funções pequenas usadas por vários módulos
 * =================================================================== */

/** Espera `ms` milissegundos. Uso: `await wait(300)`. */
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** true se a pessoa pediu "reduzir movimento" nas configurações do sistema. */
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Escapa um texto para inserir com segurança dentro de HTML. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Número com zeros à esquerda, estilo placar: pad(3, 6) → "000003". */
export const pad = (number, size) => String(number).padStart(size, '0');

/** Centro de um retângulo de getBoundingClientRect(). */
export const rectCenter = (rect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

/** Hash FNV-1a: transforma um texto num número inteiro estável. */
export function hashString(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Números "aleatórios" com semente (algoritmo mulberry32): a mesma
 * semente sempre gera a mesma sequência. É o que garante que cada
 * projeto tenha sempre o mesmo mascote e a mesma cor automática.
 */
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Data no formato brasileiro: 27/10/2026. */
export function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '--/--/----';
}

/** Tempo relativo em português: "hoje", "há 3 dias", "há 2 meses". */
export function timeAgo(iso) {
  if (!iso) return '';
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  // Compara dias do calendário (não horas): algo de hoje às 00:05 continua sendo "hoje"
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / 86_400_000);
  if (Math.abs(days) < 30) return rtf.format(days, 'day');
  if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), 'month');
  return rtf.format(Math.round(days / 365), 'year');
}
