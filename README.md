# HealthMap Ops

Objetivo da Aplicação: Criar um dashboard interativo para monitoramento de Ordens de Serviço (OS) do departamento de manutenção de uma operadora de saúde, com visualização em mapa interativo do Brasil.

1. Interface e Visualização no Mapa

Mapa Interativo: Renderizar o mapa do Brasil com delimitação clara das fronteiras dos estados (usando GeoJSON) através de Leaflet ou Mapbox.

Pins/Marcadores Dinâmicos: Exibir pins nas coordenadas exatas de cada unidade. A cor do pin deve variar de acordo com o nível de alerta do backlog:

Verde: Operação normal / baixo backlog.

Amarelo: Atenção / backlog moderado.

Vermelho: Crítico / backlog alto.

Modal / Popup de Detalhes: Ao clicar em uma unidade, abrir um modal com os indicadores de desempenho daquela unidade:

Nome da unidade e estado/cidade.

Chamados totais.

Requisições abertas, fechadas e paradas.

Backlog acumulado.

Data/hora da última atualização.

2. Integração e Gestão de Dados

Fonte de Dados: Conectar a uma planilha do Google Planilhas pública via endpoint JSON/CSV ou conector nativo.

Estratégia de Cache e Performance:

Carregar os dados no carregamento inicial da página e armazenar em memória (state/cache local).

Adicionar um botão visível no cabeçalho: "Atualizar Dados" para revalidação manual sem recarregar a página.

Configurar revalidação automática em segundo plano a cada 10 minutos.

3. Recursos de Usabilidade (UI/UX)

Design limpo, corporativo e responsivo focado em gestão executiva.

Barra lateral ou cabeçalho com estatísticas consolidadas (Total de Unidades, Total de Chamados da Rede, Unidades em Alerta Vermelho).

Filtro rápido por estado ou por nível de criticidade (Verde/Amarelo/Vermelho).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://brazil-alert-map.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e93208d9-40cb-4c2a-b142-2b521ca05221).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
