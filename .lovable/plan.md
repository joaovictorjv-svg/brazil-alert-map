# Dashboard de Ordens de Serviço — Mapa do Brasil

Dashboard executivo para monitorar backlog de OS por unidade, com mapa interativo do Brasil (Leaflet + GeoJSON) e dados vindos da planilha do Google.

## Acesso à planilha: OK

O novo link responde **HTTP 200** e devolve o CSV completo — **53 unidades**, todas na Grande São Paulo/Baixada Santista. Colunas confirmadas: UNIDADE, GRUPO, QUADRO_FIXO, COORDENADAS, REQ_PARADAS, ABERTAS_UNIDADES, ABERTAS_VOLANTE, FECHADAS_VOLANTE, FECHADAS_UNIDADE, TOTAL_ABERTAS, TOTAL_FECHADAS, TOTAL_CHAMADOS, Backlog_Ativo (já vem em % no formato `28,57%`), CONDIÇÃO.

Grupos existentes: Hospitais, Nucleo, Pronto Atendimento e Backoffice e Galpões.


## O que será construído

### Mapa
- Mapa do Brasil com Leaflet, camada base clara e contorno dos estados via GeoJSON.
- Um pin por unidade, posicionado pela coluna COORDENADAS (lat, long).
- Cor do pin pelo percentual da coluna Backlog_Ativo: verde até 1%, amarelo de 2% a 19%, vermelho de 20% em diante.
- Enquadramento inicial automático nas unidades existentes (hoje, Grande São Paulo), com zoom out possível para o Brasil inteiro.
- Agrupamento visual de pins muito próximos para não poluir o mapa.

### Modal de detalhes da unidade
Ao clicar no pin, abre um painel com:
- Nome da unidade, grupo e condição
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
- Filtro por grupo (Hospitais, Nucleo, Pronto Atendimento, Backoffice e Galpões).
- Filtro por criticidade (verde / amarelo / vermelho).
- Busca por nome de unidade.
- Lista lateral das unidades filtradas, clicável, sincronizada com o mapa.

### Dados e cache
- Leitura do CSV publicado feita no servidor (evita bloqueio de CORS), com parser que respeita campos entre aspas (nomes de unidade e coordenadas contêm vírgulas) e converte números/percentuais no padrão brasileiro.
- Dados carregados no primeiro acesso e mantidos em cache na memória.
- Revalidação automática em segundo plano a cada 10 minutos, mais o botão manual.
- Linhas sem coordenada válida são ignoradas no mapa, mas contam nas estatísticas.

### Visual
Estilo corporativo e sóbrio (azul-petróleo profundo + cinzas neutros, tipografia limpa), responsivo, com foco em leitura rápida de indicadores — sem o visual genérico roxo/gradiente.

## Detalhes técnicos

- Rota única em `src/routes/index.tsx` (substitui o placeholder), com `head()` próprio para SEO.
- `src/lib/os-data.functions.ts`: `createServerFn` que baixa o CSV, faz o parse e devolve DTOs simples (unidade, grupo, lat, lng, métricas, nível de alerta).
- Percentual de backlog lido da coluna `Backlog_Ativo` (`"28,57%"` → 28.57), com fallback para `TOTAL_ABERTAS / TOTAL_CHAMADOS` quando vazio; classificação em verde/amarelo/vermelho conforme os cortes acima.
- TanStack Query com `staleTime` e `refetchInterval` de 10 min; `refetch()` no botão manual.
- Leaflet carregado apenas no cliente (`React.lazy` + `ClientOnly`), com tipos e dados compartilhados em módulo separado para não quebrar o SSR.
- GeoJSON dos estados brasileiros servido de `public/`.
- Sem banco de dados: a planilha é a única fonte de dados.
