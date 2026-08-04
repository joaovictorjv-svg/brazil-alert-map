# Dashboard de Ordens de Serviço — Mapa do Brasil

Dashboard executivo para monitorar backlog de OS por unidade, com mapa interativo do Brasil (Leaflet + GeoJSON) e dados vindos da planilha do Google.

## Ponto de atenção: acesso à planilha

Testei o link `.../pub?output=csv` novamente: o Google responde **HTTP 401** com uma página de login, ou seja, a planilha ainda não está publicada para acesso anônimo. Provavelmente ela está apenas compartilhada dentro do domínio corporativo, ou a publicação na web está restrita.

Para liberar: abrir a planilha > **Arquivo > Compartilhar > Publicar na web** > selecionar a aba de dados > formato **Valores separados por vírgula (.csv)** > **Publicar**. Se a organização bloquear a publicação, uma alternativa é **Compartilhar > Qualquer pessoa com o link (Leitor)** e usar o endpoint `gviz/tq?tqx=out:csv`.

Enquanto o acesso não estiver liberado, construo tudo com dados de exemplo na mesma estrutura de colunas; a troca para o link real fica em um único ponto do código.


## O que será construído

### Mapa
- Mapa do Brasil com Leaflet, camada base clara e contorno dos estados via GeoJSON.
- Um pin por unidade, posicionado pela coluna COORDENADAS (lat, long).
- Cor do pin pelo percentual de backlog: verde até 1%, amarelo de 2% a 19%, vermelho de 20% em diante.
- Agrupamento visual de pins muito próximos para não poluir o mapa.

### Modal de detalhes da unidade
Ao clicar no pin, abre um painel com:
- Nome da unidade e grupo/estado
- Total de chamados
- Abertas (unidade, volante e total)
- Fechadas (unidade, volante e total)
- Requisições paradas
- Backlog ativo e percentual, com selo colorido do nível
- Horário da última atualização dos dados

### Cabeçalho e indicadores consolidados
- Total de unidades, total de chamados da rede, total de backlog e contagem de unidades em alerta vermelho.
- Botão "Atualizar dados" com indicador de carregamento e horário da última sincronização.

### Filtros
- Filtro por estado/grupo.
- Filtro por criticidade (verde / amarelo / vermelho).
- Busca por nome de unidade.
- Lista lateral das unidades filtradas, clicável, sincronizada com o mapa.

### Dados e cache
- Leitura do CSV publicado feita no servidor (evita bloqueio de CORS), com parsing das colunas: UNIDADE, GRUPO, COORDENADAS, REQ_PARADAS, ABERTAS_UNIDADE, ABERTAS_VOLANTE, FECHADAS_VOLANTE, FECHADAS_UNIDADE, TOTAL_ABERTAS, TOTAL_FECHADAS, TOTAL_CHAMADOS, BACKLOG_ATIVOS.
- Dados carregados no primeiro acesso e mantidos em cache na memória.
- Revalidação automática em segundo plano a cada 10 minutos, mais o botão manual.
- Linhas sem coordenada válida são ignoradas no mapa, mas contam nas estatísticas.

### Visual
Estilo corporativo e sóbrio (azul-petróleo profundo + cinzas neutros, tipografia limpa), responsivo, com foco em leitura rápida de indicadores — sem o visual genérico roxo/gradiente.

## Detalhes técnicos

- Rota única em `src/routes/index.tsx` (substitui o placeholder), com `head()` próprio para SEO.
- `src/lib/os-data.functions.ts`: `createServerFn` que baixa o CSV, faz o parse e devolve DTOs simples (unidade, grupo, lat, lng, métricas, nível de alerta).
- Cálculo do percentual de backlog: `BACKLOG_ATIVOS / TOTAL_CHAMADOS`; classificação em verde/amarelo/vermelho conforme os cortes acima.
- TanStack Query com `staleTime` e `refetchInterval` de 10 min; `refetch()` no botão manual.
- Leaflet carregado apenas no cliente (`React.lazy` + `ClientOnly`), com tipos e dados compartilhados em módulo separado para não quebrar o SSR.
- GeoJSON dos estados brasileiros servido de `public/`.
- Sem banco de dados: a planilha é a única fonte de dados.
