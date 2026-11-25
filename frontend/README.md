# Karavan

Front-end em React do [Caravana](https://github.com/rafaelsampa/gm-projeto), uma API de controle de veículos: abastecimentos, consumo, manutenções e revisões.

Feito para ser simples de ler: React + TypeScript + Vite, React Router para as rotas e CSS puro, sem biblioteca de componentes.

## Rodando

Precisa da API do Caravana rodando em `http://localhost:3000` (veja o README dela).

```sh
pnpm install
pnpm dev
```

Abra http://localhost:5173 e entre com `demo@caravana.dev` / `caravana123` (usuário criado pelo seed da API).

## Como está organizado

| Arquivo           | O que faz                                                                |
| ----------------- | ------------------------------------------------------------------------ |
| `src/main.tsx`    | ponto de entrada: liga o React, o roteador e o contexto de login         |
| `src/App.tsx`     | mapa de rotas (`/login`, `/cadastro`, `/`, `/veiculos`, `/veiculos/:id`) |
| `src/api.ts`      | todas as chamadas à API, com renovação automática do token               |
| `src/auth.tsx`    | contexto com o usuário logado, login, cadastro e logout                  |
| `src/useApi.ts`   | hook que busca dados ao abrir uma tela                                   |
| `src/types.ts`    | formato dos dados que a API devolve                                      |
| `src/format.ts`   | dinheiro, datas e km no padrão brasileiro                                |
| `src/components/` | peças reutilizadas: menu, gráfico de barras, status da revisão           |
| `src/pages/`      | uma tela por arquivo; `pages/vehicle/` tem as abas da tela do veículo    |
| `src/styles.css`  | todo o visual                                                            |

## Como o login funciona

1. O login devolve um **access token** (vale 15 minutos). Ele fica só numa variável em `api.ts`, nunca no `localStorage`.
2. A API grava o **refresh token** num cookie `httpOnly`. O JavaScript não consegue ler esse cookie; o navegador o envia sozinho para `/api/v1/auth`.
3. Quando uma chamada recebe 401, `api.ts` chama `/auth/refresh`, ganha um access token novo e repete a chamada.
4. Ao recarregar a página, o `AuthProvider` faz o mesmo refresh para continuar logado.
5. Se várias chamadas recebem 401 juntas, todas esperam a mesma renovação. Isso importa porque a API encerra a sessão se o mesmo refresh token for usado duas vezes (detecção de reuso).

Em desenvolvimento o Vite repassa tudo que começa com `/api` para `localhost:3000` (veja `vite.config.ts`). Para o navegador, front e API ficam no mesmo endereço.
