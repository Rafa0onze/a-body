---
version: 1
slug: "src-app-jsx"
primary_target: "src/App.jsx"
related_targets: ["src/app.css"]
---

# A-BODY app (todas as telas)

Mode: Operate. Público: um usuário (o dono), no celular, na academia, entre séries. Prioridade de leitura: tempo de descanso de relance. Evitar: cara de app genérico, baixa legibilidade, gamificação.

Escopo: redesenho de todas as telas, em rodadas. Rodada 1: sistema global (tipos, cores, fios, controles) + home, série e descanso. Rodadas seguintes: relatório, biblioteca, evolução, medidas, anamnese/geração, calendário, autenticação e demais.

## Direction contract

THESIS: A prancha anatômica: cada exercício é lido pelo músculo que trabalha, com cor de tecido e legenda numerada. Recusa o padrão da categoria: cartões arredondados escuros, anel de progresso e um acento neon.

OWN-WORLD: Chão branco-frio #F5F6F3, tinta #1B1D1C, fios de 1px #C9CCC6. Seis cores de tecido marcam grupos musculares e nada mais: costas azul-veia #2F5D8C, peito carmim #B4262B, ombros laranja-queimado #C65D21, braços violeta #6E3C86, pernas verde #3F7650, core ocre #B8811C. Archivo (variável, eixo de largura) é a única família: condensada para numerais, normal para texto. Raio 2px no máximo; sem sombras, sem cartões flutuantes.

STORY: Entre séries, o usuário vê em um olhar quanto falta, o que vem e quanto levantou da última vez; o treino parece conduzido por uma ficha técnica precisa, não por um app de motivação.

FIRST VIEWPORT: Descanso: faixa superior com o dia e a posição na sessão (4/22); cronômetro em numeral condensado preto ocupando a largura útil; abaixo de um fio, a próxima série com a legenda numerada e o quadrado da cor do músculo, o exercício e a carga/reps/RIR da última vez em números tabulares; a régua de duração da sessão; e, no rodapé, o botão primário "Pular descanso" ao alcance do polegar.

FORM: Prancha anatômica, posição 7 da minha lista ordenada (sorteada). seed:6665de9742a5b852. Acréscimos: régua de duração que não transborda (da capa de fita); uma única família tipográfica (do anuário de design); escala curta, peso e caixa carregam a hierarquia (do horário de bolso); fios de 1px exatos no lugar de sombras (da edição anotada). Movimento-assinatura: a legenda numerada (chave de prancha) liga cada exercício ao seu grupo muscular pela cor, em toda tela que lista exercícios.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
