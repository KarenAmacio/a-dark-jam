

anotações JS:


## Function addStoryLine()

Mostra linha de texto na tela
Estiliza texto
Salva no histórico
Chama sempre que é feito uma ação


## Function updateTime()

atualiza a hora do jogo
Verifica se passou da meia noite - e adiciona um dia se verdadeiro
sempre atualiza a hora de acordo com o tempo da função

## funcion clamp(value, min, max)

Ele serve pra garantir que um valor **fique dentro de um intervalo definido** — nem menor que o mínimo, nem maior que o máximo.

- Garantir que **energia, sanidade, progresso** nunca passem dos limites.
- basicamente: se passar do maximo retorna maximo, se passar do minimo retorna o minimo

## function endTurn(minutes = 15)

A função `endTurn()` é tipo o **fechamento de cada ação**
1. Conta que um turno passou. 
2. Atualiza o tempo do jogo.
3. Reduz os tempos de espera (cooldowns).
   - podemos aumentar o cooldown quando chama a função de ação
1. Diminui o tempo de preparo do café (se estiver sendo feito).
2. Garante que energia e sanidade fiquem dentro dos limites.


## function checkRandomEvents()

1. Verifica se certos eventos **ainda não aconteceram**.
2. Checa se as **condições estão certas** (turnos jogados, sanidade, energia).
3. Usa **sorte (Math.random)** pra decidir se o evento acontece. 
4. Se acontecer, **mostra o texto** e chama uma função pra lidar com a escolha do jogador.

se nenhum evento foi desparado a função retorna falso

até agora 3 eventos, cachorro e celular estão nessa função 
cafe foi para makecofee

## function showEventChoice(eventType)

Função é chamada quando o random event acontece.

- Limpa a área de botões (`choicesDiv.innerHTML = ''`)
- Cria botões com **opções de escolha** pro jogador
- Cada botão tem um texto e uma ação associada
- Depois de escolher, mostra o resultado e atualiza os stats do jogo

## function createButon(text, onClick, isDanger =false)
Recebe três parâmetros:

-  `text`: o texto que vai aparecer no botão.
- `onClick`: a função que será executada quando o botão for clicado.
- `isDanger`: opcional, se for `true`, aplica uma classe CSS especial (tipo botão vermelho, por exemplo).

##   function renderChoices()

É o coração do sistema de decisões do jogo. 
Ela verifica o estado atual do jogador e monta os botões disponíveis. ela:

1. Limpa os botões antigos.
2. Verifica se há eventos aleatórios (como o cachorro ou o espelho).
3. Mostra botões de ações disponíveis com base no estado atual (`state`).
4. Desativa botões com cooldowns ou condições não atendidas.
5. Adiciona opções críticas se o jogador estiver em risco.

Como funciona:

primeiro pega o elemento html onde os botões aparecem
limpa os botões anteriores e prepara para mostrar as novas opções

verifica os eventos chamando a função `checkRandomEvent()` se for disparado mostra as opções do evento e para o restante da função

ações que tem o render Choice:

- café sendo preparado + café pronto para tomar 
- fazer mais café + random event do espelho
- trabalhar - sempre disponivel, mas com cooldown
- fazer sprite
- pausa
- opções criticas - 

---------------------------------------------------------------------------

Guia de Escolhas para Cada Final

Para RECUPERAÇÃO (melhor final):
- Gerenciar bem energia e sanidade
- IMPORTANTE: Quando energia < 35, escolher "pedir ajuda"
- Completar todas as fases do jogo
- Não deixar energia/sanidade chegar a 0

Para ENTREGA TÓXICA:
- Quando aparecer "Você se sente muito cansado", escolher "ignorar e continuar" 3+ vezes
- NUNCA escolher "pedir ajuda"
- Gerenciar minimamente energia para não morrer
- Completar o jogo

Para SOBREVIVÊNCIA:
- NUNCA escolher "pedir ajuda"
- Ignorar avisos menos de 3 vezes (0-2 vezes)
- Gerenciar energia/sanidade razoavelmente
- Completar o jogo

Para COLAPSO:
- Apenas deixe energia ou sanidade chegarem a 0
- Ignore todas as pausas e ajuda
- Beba muito café sem descansar

Dicas Estratégicas:
- Café dá energia (+boost baseado em quantidade), mas tira sanidade (-2)
- Pausas recuperam energia (+15) e sanidade (+15)
- Pedir ajuda recupera sanidade (+25), progresso (+20) e energia (+10)
- Ignorar avisos dá progresso (+12), mas tira muita sanidade (-20) e energia (-10)
