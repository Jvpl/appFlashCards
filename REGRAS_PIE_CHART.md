# Regras do Pie Chart — Desempenho Geral

## Princípio fundamental

**Nenhum fator é avaliado sozinho. Nunca.**

O resultado do gráfico é sempre a combinação de múltiplos fatores. Não existe um número mágico que libera ou bloqueia o gráfico — não é "precisa de 50 cards", "precisa de 100% acerto" ou "precisa estudar X dias". Tudo é contínuo e proporcional. Um fator fraco reduz o peso, não zera. Um fator forte aumenta o peso, não domina.

---

## Os 3 Pilares

Os 3 pilares atuam **juntos e de forma multiplicativa** — um pilar fraco puxa o resultado todo pra baixo, mas nunca zera sozinho.

### Pilar 1 — Matéria
- A unidade de análise é a **matéria**, não o card individual
- Cada matéria é avaliada separadamente e contribui com um peso para o resultado global
- Se o usuário tem 7 matérias mas estudou 4, o sistema calcula com base nessas 4 — as outras simplesmente não entram
- Dentro do Pilar 1, entra a **proporção estudada**: estudou 50 de 100 cards tem menos peso que estudou 100 de 100 — mas 50 cards estudados ainda contribuem, só com peso menor

### Pilar 2 — Distribuição
- Proporção real de **acertos / quases / erros** dos swipes naquela sessão
- Comparada com a sessão anterior via **tendência** (ver abaixo)
- Distribuição com erros e quases = sinal de aprendizado honesto = mais credível
- Distribuição 100% acerto = ceticismo proporcional (ver colaterais)
- Não é "errou = ruim, acertou = bom" — é a **combinação** que diz algo

### Pilar 3 — Quantidade de cards
- Matéria maior tem mais peso no resultado global
- Cresce de forma **logarítmica e contínua** — não tem corte. 10 cards contribui menos que 50, que contribui menos que 150. Não existe "mínimo para entrar" — qualquer quantidade contribui proporcionalmente
- Garante que uma matéria pequena não domine o gráfico, mas ela ainda participa

---

## Colaterais

Fatores que **calibram** os pilares, nunca os substituem. Nenhum colateral por si só define o resultado.

- **Nível médio dos cards** — calibra o ceticismo contra perfeição. Nível alto atenua o ceticismo, nível baixo o aumenta. Mas mesmo nível alto não elimina o ceticismo em grandes volumes — é sempre uma combinação
- **Proporção estudada** — estudou metade da matéria = Pilar 1 mais fraco, não zero
- **Tendência** — comparação da sessão atual com a anterior. Influência de 30% sobre as proporções finais, suavizando subidas e descidas bruscas
- **Level-ups** — quantidade de cards que subiram de nível na sessão. Aplicado como bônus suave sobre a consistência (Pilar 1): `consistencia × (1 + propUpgraded × 0.2)`, onde `propUpgraded = levelUps / totalEstudados`. Bônus máximo teórico de 20% sobre a consistência, mas na prática fica entre 5–12%. Atua principalmente como **critério de desempate**: dois usuários com o mesmo desempenho, o que consolidou mais conhecimento leva vantagem. Se nenhum card subiu de nível, nenhum efeito.
- **Week streak** — indica quantos dias da semana atual o usuário estudou (0–7). O bônus é **proporcional e crescente**: começa pequeno e aumenta conforme mais dias são estudados. Fórmula: `weekBonus = (diasEstudados / 7) × 0.15`. Exemplos: 1 dia → ~2.1%, 3 dias → ~6.4%, 5 dias → ~10.7%, 7 dias → 15% (máximo). Conta apenas **uma vez por dia**, em **qualquer matéria** — é binário por dia, não por sessão ou por matéria. Nunca é fator determinante, só um leve indicador de regularidade

---

## Tendência

A cada saída de uma matéria, o sistema guarda `anterior` e `atual`.

Na próxima sessão:
- Calcula o delta entre atual e anterior
- Aplica 30% desse delta sobre as proporções da nova sessão

**Exemplo:**
- Sessão anterior: 70% acerto
- Sessão atual: 50% acerto
- Delta: -20%
- Proporção final: 50% + (-20% × 30%) = **44%**

O gráfico não despenca de 70% para 50% de uma vez — desce para 44%. Se o usuário continuar piorando, o gráfico desce progressivamente. Se melhorar, sobe progressivamente.

---

## Ceticismo contra perfeição

Perfeição absoluta (100% acerto, zero erro/quase) ativa o ceticismo. O ceticismo é **contínuo e proporcional** — não é um corte fixo. Depende simultaneamente do tamanho da matéria e do nível médio dos cards:

- Matéria pequena + nível alto + 100% acerto → ceticismo baixo, resultado razoável
- Matéria grande + nível alto + 100% acerto → ceticismo moderado, resultado conservador
- Matéria pequena + nível baixo + 100% acerto → ceticismo alto
- Matéria grande + nível baixo + 100% acerto → ceticismo máximo, gráfico quase não se move

Perfeição em larga escala nunca é totalmente aceita — aprendizado humano real sempre tem alguma diversidade. Mas isso não "pune" o usuário — só reduz a confiança interna. O gráfico ainda avança, só mais devagar.

---

## Estado visual

| Confiança global | Visual | Texto central |
|---|---|---|
| < 0.15 | Cinza / opaco | "coletando dados" |
| 0.15 – 0.20 | Começa a colorir | "Iniciando" |
| 0.20 – 0.40 | Cores suaves | "Progredindo" |
| 0.40 – 0.60 | Cores médias | "Evoluindo" |
| 0.60 – 0.75 | Cores ricas | "Bom" |
| 0.75 – 0.88 | Cores fortes | "Ótimo" |
| > 0.88 | Cores cheias | "Excelente" |

---

## Exemplos

> Em todos os exemplos abaixo, lembre: nenhum fator isolado determina o resultado. O que muda entre os exemplos é a **combinação** dos fatores — não um único número ou condição.

### Exemplo 1 — Usuário novo, primeira sessão, perfeição suspeita
- 1 matéria, 15 cards, 1 sessão, 100% acerto, nível médio 0
- Pilar 1: estudou todos os 15 → consistência razoável, mas só 1 sessão e matéria pequena
- Pilar 2: perfeição absoluta + nível 0 → ceticismo alto
- Pilar 3: 15 cards → peso pequeno
- Os 3 juntos multiplicados resultam em confiança muito baixa
- **Resultado: gráfico cinza, "coletando dados"**
- Nota: não é que 15 cards seja proibido — é que 15 cards + 1 sessão + perfeição em nível 0 juntos não convencem o sistema

---

### Exemplo 2 — Usuário consistente, múltiplas matérias, distribuição real
- 3 matérias, ~30 cards cada, 2+ sessões cada, 65–75% acerto com erros e quases reais
- Pilar 1: estudou tudo em todas, voltou mais de uma vez
- Pilar 2: distribuição crível — tem erros e quases, sem perfeição suspeita
- Pilar 3: volume razoável em todas as matérias
- Week streak: estudou 4 dias na semana → bônus leve de ~8%
- Os 3 pilares juntos resultam em confiança alta
- **Resultado: gráfico colorido, "Bom" ou "Ótimo"**
- Nota: não é que 30 cards seja o número certo — é que 30 cards + múltiplas sessões + distribuição honesta juntos constroem confiança

---

### Exemplo 3 — Sessão ruim após sessão boa, matéria parcialmente estudada
- Matéria de 80 cards
- Sessão anterior (dia 1): estudou 80/80, 65 acertos (81%)
- Sessão atual (dia 2): estudou apenas 40/80, 25 acertos (62%)
- Tendência: delta = -19%, aplica 30% → pAcerto final = ~**56%**
- Pilar 1: estudou apenas metade → consistência cai (~0.58)
- Pilar 2: tem erros e quases → credibilidade 1.0, mas proporção piorou
- Pilar 3: 80 cards → peso bom
- **Resultado: gráfico desce moderadamente — reflete queda real sem despencar, e o fato de ter estudado só metade também contribui para a queda**
- Nota: se tivesse estudado os 80 cards com o mesmo desempenho, a queda seria menor pq o Pilar 1 estaria mais forte
