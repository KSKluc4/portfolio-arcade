/* ===================================================================
 *  TV DE TUBO — liga com chiado, mostra o boot e as infos do projeto
 * -------------------------------------------------------------------
 *  Estados (atributo data-state da tela, usado pelo css/screen.css):
 *    off → warming → static → boot → info → shutdown → off
 *  Cada vez que a TV liga ou desliga começa uma nova "sessão"; passos
 *  atrasados de uma sessão antiga são ignorados (ex.: ejetar no meio
 *  do boot não deixa a tela de infos aparecer depois).
 * =================================================================== */

import { CONFIG } from '../config.js';
import { sfx } from './audio.js';
import { icon, pixelSVG, spriteFor } from './pixel.js';
import { escapeHtml, formatDate, timeAgo, pad, wait, prefersReducedMotion } from './utils.js';

const BOOT_AUTO_ADVANCE = 3200;   // ms até sair do PRESS START sozinho

export function createTV(screen) {
  const content = screen.querySelector('.screen__content');
  const canvas = screen.querySelector('.screen__static');
  let session = 0;
  let pressStart = null;   // libera a tela de boot (só existe enquanto ela está aberta)

  const getState = () => screen.dataset.state;
  const setState = (state) => {
    screen.dataset.state = state;
    screen.classList.remove('is-starting');
  };

  // Clicar em qualquer lugar da tela durante o boot = apertar START
  screen.addEventListener('click', () => {
    if (getState() === 'boot') start();
  });
  screen.addEventListener('keydown', moveCursor);
  window.addEventListener('resize', () => {
    if (getState() === 'info') updateScrollHint();
  });

  async function powerOn(project, { focusActions = false } = {}) {
    const id = ++session;
    const alive = () => id === session;
    const quick = prefersReducedMotion();

    content.innerHTML = '';
    setState('warming');
    sfx.powerOn();
    const noise = playStatic(quick ? 150 : 1000, alive);
    await wait(quick ? 50 : 380);
    if (!alive()) return;
    setState('static');
    await noise;
    if (!alive()) return;

    renderBoot(project);
    setState('boot');
    sfx.boot();
    await waitForStart(quick ? 1500 : BOOT_AUTO_ADVANCE);
    if (!alive()) return;

    renderInfo(project);
    setState('info');
    // Quem encaixou pelo teclado já cai com o foco no primeiro botão
    if (focusActions) content.querySelector('.tv-btn:not(.is-disabled)')?.focus();
  }

  async function powerOff() {
    if (getState() === 'off') return;
    const id = ++session;
    pressStart = null;
    setState('shutdown');
    sfx.powerOff();
    await wait(prefersReducedMotion() ? 50 : 520);
    if (id !== session) return;
    content.innerHTML = '';
    setState('off');
  }

  /** START: na tela de boot, pula direto para as informações. */
  function start() {
    if (getState() !== 'boot' || !pressStart) return;
    const press = pressStart;
    pressStart = null;
    sfx.start();
    screen.classList.add('is-starting');   // "PRESS START" pisca rápido antes de seguir
    press();
  }

  /** Resolve quando apertarem START ou depois de `timeout` ms. */
  function waitForStart(timeout) {
    return new Promise((resolve) => {
      const press = () => {
        clearTimeout(timer);
        setTimeout(resolve, 420);
      };
      const timer = setTimeout(() => {
        if (pressStart === press) pressStart = null;
        resolve();
      }, timeout);
      pressStart = press;
    });
  }

  /** Chiado: ruído aleatório num canvas pequeno (160x120), ampliado pelo CSS. */
  function playStatic(duration, alive) {
    const g = canvas.getContext('2d');
    const { width, height } = canvas;
    const image = g.createImageData(width, height);
    const pixels = new Uint32Array(image.data.buffer);   // 1 número = 1 pixel RGBA
    const started = performance.now();

    return new Promise((resolve) => {
      function frame(now) {
        const elapsed = now - started;
        const band = (elapsed * 0.25) % (height * 1.5);   // faixa mais clara descendo a tela
        for (let y = 0; y < height; y++) {
          const boost = Math.abs(y - band) < 8 ? 70 : 0;
          for (let x = 0; x < width; x++) {
            const v = Math.min(255, ((Math.random() * 190) | 0) + boost);
            pixels[y * width + x] = 0xff000000 | (v << 16) | (v << 8) | v;
          }
        }
        g.putImageData(image, 0, 0);
        if (elapsed < duration && alive()) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  function renderBoot(project) {
    const year = new Date(project.createdAt || project.updatedAt || Date.now()).getFullYear();
    content.innerHTML = `
      <div class="boot" style="--c: ${escapeHtml(project.color)}">
        ${project.image ? `<img class="boot__art" src="${escapeHtml(project.image)}" alt="">` : ''}
        <span class="boot__sprite">${pixelSVG(spriteFor(project.id))}</span>
        <h2 class="boot__title">${escapeHtml(project.title)}</h2>
        <p class="boot__copy">© ${year} ${escapeHtml(CONFIG.playerName)}</p>
        <button class="boot__start" type="button">Press Start</button>
      </div>`;
  }

  function renderInfo(project) {
    const languages = project.languages.length
      ? project.languages
          .map(
            (lang) => `
          <li class="lang">
            <span class="lang__name">${escapeHtml(lang.name)}</span>
            <span class="lang__bar"><span style="width: ${Math.max(lang.percent, 3).toFixed(1)}%"></span></span>
            <span class="lang__pct">${lang.percent < 1 ? '&lt;1' : Math.round(lang.percent)}%</span>
          </li>`
          )
          .join('')
      : '<li class="lang">Não informado</li>';

    const tech = project.tech.length
      ? `
        <section>
          <h3 class="info__label">Tecnologias</h3>
          <ul class="chips">${project.tech.map((name) => `<li class="chip">${escapeHtml(name)}</li>`).join('')}</ul>
        </section>`
      : '';

    const shot = project.image
      ? `<img class="info__shot" src="${escapeHtml(project.image)}" alt="Print do projeto ${escapeHtml(project.title)}">`
      : '';

    const code =
      project.isPrivate || !project.repoUrl
        ? `<span class="tv-btn is-disabled" title="Este repositório é privado">${icon('lock')} Código privado</span>`
        : `<a class="tv-btn" href="${escapeHtml(project.repoUrl)}" target="_blank" rel="noopener noreferrer">&lt;/&gt; Ver código</a>`;

    const play = project.demoUrl
      ? `<a class="tv-btn" href="${escapeHtml(project.demoUrl)}" target="_blank" rel="noopener noreferrer">${icon('play')} Jogar</a>`
      : '';

    content.innerHTML = `
      <article class="info" style="--c: ${escapeHtml(project.color)}">
        <header class="info__head">
          <span class="info__sprite">${pixelSVG(spriteFor(project.id))}</span>
          <h2 class="info__title">${escapeHtml(project.title)}</h2>
        </header>
        <div class="info__body" tabindex="0" aria-label="Detalhes do projeto">
          <p class="info__meta">
            <span>${icon('star')}<span class="sr-only">Estrelas:</span> ${pad(project.stars, 3)}</span>
            <span>${icon('clock')}<span class="sr-only">Atualizado em</span> ${formatDate(project.updatedAt)}
              <small>(${escapeHtml(timeAgo(project.updatedAt))})</small></span>
          </p>
          ${shot}
          <p class="info__desc">${escapeHtml(project.description || 'Sem descrição... ainda! Esse cartucho guarda segredos.')}</p>
          <div class="info__grid">
            <section>
              <h3 class="info__label">Linguagens</h3>
              <ul class="langs">${languages}</ul>
            </section>
            ${tech}
          </div>
        </div>
        <nav class="info__actions" aria-label="Links do projeto">
          <button class="info__more" type="button" tabindex="-1" aria-hidden="true" hidden>Mais ▼</button>
          ${code}${play}
        </nav>
      </article>`;

    const body = content.querySelector('.info__body');
    body.addEventListener('scroll', updateScrollHint, { passive: true });
    content.querySelector('.info__more').addEventListener('click', (event) => {
      event.stopPropagation();
      body.scrollBy({ top: body.clientHeight * 0.7, behavior: 'smooth' });
    });
    content.querySelectorAll('a.tv-btn').forEach((link) => link.addEventListener('pointerenter', () => sfx.move()));
    updateScrollHint();
  }

  /** Mostra o "Mais ▼" enquanto houver conteúdo escondido para rolar. */
  function updateScrollHint() {
    const body = content.querySelector('.info__body');
    const more = content.querySelector('.info__more');
    if (!body || !more) return;
    more.hidden = body.scrollHeight - body.scrollTop - body.clientHeight < 8;
  }

  /** Setas do teclado andam entre os botões da tela de infos, como num menu. */
  function moveCursor(event) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step || getState() !== 'info') return;
    const buttons = [...content.querySelectorAll('a.tv-btn')];
    const index = buttons.indexOf(document.activeElement);
    if (index === -1) return;
    event.preventDefault();
    buttons[(index + step + buttons.length) % buttons.length].focus();
    sfx.move();
  }

  return { powerOn, powerOff, start, state: getState };
}
