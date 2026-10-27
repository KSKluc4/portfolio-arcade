# 🕹️ Portfólio Arcade

**▶ Jogue aqui: https://kskluc4.github.io/portfolio-arcade/**

Portfólio interativo com tema de fliperama retrô. Cada projeto é um cartucho numa
estante: arraste (ou clique) até o console, a TV de tubo liga com chiado, aparece o
**PRESS START** e depois os detalhes do projeto: descrição, linguagens, tecnologias,
estrelas, data da última atualização e os botões **VER CÓDIGO** e **JOGAR**.

HTML, CSS e JavaScript puro, sem framework e sem build: é só publicar a pasta.

## Estrutura

```
portfolio-arcade/
├── index.html
├── config.js         ← o que você edita no dia a dia (nome, cores, descrições...)
├── projects.json     ← fallback, usado quando a API do GitHub falha
├── assets/
│   ├── favicon.svg
│   └── prints/       ← prints dos projetos (opcional)
├── css/
│   ├── base.css      variáveis, layout da página e rodapé
│   ├── marquee.css   letreiro e placar (HUD)
│   ├── shelf.css     estante e cartuchos
│   ├── console.css   TV, rack e console
│   └── screen.css    efeitos da tela CRT e as telas (chiado, boot, infos)
└── js/
    ├── main.js       ponto de entrada: liga todas as peças
    ├── data.js       API do GitHub, cache, fallback e ajustes do config
    ├── shelf.js      estante: clique e arrastar
    ├── console.js    encaixar, ejetar e START
    ├── tv.js         chiado, tela de boot e tela de infos
    ├── cartridge.js  desenho do cartucho e a animação de voo
    ├── audio.js      sons 8-bit gerados com a Web Audio API
    ├── pixel.js      ícones e mascotes em pixel art (SVG)
    └── utils.js      funções pequenas usadas por todo lado
```

## De onde vêm os projetos

O site lê `https://api.github.com/users/KSKluc4/repos?per_page=100` e mostra **só os
repositórios com o topic `portfolio`**. Repositório novo no portfólio = adicionar o
topic no GitHub, mais nada.

Ordem de tentativa:

1. **Cache** no `localStorage`, se tiver menos de `cacheMinutes` (60 min). A API sem
   login aceita só 60 requisições por hora por IP, por isso o cache.
2. **API do GitHub.** Também busca as linguagens de cada repo (as barrinhas com %).
3. **Cache vencido**, se a API falhar (ex.: limite estourado).
4. **`projects.json`**, se nada acima funcionar, ou se nenhum repo tiver o topic ainda.

O rodapé mostra qual fonte foi usada (ex.: `DADOS: GITHUB API · AO VIVO`).

### Repositórios privados

A API pública não enxerga repositórios privados. Para mostrar um mesmo assim, deixe-o
no `projects.json` com `"private": true`: ele é somado aos que vierem da API e o botão
vira **CÓDIGO PRIVADO** (sem link, já que daria 404 para quem visita).

### Formato do `projects.json`

Os campos têm os mesmos nomes da API do GitHub, então dá para copiar de lá:

```json
{
  "name": "nome-do-repo",
  "description": "Texto curto",
  "html_url": "https://github.com/KSKluc4/nome-do-repo",
  "homepage": "https://demo.com",
  "language": "JavaScript",
  "languages": { "JavaScript": 12000, "CSS": 800 },
  "topics": ["portfolio"],
  "stargazers_count": 0,
  "created_at": "2026-01-01T00:00:00Z",
  "pushed_at": "2026-10-01T00:00:00Z",
  "private": false
}
```

`languages` (bytes por linguagem, como em `/repos/{dono}/{repo}/languages`) é opcional;
sem ele vale só `language`.

## Personalizar (`config.js`)

Tudo fica comentado no próprio arquivo. O principal:

| Campo | Para quê |
| --- | --- |
| `githubUser` | usuário de onde os repos são lidos |
| `topic` | topic que coloca o repo na estante (`portfolio`) |
| `playerName` / `tagline` | textos do letreiro |
| `cacheMinutes` | validade do cache da API |
| `order` | ordem dos cartuchos (os demais vêm depois, do mais recente ao mais antigo) |
| `links` | links extras no rodapé (LinkedIn, e-mail...) |
| `projects` | ajustes por repositório, ver abaixo |

Ajustes por projeto (a chave é o nome do repositório; todos opcionais e vencem o que
vem da API):

```js
projects: {
  'pilates-studio': {
    title: 'Pilates Studio',          // nome no rótulo
    color: '#2ee6d6',                 // cor do cartucho
    description: 'Texto próprio...',  // útil quando a descrição do GitHub está vazia
    tech: ['Next.js', 'Express'],     // tecnologias (sem isso, usa os topics do repo)
    image: 'assets/prints/pilates-studio.png', // print: fundo do boot + tela de infos
    demo: 'https://...',              // botão JOGAR (null esconde o botão)
  },
},
```

Sem `color`, cada projeto ganha uma cor neon escolhida pelo nome (sempre a mesma), e
o mascote em pixel art do rótulo também é gerado a partir do nome.

## Rodar localmente

Os módulos JavaScript não funcionam abrindo o `index.html` com dois cliques
(`file://`), então use um servidor local. Qualquer um serve:

```bash
cd portfolio-arcade
python3 -m http.server 8000
# abra http://localhost:8000
```

Alternativas: `npx serve .` ou a extensão **Live Server** do VS Code.

Dica: `http://localhost:8000/?refresh` ignora o cache e busca a API na hora (útil logo
depois de adicionar o topic num repo).

## Publicar no GitHub Pages

1. Crie um repositório público no GitHub, por exemplo `portfolio-arcade`. Para o site
   ficar na raiz (`https://kskluc4.github.io/`), o nome tem que ser `KSKluc4.github.io`.
2. Suba os arquivos:

   ```bash
   cd portfolio-arcade
   git init -b main
   git add .
   git commit -m "Portfólio arcade"
   git remote add origin git@github.com:KSKluc4/portfolio-arcade.git
   git push -u origin main
   ```

3. No repositório: **Settings → Pages → Build and deployment → Source: Deploy from a
   branch**, escolha `main` e a pasta `/ (root)` e clique em **Save**.
4. Em 1 ou 2 minutos o site fica em `https://kskluc4.github.io/portfolio-arcade/`.

O arquivo `.nojekyll` avisa o GitHub Pages para servir os arquivos como estão.

## Adicionar o topic `portfolio` num repositório

**Pelo site:** abra o repositório → clique na engrenagem ⚙️ ao lado de **About** (coluna
da direita) → em **Topics** digite `portfolio` e aperte Enter → **Save changes**.

**Pelo terminal** (com o [GitHub CLI](https://cli.github.com/)):

```bash
gh repo edit KSKluc4/pilates-studio --add-topic portfolio
```

O cartucho aparece na próxima vez que o cache vencer (até 1 hora), ou na hora com
`?refresh`.

Aproveite a mesma tela do **About**:

- **Website** vira o botão **JOGAR**.
- Outros topics (`react`, `nextjs`, `mongodb`...) aparecem como **TECNOLOGIAS** quando o
  projeto não tem `tech` no `config.js`.

## Atalhos

| Tecla | Ação |
| --- | --- |
| `M` | liga/desliga o som |
| `E` ou `Esc` | ejeta o cartucho |
| `Enter` ou `Espaço` | START (pula a tela de boot) |
| `←` `→` | anda entre os botões da TV |

Link direto para um projeto: `https://kskluc4.github.io/portfolio-arcade/#pilates-studio`
já abre com o cartucho no console.

Quem ativa "reduzir movimento" no sistema operacional recebe a versão sem animações.
