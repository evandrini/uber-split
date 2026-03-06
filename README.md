# UberSplit

Aplicativo web para dividir corridas de Uber de forma justa quando existem multiplas paradas.

App online: https://evandrini.github.io/uber-split/

## O problema que ele resolve
Quando um grupo divide a corrida por igual, quase sempre alguem paga a mais.
Exemplo: quem desce antes nao deveria pagar pela parte final da viagem.

O UberSplit calcula automaticamente quanto cada pessoa deve pagar com base no trecho que realmente percorreu.

## Para quem serve
- Grupos de amigos
- Casais com amigos/familia
- Corridas com ida e volta
- Situacoes em que pessoas entram e saem em pontos diferentes

## Como usar (bem simples)
1. Adicione os participantes.
2. Informe valor da ida e/ou volta.
3. Selecione quem pagou cada corrida (obrigatorio para calcular transferencias finais).
4. Monte as paradas e marque quem entra/sai em cada ponto.
5. Clique em calcular.

## Simulacao rapida
Cenario:
- Corrida total: R$ 60,00
- Trecho A -> B: 6 km (Ana e Bruno no carro)
- Trecho B -> C: 3 km (apenas Bruno no carro)

Passo 1: custo por km
- Distancia total = 9 km
- R$ 60,00 / 9 = R$ 6,67 por km

Passo 2: custo de cada trecho
- A -> B: 6 km x 6,67 = R$ 40,02
- B -> C: 3 km x 6,67 = R$ 20,01

Passo 3: divisao por quem estava no carro
- A -> B (2 pessoas): R$ 40,02 / 2 = R$ 20,01 para cada
- B -> C (1 pessoa): R$ 20,01 para Bruno

Resultado final:
- Ana: R$ 20,01
- Bruno: R$ 40,02

Ou seja, Bruno paga mais porque ficou mais tempo no carro.

## Regras de calculo (sem misterio)
- A pessoa comeca a pagar no ponto em que entra.
- Para de pagar no ponto em que sai.
- Cada trecho e dividido apenas entre quem estava no carro naquele trecho.
- O custo total da corrida e proporcional a distancia de cada trecho.
- No final, o app calcula transferencias (quem paga para quem) com base em quem realmente pagou no Uber.

## Recursos atuais
- Arrastar e reordenar paradas (drag and drop)
- Copiar ida para volta com 1 clique (mantendo edicao manual)
- Resultado com:
  - total e distancia
  - custo por pessoa
  - transferencias finais
  - resumo rapido de saldo
  - grafico de quem ficou mais tempo no carro
- Idiomas: Portugues, English, Espanol
- Moeda automatica por idioma:
  - pt-BR -> BRL (R$)
  - en-US -> USD ($)
  - es-ES -> EUR (EUR)

## Tecnologias
- React
- TypeScript
- Vite
- Tailwind CSS
- dnd-kit
- Framer Motion

## Rodando localmente
```bash
npm install
npm run dev
```

## Build de producao
```bash
npm run build
```

## Deploy GitHub Pages
```bash
npm run deploy
```

## Objetivo do projeto
Deixar uma conta que normalmente gera discussao em algo claro, justo e facil de explicar para qualquer pessoa.
