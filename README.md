# Karavan

Aplicação para controlar os gastos de um carro: abastecimentos, consumo (km/l), custo por km, manutenções e revisões programadas.

| Pasta | O que é |
|---|---|
| [backend/](backend/) | API REST em Node 22 + TypeScript, Fastify, Zod, Prisma e PostgreSQL, com testes em Vitest |
| [frontend/](frontend/) | interface em React + Vite e Tailwind CSS |

## Rodando tudo localmente

Requisitos: Node.js 22, pnpm 9 e Docker.

```sh
# 1. API (porta 3000)
cd backend
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:deploy
pnpm db:seed
pnpm dev

# 2. Front-end (porta 5173), em outro terminal
cd frontend
pnpm install
pnpm dev
```

Abra http://localhost:5173 e entre com `demo@caravana.dev` / `caravana123`. A documentação da API fica em http://localhost:3000/docs.

## Destaques

- **Autenticação:** JWT de curta duração e refresh token com rotação e detecção de reuso, guardado num cookie httpOnly.
- **Regras de negócio puras** em `backend/src/domain`, testadas sem banco.
- **Consumo pelo método do tanque cheio** e gastos por mês com `GROUP BY` no Postgres.
- **Isolamento por usuário:** cada consulta filtra pelo dono, e o teste de integração prova que um usuário não vê dados de outro.
- **Concorrência:** abastecimentos simultâneos no mesmo veículo são serializados com `SELECT ... FOR UPDATE`.
