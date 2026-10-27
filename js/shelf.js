/* ===================================================================
 *  ESTANTE — desenha os cartuchos e cuida do clique e do arrastar
 * -------------------------------------------------------------------
 *  O arraste usa Pointer Events (mouse, caneta e toque). No layout
 *  compacto (celular) ele fica desligado: a fileira rola na horizontal
 *  e um toque no cartucho já encaixa no console.
 * =================================================================== */

import { cartridgeBody, createFlyingCart, placeFlying, flyTo } from './cartridge.js';
import { sfx } from './audio.js';
import { escapeHtml, rectCenter } from './utils.js';

const DRAG_THRESHOLD = 6;   // px que o ponteiro precisa andar para virar "arraste"

export function createShelf({ list, status, dropZone, compactLayout, canInteract, onInsert }) {
  const slots = new Map();   // id do projeto → <li> da estante

  function showLoading() {
    list.innerHTML = '';
    status.innerHTML = '<span class="blink">Carregando cartuchos...</span>';
  }

  function showError(onRetry) {
    list.innerHTML = '';
    status.innerHTML = 'Falha ao ler os cartuchos <button type="button" class="pixel-btn">Tentar de novo</button>';
    status.querySelector('button').addEventListener('click', onRetry);
  }

  function render(projects) {
    status.innerHTML = '';
    slots.clear();

    list.innerHTML =
      projects
        .map(
          (project) => `
        <li class="shelf__slot" style="--c: ${escapeHtml(project.color)}">
          <button class="cart" type="button" aria-label="Encaixar o cartucho ${escapeHtml(project.title)} no console">
            ${cartridgeBody(project)}
          </button>
        </li>`
        )
        .join('') +
      `<li class="shelf__slot shelf__slot--soon" aria-hidden="true"><b>?</b><small>Novo jogo<br>em breve</small></li>`;

    projects.forEach((project, i) => {
      const slot = list.children[i];
      slots.set(project.id, slot);
      bindCartridge(slot.querySelector('.cart'), project);
    });
  }

  function bindCartridge(button, project) {
    let justDragged = false;

    // Clique (ou Enter/Espaço no teclado) encaixa direto
    button.addEventListener('click', (event) => {
      if (justDragged) return;   // é o "click" que o navegador dispara ao soltar um arraste
      onInsert(project, { viaKeyboard: event.detail === 0 });
    });

    button.addEventListener('pointerdown', (event) => {
      const slot = slots.get(project.id);
      if (event.button !== 0 || compactLayout.matches || slot.classList.contains('is-out') || !canInteract()) return;

      const start = { x: event.clientX, y: event.clientY };
      const origin = rectCenter(button.getBoundingClientRect());
      const grab = { x: start.x - origin.x, y: start.y - origin.y };   // onde o cartucho foi "segurado"
      let ghost = null;
      let over = false;

      const onMove = (e) => {
        if (!ghost) {
          if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < DRAG_THRESHOLD) return;
          ghost = createFlyingCart(project, origin);
          setOut(project.id, true);
          document.body.classList.add('is-dragging');
          sfx.pickup();
        }
        placeFlying(ghost, { x: e.clientX - grab.x, y: e.clientY - grab.y, rot: -7, scale: 1.06 });

        const nowOver = isInside(dropZone, e.clientX, e.clientY);
        if (nowOver !== over) {
          over = nowOver;
          dropZone.classList.toggle('is-over', over);
          if (over) sfx.target();
        }
      };

      const onEnd = async (e) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onEnd);
        window.removeEventListener('pointercancel', onEnd);
        if (!ghost) return;   // não chegou a arrastar: o 'click' cuida

        justDragged = true;
        setTimeout(() => (justDragged = false));
        document.body.classList.remove('is-dragging');
        dropZone.classList.remove('is-over');

        if (e.type === 'pointerup' && over && canInteract()) {
          onInsert(project, { ghost });
        } else {
          // Soltou fora do console: volta voando para o lugar
          sfx.cancel();
          await flyTo(ghost, rectCenter(button.getBoundingClientRect()), { lift: 24, duration: 320 });
          ghost.remove();
          setOut(project.id, false);
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
    });
  }

  /** Marca o lugar do cartucho como vazio (cartucho fora da estante). */
  function setOut(id, out) {
    slots.get(id)?.classList.toggle('is-out', out);
  }

  /** Centro do cartucho na estante, para as animações saberem para onde voar. */
  function centerOf(id) {
    return rectCenter(slots.get(id).querySelector('.cart').getBoundingClientRect());
  }

  /** No celular, rola a fileira até o lugar do cartucho aparecer. */
  function reveal(id) {
    const slot = slots.get(id);
    const box = list.getBoundingClientRect();
    const rect = slot.getBoundingClientRect();
    if (rect.left < box.left || rect.right > box.right) {
      list.scrollLeft += rect.left - box.left - (box.width - rect.width) / 2;
    }
  }

  return { showLoading, showError, render, setOut, centerOf, reveal };
}

function isInside(element, x, y) {
  const r = element.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}
