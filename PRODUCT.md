# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

PWA instalado pelo Chrome do Android (a-body-dbh.pages.dev, Cloudflare Pages). Também existe empacotamento Capacitor para APK, mas a linguagem de design é web.

## Users

Um único usuário: o próprio dono, em modo solo. Usa o app no celular, **na academia, entre séries**: aparelho na mão, olhando rápido o cronômetro, a carga e a próxima série, muitas vezes com pressa, suado e com atenção dividida.

As telas do antigo módulo de personal/aluno (vínculos, convites, alunos) não fazem parte do uso atual.

## Product Purpose

Ser o treinador de bolso do dono: montar um plano de musculação personalizado a partir de anamnese e fotos, conduzir a sessão série a série (cargas, repetições, RIR, cronômetros de série, descanso e isometria) e mostrar a evolução ao longo das semanas.

Sucesso: terminar cada sessão sem atrito, sem perder registro, e ver o progresso com clareza.

## Positioning

O plano é gerado por IA sobre uma anamnese completa e análise corporal por foto, e passa por um validador científico versionado (recuperação, volume, core, duração da sessão, triagem médica) antes de ser aceito. O treino se adapta pelo esforço registrado (RIR) e pelas cargas anteriores.

## Operating Context

- Fluxo principal: home → começar treino → aquecimento → série (cronômetro, carga, reps, RIR) → descanso (cronômetro com bipe, vibração e push ao fim) → próxima série → aeróbico pós-treino → relatório.
- Fluxos secundários: anamnese e geração de plano (minutos de espera), análise corporal por foto, biblioteca de 146 exercícios com ilustrações, evolução de cargas, medidas (RFM), calendário.
- Uso com uma mão, tela pequena, luz variável de academia, conexão às vezes ruim (há cache offline da biblioteca).

## Capabilities and Constraints

- React 18 + Vite, um único `src/App.jsx` grande (~5.200 linhas) com CSS em `src/app.css`.
- Dados no Cloudflare D1/R2 via shim `/sb` compatível com Supabase; login pelo Cloudflare Access.
- IA pela OpenAI (`/api/openai`), cota diária; aviso de fim de descanso por Web Push (Worker `abody-push`).
- Idioma: português do Brasil.
- Undecided: se o módulo de personal/aluno será removido do código ou só ocultado.

## Brand Commitments

Nenhum fixo. O dono liberou repensar nome, símbolo (`public/brand-*.svg`) e slogan ("MOVE SMARTER").

## Evidence on Hand

- 146 exercícios com ilustrações próprias (`exercicios/*.png|webp` no R2).
- Histórico real de treinos, plano ativo e fotos corporais do dono (privados; nunca usar em material público).
- Não há depoimentos, clientes ou métricas públicas; não inventar.

## Product Principles

1. A sessão de treino vem primeiro: tudo que se faz entre séries precisa caber num olhar e num toque.
2. Nunca perder um registro: estado da sessão sobrevive a recarregar, sair do app e ficar sem sinal.
3. Ciência explícita, não enfeite: recomendações mostram o porquê (RIR, volume, recuperação) sem jargão desnecessário.
4. Uma pessoa só: sem telas, papéis ou textos pensados para outros públicos.

## Accessibility & Inclusion

Leitura rápida a um braço de distância e com movimento: números grandes, alto contraste, alvos de toque generosos, feedback por som e vibração além do visual.
