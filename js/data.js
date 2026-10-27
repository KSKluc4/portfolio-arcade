/* ===================================================================
 *  DADOS — de onde vêm os cartuchos
 * -------------------------------------------------------------------
 *  Ordem de tentativa:
 *    1. cache no localStorage (se tiver menos de CONFIG.cacheMinutes)
 *    2. API pública do GitHub, só os repos com o topic configurado
 *    3. cache vencido (se a API falhar, é melhor que nada)
 *    4. projects.json (fallback local)
 *
 *  Repositórios PRIVADOS não aparecem na API pública. Para mostrar um
 *  deles mesmo assim, deixe-o no projects.json com "private": true:
 *  ele é somado aos que vierem da API.
 *
 *  O cache guarda só os dados do GitHub. Os ajustes do config.js são
 *  aplicados depois, então mudanças no config aparecem na hora.
 * =================================================================== */

import { CONFIG } from '../config.js';
import { hashString } from './utils.js';

const API = 'https://api.github.com';
const TOPIC = CONFIG.topic.toLowerCase();
const CACHE_KEY = `arcade:repos:${CONFIG.githubUser}:${TOPIC}`.toLowerCase();
const CACHE_TTL = CONFIG.cacheMinutes * 60 * 1000;
const FALLBACK_URL = 'projects.json';
const REQUEST_TIMEOUT = 8000;

// Cores para projetos sem `color` no config (escolhida pelo nome, sempre a mesma)
const NEON_COLORS = ['#ff2e97', '#22e6ff', '#ffe14d', '#39ff7a', '#b45cff', '#ff8a1f', '#4d8bff', '#ff4d6d'];

/**
 * Carrega os projetos prontos para exibir.
 * `source` diz de onde vieram: 'api' | 'cache' | 'stale-cache' | 'fallback'.
 */
export async function loadProjects({ forceRefresh = false } = {}) {
  // O projects.json é pequeno e local: já começa a baixar em paralelo
  const fallbackRequest = getJSON(FALLBACK_URL, { cache: 'no-cache' })
    .then((data) => (Array.isArray(data) ? data : []))
    .catch((error) => {
      console.warn('[arcade] Não consegui ler o projects.json:', error.message);
      return [];
    });

  let repos = null;
  let source = 'api';
  let savedAt = Date.now();

  const cached = readCache();
  if (cached && !forceRefresh && Date.now() - cached.savedAt < CACHE_TTL) {
    ({ repos, savedAt } = cached);
    source = 'cache';
  } else {
    try {
      repos = await fetchTaggedRepos();
      writeCache(repos);
    } catch (error) {
      console.warn('[arcade] A API do GitHub falhou:', error.message);
      if (cached) {
        ({ repos, savedAt } = cached);
        source = 'stale-cache';
      }
    }
  }

  const fallback = await fallbackRequest;
  let list;

  if (repos?.length) {
    // Repos da API + os privados do projects.json (que a API pública não enxerga)
    const names = new Set(repos.map((repo) => repo.name));
    list = [...repos, ...fallback.filter((repo) => repo.private && !names.has(repo.name))];
  } else {
    if (repos) {
      console.info(`[arcade] Nenhum repositório com o topic "${TOPIC}" ainda. Mostrando o projects.json.`);
    }
    list = fallback;
    source = 'fallback';
  }

  if (!list.length) throw new Error('Nenhum projeto encontrado: a API e o projects.json falharam.');

  return { projects: sortProjects(list.map(toProject)), source, savedAt };
}

/** Busca os repositórios do usuário e fica só com os que têm o topic. */
async function fetchTaggedRepos() {
  const user = encodeURIComponent(CONFIG.githubUser);
  const all = [];

  // A API devolve no máximo 100 por página; quase sempre uma página basta
  for (let page = 1; page <= 10; page++) {
    const batch = await getJSON(`${API}/users/${user}/repos?per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) break;
  }

  const tagged = all.filter((repo) => (repo.topics || []).includes(TOPIC));

  // Linguagens com o tamanho de cada uma (1 requisição por repo, em paralelo).
  // Se falhar (ex.: limite da API), fica só a linguagem principal.
  return Promise.all(
    tagged.map(async (repo) => ({
      ...pickFields(repo),
      languages: await getJSON(repo.languages_url).catch(() => null),
    }))
  );
}

/** Guarda só os campos usados, no mesmo formato do projects.json. */
function pickFields(repo) {
  return {
    name: repo.name,
    description: repo.description,
    html_url: repo.html_url,
    homepage: repo.homepage,
    language: repo.language,
    topics: repo.topics || [],
    stargazers_count: repo.stargazers_count,
    created_at: repo.created_at,
    pushed_at: repo.pushed_at,
    private: repo.private,
  };
}

/** Junta os dados do GitHub com os ajustes do config.js. */
function toProject(repo) {
  const custom = CONFIG.projects?.[repo.name] ?? {};
  const topics = (repo.topics || []).filter((topic) => topic !== TOPIC);

  return {
    id: repo.name,
    title: custom.title || repo.name.replace(/[-_.]+/g, ' '),
    description: custom.description || repo.description?.trim() || '',
    languages: languageList(repo.languages, repo.language),
    tech: Array.isArray(custom.tech) ? custom.tech : topics.map((topic) => topic.replaceAll('-', ' ')),
    stars: repo.stargazers_count ?? 0,
    createdAt: repo.created_at || null,
    // pushed_at = último push de código (updated_at muda até quando alguém dá estrela)
    updatedAt: repo.pushed_at || repo.updated_at || null,
    repoUrl: safeUrl(repo.html_url || `https://github.com/${CONFIG.githubUser}/${repo.name}`),
    demoUrl: safeUrl(custom.demo !== undefined ? custom.demo : repo.homepage),
    isPrivate: Boolean(repo.private),
    color: validColor(custom.color) || NEON_COLORS[hashString(repo.name) % NEON_COLORS.length],
    image: custom.image || null,
  };
}

/** { JavaScript: 6400, CSS: 300 } → [{ name, percent }], no máximo 4 itens. */
function languageList(bytesByLanguage, mainLanguage) {
  const entries = Object.entries(bytesByLanguage || {}).filter(([, bytes]) => bytes > 0);
  if (!entries.length) return mainLanguage ? [{ name: mainLanguage, percent: 100 }] : [];

  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  const list = entries
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes]) => ({ name, percent: (bytes / total) * 100 }));

  if (list.length <= 4) return list;
  const others = list.splice(3);
  return [...list, { name: 'Outras', percent: others.reduce((sum, lang) => sum + lang.percent, 0) }];
}

/** Primeiro os listados em CONFIG.order; depois o resto, do mais recente ao mais antigo. */
function sortProjects(projects) {
  const order = CONFIG.order || [];
  const rank = (project) => {
    const index = order.indexOf(project.id);
    return index === -1 ? order.length : index;
  };
  return projects.sort((a, b) => rank(a) - rank(b) || (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

/** Aceita só links http(s); "site.com" vira "https://site.com". */
function safeUrl(value) {
  if (!value) return null;
  const text = String(value).trim();
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(text) ? text : `https://${text}`);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

const validColor = (color) => (typeof color === 'string' && CSS.supports('color', color) ? color : null);

async function getJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: url.startsWith(API) ? { Accept: 'application/vnd.github+json' } : undefined,
    signal: AbortSignal.timeout?.(REQUEST_TIMEOUT),
    ...options,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} em ${url}`);
  return response.json();
}

function readCache() {
  try {
    const data = JSON.parse(localStorage.getItem(CACHE_KEY));
    return data && Array.isArray(data.repos) && typeof data.savedAt === 'number' ? data : null;
  } catch {
    return null;
  }
}

function writeCache(repos) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), repos }));
  } catch {
    // aba anônima ou armazenamento cheio: segue sem cache
  }
}
