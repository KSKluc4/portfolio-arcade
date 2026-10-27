/* ===================================================================
 *  PIXEL ART — ícones, enfeites e mascotes desenhados em SVG
 * -------------------------------------------------------------------
 *  Cada desenho é uma lista de linhas; cada caractere é um pixel:
 *    '.'  vazio
 *    '#'  cor do texto (currentColor)
 *    outra letra → classe CSS "px-<letra>" (cores em css/base.css)
 * =================================================================== */

import { hashString, seededRandom } from './utils.js';

export const ICONS = {
  star: [
    '...#...',
    '...#...',
    '#######',
    '.#####.',
    '..###..',
    '.##.##.',
    '.#...#.',
  ],
  clock: [
    '.#####.',
    '#..#..#',
    '#..#..#',
    '#..##.#',
    '#.....#',
    '#.....#',
    '.#####.',
  ],
  lock: [
    '..###..',
    '.#...#.',
    '.#...#.',
    '#######',
    '###.###',
    '###.###',
    '#######',
  ],
  play: [
    '#...',
    '##..',
    '###.',
    '####',
    '###.',
    '##..',
    '#...',
  ],
  soundOn: [
    '...#...#..',
    '..##.#..#.',
    '####..#..#',
    '####..#..#',
    '####..#..#',
    '..##.#..#.',
    '...#...#..',
  ],
  soundOff: [
    '...#......',
    '..##.#...#',
    '####..#.#.',
    '####...#..',
    '####..#.#.',
    '..##.#...#',
    '...#......',
  ],
};

/** Enfeites que ficam em cima da estante. */
export const DECOR = {
  cactus: [
    '....GG....',
    '...GgGG...',
    '.G.GgGG...',
    '.G.GgGG.G.',
    '.GGGgGG.G.',
    '...GgGGGG.',
    '...GgGG...',
    '...GgGG...',
    '.pppppppp.',
    '.PPPPPPPP.',
    '..PPPPPP..',
    '..PPPPPP..',
  ],
  gamepad: [
    '..kkkkkkkkkkkkkk..',
    '.kbbbbbbbbbbbbbbk.',
    'kbbbdbbbbbbbbbrbbk',
    'kbbdddbbkbkbbrbrbk',
    'kbbbdbbbbbbbbbrbbk',
    'kbbbbbbbbbbbbbbbbk',
    '.kbbbbkkkkkkbbbbk.',
    '..kkkk......kkkk..',
  ],
};

/** Converte um desenho (lista de linhas) em SVG nítido em qualquer tamanho. */
export function pixelSVG(rows, className = '') {
  const width = Math.max(...rows.map((row) => row.length));
  let rects = '';

  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const char = row[x];
      let run = 1;
      while (row[x + run] === char) run++;   // junta pixels iguais vizinhos num só retângulo
      if (char !== '.') {
        const paint = char === '#' ? 'fill="currentColor"' : `class="px-${char}"`;
        rects += `<rect x="${x}" y="${y}" width="${run}" height="1" ${paint}/>`;
      }
      x += run;
    }
  });

  return `<svg class="${className}" viewBox="0 0 ${width} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
}

export const icon = (name) => pixelSVG(ICONS[name], 'px-icon');

/**
 * Mascote 7x7 gerado a partir do nome do projeto, no estilo dos
 * "invasores" procedurais: sorteia a metade esquerda e espelha na
 * direita. Como o sorteio usa o nome como semente, o mascote de um
 * projeto é sempre o mesmo.
 */
export function spriteFor(seedText) {
  const random = seededRandom(hashString(seedText));
  const SIZE = 7;
  const HALF = 4;   // colunas 0..3 são sorteadas; 4..6 espelham 2..0
  let cells;

  // Sorteia até sair um formato "encorpado" (nem quase vazio, nem um bloco)
  for (let attempt = 0; attempt < 20; attempt++) {
    cells = Array.from({ length: SIZE }, () =>
      Array.from({ length: HALF }, (_, x) => random() < (x === HALF - 1 ? 0.65 : 0.5)));
    const filled = cells.flat().filter(Boolean).length;
    if (filled >= 13 && filled <= 21) break;
  }

  // Um par de olhos, com "corpo" em volta para parecer um rostinho
  const eyeY = 1 + Math.floor(random() * 2);
  const eyeX = 1 + Math.floor(random() * 2);
  for (const [dy, dx] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    cells[eyeY + dy][eyeX + dx] = true;
  }

  return cells.map((row, y) => {
    const left = row.map((on, x) => (y === eyeY && x === eyeX ? 'o' : on ? '#' : '.'));
    return [...left, ...left.slice(0, HALF - 1).reverse()].join('');
  });
}
