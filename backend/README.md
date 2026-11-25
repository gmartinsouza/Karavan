# Caravana

API de gerenciamento automotivo: veículos, abastecimentos, manutenções e revisões programadas.

Em construção. O README completo chega na versão final.

## Rodando localmente

Requisitos: Node.js 22 e pnpm 9.

```sh
pnpm install
cp .env.example .env
pnpm dev
```

- Documentação da API: http://localhost:3000/docs
- Health: http://localhost:3000/health/live e http://localhost:3000/health/ready

## Scripts

| Comando          | Descrição                       |
| ---------------- | ------------------------------- |
| `pnpm dev`       | servidor com recarga automática |
| `pnpm build`     | compila para `dist/`            |
| `pnpm start`     | executa a versão compilada      |
| `pnpm typecheck` | checagem de tipos               |
| `pnpm lint`      | ESLint                          |
| `pnpm test`      | testes com Vitest               |
