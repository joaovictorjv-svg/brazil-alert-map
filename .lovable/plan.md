# Localizar a fonte de dados do dashboard

## Objetivo

Trocar a origem dos dados de uma URL pública do Google Sheets para um **arquivo local dentro do repositório**. Assim, a cada levantamento mensal basta substituir o arquivo de dados e republicar o app — sem precisar mexer em código ou depender de link externo/publicação do Google.

## O que será feito

### 1. Criar a pasta de dados local
- Adicionar `src/data/os-base.csv` ao projeto com os dados atuais da planilha (mesmas colunas já validadas: `UNIDADE`, `GRUPO`, `COORDENADAS`, `REQ_PARADAS`, `ABERTAS_UNIDADES`, `ABERTAS_VOLANTE`, `FECHADAS_VOLANTE`, `FECHADAS_UNIDADE`, `TOTAL_ABERTAS`, `TOTAL_FECHADAS`, `TOTAL_CHAMADOS`, `Backlog_Ativo`, `CONDIÇÃO`).

### 2. Suporte a CSV e XLSX
- **Formato padrão**: CSV (`src/data/os-base.csv`). O parser CSV já existente será reaproveitado, então o formato das colunas e dos números/percentuais continua igual.
- **Opcional**: também aceitar `src/data/os-base.xlsx`. Se o arquivo for XLSX, será adicionada a biblioteca `xlsx` para converter a planilha para o mesmo formato interno antes de passar pelo parser.
- Apenas um arquivo estará ativo por vez (prioridade: o que existir, com CSV como fallback padrão).

### 3. Atualizar a função de servidor
- Alterar `src/lib/os-data.server.ts` para ler o arquivo local em vez de fazer `fetch` na URL do Google Sheets.
- Manter a lógica de cache e revalidação de 10 minutos do TanStack Query (os dados continuarão sendo recarregados automaticamente em segundo plano, mas agora a partir do arquivo local).

### 4. Instruções de uso
- Documentar o passo a passo para o usuário: substituir `src/data/os-base.csv` (ou `.xlsx`) pelo novo levantamento, salvar o projeto e publicar. O dashboard já refletirá os dados na próxima publicação.

## O que não será alterado

- A interface do dashboard (mapa, filtros, modal, indicadores) permanece igual.
- Não será adicionado banco de dados; a planilha/arquivo continua sendo a única fonte de dados.
- O design visual e os cortes de criticidade (verde/amarelo/vermelho) não mudam.

## Resultado esperado

Após a implementação, o app lerá os dados de `src/data/os-base.csv` (ou `.xlsx`) e a atualização mensal será simples: trocar o arquivo e republicar.
