# Dashboard Agronômico — Laboratório Solo & Companhia

Aplicação web analítica para diagnóstico nutricional e acompanhamento laboratorial multi-cliente (**Pecíolo / Seiva**, **Folha**, **Solo** e **Solução do Solo**), alimentada diretamente via navegador pela planilha `public/SOLOECIA_BI_SAFRA_2021.xlsx` (com suporte a upload de novas versões `.xlsx` via SheetJS).

## Funcionalidades Principais

- **Motor ETL & Higienização (`src/utils/etlParser.ts`)**: Conversão segura de vírgulas e duplas vírgulas (`"97,,085"`), descarte de seriais de data em colunas numéricas (`> 10.000`), ajuste automático de escala foliar (`÷1000`), normalização de datas e desempate de cultura via `RELATORIO_ANALISE`.
- **Acesso Isolado por Cliente (`ClientPortalModal.tsx`)**: Cada cliente visualiza apenas suas propriedades, talhões e pacotes laboratoriais contratados (habilitação automática dos módulos presentes na base do cliente).
- **Visualizações Específicas por Matriz**:
  - **Visão Geral & Bullet Charts**: KPIs de equilíbrio, Top 3 prioridades de déficit e barras horizontais com faixa ideal `REF_MIN`–`REF_MAX`.
  - **Pecíolo (Seiva)**: Radar nutricional + curva fenológica dinâmica por `DAE` (ou desvio pontual na inspeção de amostra individual).
  - **Folha**: Índice divergente de balanço foliar (estilo DRIS), relações fisiológicas (`N/S`, `N/K`, `K/Mg`, `P/Zn`) e comparativo entre talhões.
  - **Solo**: Radar químico ajustado à Argila/CTC, ocupação da CTC (`%Ca`, `%Mg`, `%K`, `%H+Al`), gradiente `0-20cm` vs `20-40cm` e granulometria.
  - **Solução do Solo**: Balanço iônico (Cátions × Ânions) e salinidade (`C.E.` × `pH`).
  - **Quadrantes Solo × Planta**: Dispersão 4 quadrantes distinguindo deficiência real no solo de bloqueio de absorção.

## Deploy no Netlify

O repositório já inclui `netlify.toml`:
- **Build command**: `npm run build` (`tsc -b && vite build`)
- **Publish directory**: `dist`
- **Node version**: `22`

## Desenvolvimento Local

```bash
npm install
npm run dev
```
