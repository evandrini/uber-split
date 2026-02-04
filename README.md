# UberSplit

UberSplit é uma aplicação web que resolve um problema comum:  
a divisão injusta de corridas de Uber quando há múltiplas paradas.

Na maioria das vezes, as pessoas dividem o valor “por dois” ou “por três”,
sem considerar que quem desce primeiro não deveria pagar o restante da viagem.
Isso faz com que quem mora mais perto acabe pagando mais do que o justo.

## A solução

O UberSplit calcula o valor correto de forma proporcional,
garantindo que cada pessoa pague apenas pelos trechos
em que realmente esteve dentro do carro.

Regras aplicadas:
- Cada pessoa começa a pagar a partir do ponto onde entra na corrida.
- Cada pessoa para de pagar no ponto onde sai.
- Trechos compartilhados são divididos igualmente.
- Trechos individuais são pagos apenas por quem permaneceu no carro.
- O resultado final mostra claramente quem deve pagar quem.

## Tecnologias
- React
- TypeScript
- Vite
- Tailwind CSS

## Objetivo do projeto
Este projeto foi criado para resolver um problema real do dia a dia,
com foco em lógica de negócio clara, UX simples e cálculo justo.
