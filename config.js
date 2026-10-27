/* =====================================================================
 *  CONFIGURAÇÃO DO PORTFÓLIO ARCADE
 * ---------------------------------------------------------------------
 *  É aqui que você mexe no dia a dia. O resto do código lê tudo deste
 *  arquivo, então não precisa tocar em JS/CSS para trocar textos,
 *  cores ou ajustar um projeto.
 * ===================================================================== */

export const CONFIG = {
  // Usuário do GitHub de onde os repositórios são lidos.
  githubUser: 'KSKluc4',

  // Só entram na estante os repositórios que tiverem este topic.
  topic: 'portfolio',

  // Nome no letreiro (e no "©" das telas de boot).
  playerName: 'Lucas Marques',

  // Frase pequena acima do nome no letreiro ('' para esconder).
  tagline: 'Portfólio de projetos',

  // Por quantos minutos os dados da API ficam guardados no navegador.
  // Sem login, a API do GitHub aceita só 60 requisições por hora por IP.
  cacheMinutes: 60,

  // Ordem dos cartuchos na estante. Os listados aqui vêm primeiro, nesta
  // ordem; os demais aparecem depois, do mais recente para o mais antigo.
  order: ['fivem-pvp-trainer', 'mon-petit-sistema-demo', 'pilates-studio'],

  // Links extras no rodapé (o do GitHub já entra sozinho). Exemplo:
  //   { label: 'LinkedIn', url: 'https://www.linkedin.com/in/seu-perfil' }
  links: [],

  // -------------------------------------------------------------------
  //  Ajustes por projeto. A chave é o NOME DO REPOSITÓRIO no GitHub.
  //  Tudo é opcional, e o que estiver aqui vence o que vem da API.
  //
  //   title        nome bonito para o rótulo (padrão: nome do repo).
  //   color        cor do cartucho (qualquer cor CSS). Sem ela, uma cor
  //                neon é escolhida a partir do nome (sempre a mesma).
  //   description  descrição personalizada (ótima quando a do GitHub
  //                está vazia).
  //   tech         lista de tecnologias. Sem ela, usamos os topics do repo.
  //   image        print do projeto, ex.: 'assets/prints/meu-projeto.png'.
  //                Vira o fundo da tela de boot e aparece nos detalhes.
  //   demo         link do botão JOGAR (padrão: campo "Website" do repo).
  //                Use null para esconder o botão.
  // -------------------------------------------------------------------
  projects: {
    'fivem-pvp-trainer': {
      title: 'FiveM PvP Trainer',
      color: '#ff3b6b',
      tech: ['React', 'Flask', 'Supabase', 'Electron'],
    },
    'mon-petit-sistema-demo': {
      title: 'Mon Petit Sistema',
      color: '#ffc531',
      description:
        'Sistema de gestão de um pet shop: clientes, pets, agenda, atendimento, histórico, caixa e dashboard. Usado no dia a dia no tablet do balcão e no celular.',
      tech: ['Next.js', 'Tailwind', 'Prisma', 'Postgres'],
      demo: null, // sem JOGAR: o sistema em produção é de um cliente
    },
    'pilates-studio': {
      title: 'Pilates Studio',
      color: '#2ee6d6',
      description:
        'App web fullstack para gerenciar um estúdio de pilates: cadastro de pacientes, agendamento de aulas e controle de pagamentos, com autenticação segura e dois níveis de acesso.',
      tech: ['Next.js', 'Express', 'MongoDB', 'JWT'],
    },
  },
};
