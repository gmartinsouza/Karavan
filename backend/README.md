# Caravana

API de gerenciamento automotivo: veículos, abastecimentos, manutenções e revisões programadas.

Em construção. O README completo chega na versão final.

## Rodando localmente

Requisitos: Node.js 22, pnpm 9 e Docker.

```sh
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:deploy
pnpm db:seed
pnpm dev
```

- Documentação da API: http://localhost:3000/docs
- Health: http://localhost:3000/health/live e http://localhost:3000/health/ready
- Usuário de demonstração criado pelo seed: `demo@caravana.dev` / `caravana123`

## Scripts

| Comando                 | Descrição                                          |
| ----------------------- | -------------------------------------------------- |
| `pnpm dev`              | servidor com recarga automática                    |
| `pnpm build`            | compila para `dist/`                               |
| `pnpm start`            | executa a versão compilada                         |
| `pnpm typecheck`        | checagem de tipos                                  |
| `pnpm lint`             | ESLint                                             |
| `pnpm test`             | todos os testes                                    |
| `pnpm test:unit`        | testes unitários                                   |
| `pnpm test:integration` | testes de integração (Postgres via Testcontainers) |
| `pnpm db:up`            | sobe o Postgres com Docker Compose                 |
| `pnpm db:migrate`       | cria e aplica migrations em desenvolvimento        |
| `pnpm db:deploy`        | aplica migrations pendentes                        |
| `pnpm db:seed`          | popula o banco com dados de demonstração           |
| `pnpm db:studio`        | interface web do Prisma para navegar nos dados     |
