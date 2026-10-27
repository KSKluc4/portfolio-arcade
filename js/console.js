/* ===================================================================
 *  CONSOLE — encaixa e ejeta cartuchos, e liga/desliga a TV
 * -------------------------------------------------------------------
 *  O cartucho que aparece espetado no console fica dentro do
 *  .console__dock: uma caixa com overflow: hidden cuja borda de baixo
 *  é a fenda. Quando ele desce, a parte de baixo some "dentro" do
 *  console.
 * =================================================================== */

import { cartridgeBody, createFlyingCart, flyTo } from './cartridge.js';
import { sfx } from './audio.js';
import { rectCenter, prefersReducedMotion } from './utils.js';

export function createConsole({ station, tv, shelf, onChange }) {
  const consoleEl = station.querySelector('.console');
  const dock = station.querySelector('.console__dock');
  const ejectButton = station.querySelector('[data-action="eject"]');
  const startButton = station.querySelector('[data-action="start"]');

  let current = null;   // projeto encaixado agora (ou null)
  let busy = false;     // true durante as animações de encaixar/ejetar

  ejectButton.addEventListener('click', () => eject());
  startButton.addEventListener('click', () => start());

  /**
   * Encaixa um projeto. Se outro já estiver no console, ejeta ele antes.
   *   ghost        cartucho que estava sendo arrastado (continua o voo dele)
   *   viaKeyboard  se veio do teclado, o foco vai para os botões da TV no final
   */
  async function insert(project, { ghost = null, viaKeyboard = false } = {}) {
    if (busy) return;
    // Clicou no cartucho que já está no console: vale como START
    if (current?.id === project.id) {
      ghost?.remove();
      start();
      return;
    }

    busy = true;
    try {
      if (current) await eject({ swapping: true });
      shelf.setOut(project.id, true);
      if (!ghost) await bringStationIntoView();

      // Monta o cartucho (invisível) acima da fenda só para medir o destino do voo
      const flying = ghost ?? createFlyingCart(project, shelf.centerOf(project.id));
      const cart = mountCart(project);
      cart.style.visibility = 'hidden';
      const target = rectCenter(cart.getBoundingClientRect());
      await flyTo(flying, target, ghost ? { lift: 20, duration: 260 } : { lift: 110, duration: 560 });
      cart.style.visibility = '';
      flying.remove();

      await slide(cart, 'in');
      sfx.insert();
      setCurrent(project);
      tv.powerOn(project, { focusActions: viaKeyboard });   // o boot segue sozinho
      bringStationIntoView();   // depois de um arraste a TV pode estar meio fora da tela
    } finally {
      busy = false;
    }
  }

  /** Ejeta o cartucho: ele pula da fenda e volta voando para a estante. */
  async function eject({ swapping = false } = {}) {
    if (!current) {
      if (!swapping) sfx.denied();
      return;
    }
    if (busy && !swapping) return;

    const project = current;
    if (!swapping) busy = true;
    try {
      setCurrent(null);
      sfx.eject();
      tv.powerOff();

      const cart = dock.querySelector('.console__cart');
      await slide(cart, 'above');
      const flying = createFlyingCart(project, rectCenter(cart.getBoundingClientRect()));
      dock.innerHTML = '';

      shelf.reveal(project.id);
      await flyTo(flying, shelf.centerOf(project.id), { lift: 90, duration: swapping ? 420 : 560 });
      flying.remove();
      shelf.setOut(project.id, false);
      sfx.land();
    } finally {
      if (!swapping) busy = false;
    }
  }

  /** Botão START: pula a tela de boot. Sem cartucho, a dica chacoalha. */
  function start() {
    if (!current) {
      sfx.denied();
      consoleEl.classList.remove('is-nudged');
      void consoleEl.offsetWidth;   // força o navegador a reiniciar a animação
      consoleEl.classList.add('is-nudged');
      return;
    }
    tv.start();
  }

  function setCurrent(project) {
    current = project;
    station.classList.toggle('is-on', Boolean(project));
    ejectButton.disabled = !project;
    onChange?.(project);
  }

  function mountCart(project) {
    dock.innerHTML = `<div class="console__cart" data-pos="above">${cartridgeBody(project)}</div>`;
    return dock.firstElementChild;
  }

  /**
   * Move o cartucho do console entre 'above' (em cima da fenda) e 'in'
   * (encaixado). As posições finais estão no CSS; aqui só animamos o
   * caminho, com um "tranco" ao encaixar e uma mola ao ejetar.
   */
  function slide(cart, to) {
    const from = getComputedStyle(cart).transform;
    cart.dataset.pos = to;
    const end = getComputedStyle(cart).transform;
    if (prefersReducedMotion()) return Promise.resolve();

    const keyframes =
      to === 'in'
        ? [
            { transform: from, easing: 'cubic-bezier(.55, 0, 1, .45)' },
            { transform: end, offset: 0.75, easing: 'ease-out' },
            { transform: `${end} translateY(-4px)`, offset: 0.87, easing: 'ease-in' },
            { transform: end },
          ]
        : [
            { transform: from, easing: 'cubic-bezier(.2, .8, .3, 1)' },
            { transform: `${end} translateY(-22px)`, offset: 0.5, easing: 'ease-in-out' },
            { transform: end },
          ];
    return cart.animate(keyframes, { duration: to === 'in' ? 400 : 460 }).finished;
  }

  /**
   * Rola a página até a TV + console aparecerem inteiros (comum no celular).
   * Se os dois não couberem juntos na tela, prioriza a TV.
   */
  async function bringStationIntoView() {
    const target = station.offsetHeight <= window.innerHeight ? station : station.querySelector('.tv');
    const rect = target.getBoundingClientRect();
    if (rect.top >= 0 && rect.bottom <= window.innerHeight) return;
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
    await waitForScrollEnd();
  }

  return { insert, eject, start, isBusy: () => busy, current: () => current };
}

/** Espera a rolagem da página parar (scrollY igual por alguns quadros seguidos). */
function waitForScrollEnd() {
  return new Promise((resolve) => {
    const started = performance.now();
    let last = window.scrollY;
    let still = 0;
    (function check() {
      still = window.scrollY === last ? still + 1 : 0;
      last = window.scrollY;
      const elapsed = performance.now() - started;
      if ((still > 4 && elapsed > 120) || elapsed > 1000) resolve();
      else requestAnimationFrame(check);
    })();
  });
}
