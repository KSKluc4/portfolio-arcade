/* ===================================================================
 *  CARTUCHO — o desenho (HTML) e a animação de "voo" pela tela
 * -------------------------------------------------------------------
 *  O mesmo HTML é usado na estante, no cartucho que voa e no que fica
 *  encaixado no console, por isso a troca entre eles não aparece.
 * =================================================================== */

import { pixelSVG, spriteFor } from './pixel.js';
import { escapeHtml, prefersReducedMotion } from './utils.js';

export function cartridgeBody(project) {
  return `
    <span class="cart__body" style="--c: ${escapeHtml(project.color)}">
      <span class="cart__shell">
        <span class="cart__grip"></span>
        <span class="cart__label">
          <span class="cart__title"><span>${escapeHtml(project.title)}</span></span>
          <span class="cart__art">${pixelSVG(spriteFor(project.id), 'cart__sprite')}</span>
        </span>
      </span>
      <span class="cart__pins"></span>
    </span>`;
}

// Posição atual de cada cartucho voando: { x, y, rot, scale } (x/y = centro, em px)
const positions = new WeakMap();

/**
 * Cria um cartucho solto, preso à tela (position: fixed), centrado em `point`.
 * São dois elementos: o de fora move no eixo X e o de dentro no Y, assim
 * cada eixo tem sua própria aceleração e o voo faz um arco de verdade.
 */
export function createFlyingCart(project, point) {
  const el = document.createElement('div');
  el.className = 'cart-flying';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="cart-flying__y">${cartridgeBody(project)}</div>`;
  document.body.append(el);
  placeFlying(el, point);
  return el;
}

const xTransform = (x) => `translateX(${x}px)`;
const yTransform = (y, rot, scale) => `translateY(${y}px) translate(-50%, -50%) rotate(${rot}deg) scale(${scale})`;

/** Posiciona na hora, sem animação (usado durante o arraste). */
export function placeFlying(el, { x, y, rot = 0, scale = 1 }) {
  el.style.transform = xTransform(x);
  el.firstElementChild.style.transform = yTransform(y, rot, scale);
  positions.set(el, { x, y, rot, scale });
}

/** Voa em arco da posição atual até `target`. A Promise resolve quando chega. */
export async function flyTo(el, target, { duration = 500, lift = 80 } = {}) {
  const from = positions.get(el);
  const to = { rot: 0, scale: 1, ...target };

  if (prefersReducedMotion()) {
    placeFlying(el, to);
    return;
  }

  // Ponto mais alto do arco e em que momento ele acontece (como um objeto arremessado)
  const peak = Math.min(from.y, to.y) - lift;
  const rise = Math.sqrt(Math.max(from.y - peak, 1));
  const fall = Math.sqrt(Math.max(to.y - peak, 1));
  const apex = rise / (rise + fall);
  const tilt = (from.rot + to.rot) / 2 - 8 * Math.sign(to.x - from.x);
  const timing = { duration, fill: 'forwards' };

  const horizontal = el.animate(
    [{ transform: xTransform(from.x) }, { transform: xTransform(to.x) }],
    { ...timing, easing: 'cubic-bezier(.45, .05, .55, .95)' }
  );
  const vertical = el.firstElementChild.animate(
    [
      { transform: yTransform(from.y, from.rot, from.scale), easing: 'cubic-bezier(.33, 1, .68, 1)' },   // subindo: freia
      { transform: yTransform(peak, tilt, 1.04), offset: apex, easing: 'cubic-bezier(.32, 0, .67, 0)' }, // caindo: acelera
      { transform: yTransform(to.y, to.rot, to.scale) },
    ],
    timing
  );
  await Promise.all([horizontal.finished, vertical.finished]);

  // Grava o destino no style antes de cancelar as animações (senão "pisca" na origem)
  placeFlying(el, to);
  horizontal.cancel();
  vertical.cancel();
}
