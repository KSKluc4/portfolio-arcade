/* ===================================================================
 *  MAIN — ponto de entrada: monta a página e liga as peças
 * -------------------------------------------------------------------
 *  data.js     busca os projetos (API do GitHub / cache / projects.json)
 *  shelf.js    estante com os cartuchos (clique e arrastar)
 *  console.js  console: encaixar, ejetar, START
 *  tv.js       TV de tubo: chiado, boot e tela de informações
 *  audio.js    sons 8-bit
 * =================================================================== */

import { CONFIG } from '../config.js';
import { loadProjects } from './data.js';
import { createShelf } from './shelf.js';
import { createTV } from './tv.js';
import { createConsole } from './console.js';
import { sfx, isMuted, setMuted } from './audio.js';
import { icon, pixelSVG, DECOR } from './pixel.js';
import { escapeHtml, pad, prefersReducedMotion } from './utils.js';

const $ = (selector) => document.querySelector(selector);

// Mesmo ponto de quebra do CSS: abaixo dele a estante vira uma fileira e só vale o toque
const compactLayout = window.matchMedia('(max-width: 900px)');

const tv = createTV($('#tv-screen'));

const shelf = createShelf({
  list: $('#shelf-grid'),
  status: $('#shelf-status'),
  dropZone: $('#station'),
  compactLayout,
  canInteract: () => !machine.isBusy(),
  onInsert: (project, options) => machine.insert(project, options),
});

const machine = createConsole({
  station: $('#station'),
  tv,
  shelf,
  onChange: handleCartridgeChange,
});

start();

async function start() {
  renderTexts();
  const toggleMute = setupMuteButton();
  setupKeyboard(toggleMute);
  shelf.showLoading();

  try {
    // ?refresh na URL ignora o cache (útil logo depois de marcar um repo com o topic)
    const forceRefresh = new URLSearchParams(location.search).has('refresh');
    const { projects, source, savedAt } = await loadProjects({ forceRefresh });
    shelf.render(projects);
    rollScore($('#hiscore'), projects.length);
    renderSource(source, savedAt);
    openFromHash(projects);
  } catch (error) {
    console.error('[arcade]', error);
    $('#hiscore').textContent = pad(0, 6);
    $('#data-source').textContent = 'Dados indisponíveis';
    shelf.showError(() => location.reload());
  }
}

/** Preenche os textos que vêm do config.js (nome, usuário, links...). */
function renderTexts() {
  const name = CONFIG.playerName;
  document.title = `${name} · Portfólio Arcade`;
  document.querySelectorAll('[data-config="playerName"]').forEach((el) => (el.textContent = name));

  const tagline = $('[data-config="tagline"]');
  tagline.textContent = CONFIG.tagline;
  tagline.hidden = !CONFIG.tagline;

  const profile = `https://github.com/${CONFIG.githubUser}`;
  $('#player-link').href = profile;
  $('#player-handle').textContent = `@${CONFIG.githubUser}`;

  // Marca do console: iniciais do nome + "-16" (ex.: Lucas Marques → LM-16)
  const initials = name.split(/\s+/).map((word) => word[0]).join('').slice(0, 3).toUpperCase();
  $('#console-brand').textContent = `${initials}-16`;

  $('#year').textContent = new Date().getFullYear();
  const links = [{ label: 'GitHub', url: profile }, ...(CONFIG.links || [])].filter((link) => link.url);
  $('#footer-links').innerHTML = links
    .map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`)
    .join(' · ');

  $('.shelf__decor--cactus').innerHTML = pixelSVG(DECOR.cactus);
  $('.shelf__decor--gamepad').innerHTML = pixelSVG(DECOR.gamepad);
}

function setupMuteButton() {
  const button = $('#mute-btn');
  const render = () => {
    const muted = isMuted();
    button.setAttribute('aria-pressed', String(muted));
    button.querySelector('.hud__value').innerHTML = `${icon(muted ? 'soundOff' : 'soundOn')}${muted ? 'OFF' : 'ON'}`;
  };
  const toggle = () => {
    setMuted(!isMuted());
    render();
    sfx.move();   // só toca quando o som acabou de ser ligado
  };
  button.addEventListener('click', toggle);
  render();
  return toggle;
}

/** Atalhos: M = som · E/Esc = ejetar · Enter/Espaço = START (na tela de boot). */
function setupKeyboard(toggleMute) {
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    const key = event.key.toLowerCase();

    if (key === 'm') toggleMute();
    else if (key === 'e') machine.eject();
    else if (key === 'escape' && machine.current()) machine.eject();
    else if ((key === 'enter' || key === ' ') && tv.state() === 'boot') {
      event.preventDefault();
      machine.start();
    }
  });
}

/** HIGH SCORE: os dígitos giram e param um a um, como num caça-níquel. */
function rollScore(target, value) {
  const final = pad(value, 6);
  if (prefersReducedMotion()) {
    target.textContent = final;
    return;
  }
  let frame = 0;
  const timer = setInterval(() => {
    frame++;
    target.textContent = [...final].map((digit, i) => (frame > 6 + i * 3 ? digit : Math.floor(Math.random() * 10))).join('');
    if (frame > 6 + final.length * 3) clearInterval(timer);
  }, 45);
}

function renderSource(source, savedAt) {
  const minutes = Math.max(1, Math.round((Date.now() - savedAt) / 60000));
  const label = {
    api: 'GitHub API · ao vivo',
    cache: `GitHub API · cache de ${minutes} min`,
    'stale-cache': 'cache antigo · API indisponível',
    fallback: 'projects.json',
  }[source];
  $('#data-source').innerHTML = `<span class="source-dot" data-source="${source}"></span>Dados: ${label}`;
}

/** Link direto: site.com/#nome-do-repo já abre com aquele cartucho no console. */
function openFromHash(projects) {
  const id = decodeURIComponent(location.hash.slice(1));
  const project = projects.find((p) => p.id === id);
  if (project) setTimeout(() => machine.insert(project), 600);
}

/** Atualiza a URL (#nome-do-repo) e avisa leitores de tela quando o cartucho muda. */
function handleCartridgeChange(project) {
  history.replaceState(null, '', project ? `#${encodeURIComponent(project.id)}` : location.pathname + location.search);
  $('#announcer').textContent = project ? `Cartucho ${project.title} encaixado.` : 'Cartucho ejetado.';
}
