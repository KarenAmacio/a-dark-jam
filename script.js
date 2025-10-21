
        const state = {
            energy: 70,
            progress: 0,
            sanity: 100,
            coffees: 0,
            workSessions: 0,
            spriteMade: false,
            askedForHelp: false,
            lastHelpDay: 0,
            ignoredWarnings: 0,
            turnsPlayed: 0,
            phase: 'beginning',
            time: 19 * 60 + 45, // minutos desde meia-noite - isso significa 19:45
            day: 1,
            
            // Cooldowns (em turnos)
            coffeeCooldown: 0,
            workCooldown: 0,
            spriteCooldown: 0,
            pauseCooldown: 0,
            
            // Estados de eventos
            coffeeLocked: true,
            coffeeBrewTime: 0,
            dogEventShown: false,
            phoneEventShown: false,
            mirrorEventShown: false
        };

        // Registro simples das linhas mostradas no log de história.
        // Guarda apenas as strings para possíveis usos futuros (debug, replays, savestates).
        const storyLog = [];

        /**
         * Adiciona uma linha ao log de história (DOM + array `storyLog`).
         * @param {string} text - Texto da linha a ser exibida (pode ser string vazia para espaçamento).
         * @param {boolean} isEvent - Se true, aplica a classe CSS 'event' para estilizar diferentemente.
         *
         * Observações:
         * - A função também aplica, aleatoriamente, a classe 'glitch' quando a sanidade está baixa
         *   para dar um efeito visual de degradação mental.
         * - Mantém o scroll no final do container para que as linhas novas fiquem visíveis.
         */
        function addStoryLine(text, isEvent = false) {
            // Obtemos o container do log na página
            const logDiv = document.getElementById('story-log');

            // Criamos um elemento <div> para a nova linha e definimos suas classes
            const line = document.createElement('div');
            line.className = 'story-line' + (isEvent ? ' event' : '');
            line.textContent = text; // atribui o texto (pode ser "" para linha em branco)

            // Adiciona ao DOM e força o scroll para mostrar a linha recém-adicionada
            logDiv.appendChild(line);
            logDiv.scrollTop = logDiv.scrollHeight;

            // Guarda também no array de histórico (útil para salvar/rever sessões)
            storyLog.push(text);

            // Efeito visual: quando a sanidade está baixa, há uma chance de aplicar 'glitch'
            // Isso acrescenta variedade visual e comunica o estado do personagem.
            if (state.sanity < 30 && Math.random() < 0.3) {
                line.classList.add('glitch');
            }
        }


        // função para atualizar o display de tempo
        function updateTime(minutes = 15) {
            state.time += minutes;
            //verifica se passou da meia-noite - adiciona um dia se for true
            if (state.time >= 24 * 60) {
                state.time -= 24 * 60;
                state.day++;

                forceSleep(); //chama a função de forçar o sono
                return; //sai da função para evitar atualizar o display duas vezes
            }

            //atualiza o display de tempo
             const hours = Math.floor(state.time / 60);
            const mins = state.time % 60;
            const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
            document.getElementById('time-display').textContent = `DIA ${state.day} - ${timeStr}`;
            }

            //função para forçar o sono ao passar da meia-noite
        function forceSleep() {
                addStoryLine("");
                addStoryLine("Você não percebe, mas o cansaço vence.");
                addStoryLine("A tela escurece. Você dorme.");
                addStoryLine("...");
                addStoryLine("Você acorda no dia seguinte, um pouco mais descansado.");

                state.energy = Math.min(100, state.energy + 30);
                state.sanity = Math.min(100, state.sanity + 10);
                state.coffeeCooldown = 0;
                state.coffeeBrewTime = 0;

                renderChoices();
                }

        // Helper simples para garantir que valores fiquem dentro de um intervalo
        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        /**
         * Centraliza o fim de turno: incrementa turnsPlayed, atualiza tempo,
         * decrementa cooldowns e aplica clamps em energia/sanidade.
         * Chame essa função ao final de qualquer ação que consome um turno.
         */
        function endTurn(minutes = 15) {
            //quantas ações o jogador fez
            state.turnsPlayed++;
            // chama a função que avança o relógio do jogo.
            updateTime(minutes);

            // Decrementa todos os cooldowns de maneira genérica
            state.coffeeCooldown = Math.max(0, state.coffeeCooldown - 1);
            state.workCooldown = Math.max(0, state.workCooldown - 1);
            state.spriteCooldown = Math.max(0, state.spriteCooldown - 1);
            state.pauseCooldown = Math.max(0, state.pauseCooldown - 1);

            // REDUZ tempo de preparo do café (em turnos)
          if (state.coffeeBrewTime > 0) {
            state.coffeeBrewTime--;
            if (state.coffeeBrewTime === 0) {
                state.coffees += 15;
                state.coffeeCooldown = 0;
                addStoryLine("o café está pronto.");
                renderChoices(); // mostra botão “tomar café”
            } else {
                // ainda falta 1 turno → agenda o próximo automaticamente
                setTimeout(() => {
                endTurn(5); // avança mais um turno
                renderChoices();
                }, 1500);
            }
            }

            // Garante limites para recursos vitais
            state.energy = clamp(state.energy, 0, 100);
            state.sanity = clamp(state.sanity, 0, 100);
        }

        function updateCooldowns() {
            state.coffeeCooldown = Math.max(0, state.coffeeCooldown - 1);
            state.workCooldown = Math.max(0, state.workCooldown - 1);
            state.spriteCooldown = Math.max(0, state.spriteCooldown - 1);
            state.pauseCooldown = Math.max(0, state.pauseCooldown - 1);
            
            if (state.coffeeBrewTime > 0) {
                state.coffeeBrewTime--;
            }
        }

        function checkRandomEvents() {
            // Evento do cachorro
            if (!state.dogEventShown && state.turnsPlayed >= 3 && Math.random() < 0.30) {
                state.dogEventShown = true;
                addStoryLine("", true);
                addStoryLine("você ouve latidos lá fora.", true);
                addStoryLine("seu cachorro quer entrar.", true);
                showEventChoice('dog');
                return true;
            }
            
            // Evento do celular
            if (!state.phoneEventShown && state.turnsPlayed >= 5 && state.sanity < 60 && Math.random() < 0.25) {
                state.phoneEventShown = true;
                addStoryLine("", true);
                addStoryLine("o celular vibra na mesa.", true);
                addStoryLine("é alguém que você conhece.", true);
                showEventChoice('phone');
                return true;
            }
            // evento do café foi mudado para dentro da função makeCoffee 
            return false;
        }

        function showEventChoice(eventType) {
            //limpa as escolhas atuais
            const choicesDiv = document.getElementById('choices');
            choicesDiv.innerHTML = '';
            

            //evento do cachorro
            if (eventType === 'dog') {
                createButton('ir ver', () => {
                    addStoryLine("");
                    addStoryLine("você abre a porta. olha ao redor.");

                    if (Math.random() < 0.2) {
                    // Pegou o competidor no flagra
                    addStoryLine("um vulto corre pelo corredor.");
                    addStoryLine("você grita. ele foge.");
                    addStoryLine("era um competidor tentando sabotar sua energia.");
                    addStoryLine("você evita a perda e se sente mais alerta.");
                    state.sanity += 10;
                    state.energy += 10;
                    } else {
                    // Era só o cachorro
                    addStoryLine("não tem ninguém. só o cachorro abanando o rabo.");
                    addStoryLine("ele entra e deita aos seus pés.");
                    addStoryLine("você se sente menos sozinho.");
                    state.sanity += 15;
                    state.energy += 5;
                    }

                    setTimeout(() => renderChoices(), 2000);
                });

                createButton('ignorar', () => {
                    addStoryLine("");
                    addStoryLine("você volta ao teclado.");
                    addStoryLine("os latidos param depois de um tempo.");

                    if (Math.random() < 0.2) {
                    // Sabotagem acontece
                    addStoryLine("");
                    addStoryLine("de repente, a luz pisca.");
                    addStoryLine("a energia cai. tudo desliga.");
                    addStoryLine("você perdeu parte do progresso.");
                    state.progress = Math.max(0, state.progress - 20);
                    state.sanity -= 15;
                    } else {
                    // Nada acontece
                    addStoryLine("nada acontece. só silêncio.");
                    state.sanity -= 5;
                    }

                    setTimeout(() => renderChoices(), 2000);
                }, true);
            }

            //evento do celular
            else if (eventType === 'phone') {
                createButton('atender', () => {
                    addStoryLine("");
                    addStoryLine("você atende. uma voz familiar.");
                    addStoryLine("'como você está?'");
                    addStoryLine("você conversa por alguns minutos.");
                    addStoryLine("você se sente um pouco melhor.");
                    state.sanity += 10;
                    state.energy += 5;
                    updateTime(20);
                    setTimeout(() => renderChoices(), 2000);
                });
                createButton('ignorar', () => {
                    addStoryLine("");
                    addStoryLine("o telefone para de vibrar.");
                    addStoryLine("silêncio novamente, você se sente sozinho.");
                    state.sanity -= 10;
                    setTimeout(() => renderChoices(), 2000);
                }, true);

                //evento do espelho
            } else if (eventType === 'mirror') {
                createButton('encarar o reflexo', () => {
                    addStoryLine("");
                    addStoryLine("você encara o espelho.");
                    addStoryLine("por um instante, o reflexo não acompanha seu movimento.");
                    addStoryLine("ele sorri. você não.");
                    addStoryLine("um arrepio percorre sua espinha.");
                    state.sanity -= 12;
                    setTimeout(() => renderChoices(), 2000);
                });

                createButton('desviar o olhar', () => {
                    addStoryLine("");
                    addStoryLine("você evita o espelho.");
                    addStoryLine("não hoje. não agora.");
                    state.sanity -= 3;
                    setTimeout(() => renderChoices(), 2000);
                });

                createButton('cobrir o espelho', () => {
                    addStoryLine("");
                    addStoryLine("você pega um pano e cobre o espelho.");
                    addStoryLine("não quer mais ver aquilo.");
                    addStoryLine("mas sente que algo ficou preso lá dentro.");
                    state.sanity -= 5;
                    state.energy -= 5;
                    setTimeout(() => renderChoices(), 2000);
                });
                }

        }


        //cria o botão de escolha 
        function createButton(text, onClick, isDanger = false) {
            const button = document.createElement('button');
            button.textContent = text;
            if (isDanger) button.className = 'danger';
            button.onclick = onClick;
            document.getElementById('choices').appendChild(button);
        }

        function renderChoices() {
            const choicesDiv = document.getElementById('choices');
            choicesDiv.innerHTML = '';
            
            // Verifica eventos aleatórios primeiro
            if (checkRandomEvents()) {
                return;
            }

             // Fazer mais café
            if (state.coffeeCooldown === 0 && state.coffeeBrewTime === 0 && state.coffees === 0) {
                const button = document.createElement('button');
                button.textContent = 'fazer café';
                button.onclick = () => makeCoffee();
                choicesDiv.appendChild(button);
            }
            
            // Café sendo preparado
            if (state.coffeeBrewTime > 0) {
                const button = document.createElement('button');
                button.textContent = `preparando café... (${state.coffeeBrewTime})`;
                button.disabled = true;
                choicesDiv.appendChild(button);
            }
            
            // Café pronto para tomar
            if (state.coffeeCooldown === 0 && state.coffees > 0) {
                const button = document.createElement('button');
                button.textContent = 'tomar café';
                button.onclick = () => drinkCoffee();
                choicesDiv.appendChild(button);
            }
            
            
            // Trabalhar (sempre disponível depois da primeira vez, mas com cooldown)
            if (state.turnsPlayed >= 1 && !state.coffeeLocked) {
                const button = document.createElement('button');
                if (state.workCooldown > 0) {
                    button.textContent = `trabalhar no projeto (aguarde ${state.workCooldown})`;
                    button.disabled = true;
                } else {
                    button.textContent = 'trabalhar no projeto';
                    button.onclick = () => work();
                }
                choicesDiv.appendChild(button);
            }
            
            // Fazer sprite
            if (state.turnsPlayed >= 2 && !state.coffeeLocked && !state.spriteMade) {
                const button = document.createElement('button');
                if (state.spriteCooldown > 0) {
                    button.textContent = `fazer sprite (aguarde ${state.spriteCooldown})`;
                    button.disabled = true;
                } else {
                    button.textContent = 'fazer sprite';
                    button.onclick = () => makeSprite();
                }
                choicesDiv.appendChild(button);
            }
            
            // Pausa
            if (state.turnsPlayed >= 6) {
                const button = document.createElement('button');
                if (state.pauseCooldown > 0) {
                    button.textContent = `fazer uma pausa (aguarde ${state.pauseCooldown})`;
                    button.disabled = true;
                } else {
                    button.textContent = 'fazer uma pausa';
                    button.onclick = () => takePause();
                }
                choicesDiv.appendChild(button);
            }
            
            // Opções críticas: se mais de 4 turnos jogados e energia baixa
            // opção chamar ajuda só uma vez ao dia
            // opção ignorar o cansaço sempre disponível
           if (state.turnsPlayed >= 4 && state.energy < 35) {
                if (state.lastHelpDay !== state.day) {
                    const button = document.createElement('button');
                    button.textContent = 'pedir ajuda';
                    button.onclick = () => {
                    askForHelp();
                    state.lastHelpDay = state.day; // registra o dia em que pediu ajuda
                    };
                    choicesDiv.appendChild(button);
                }

                const button = document.createElement('button');
                button.textContent = 'ignorar o cansaço';
                button.className = 'danger';
                button.onclick = () => ignoreWarning();
                choicesDiv.appendChild(button);
                }
        }


       function makeCoffee() {
                addStoryLine("");
                addStoryLine("você se levanta.");
                addStoryLine("caminha até a cozinha.");
                addStoryLine("água na máquina. pó no filtro.");
                addStoryLine("o café começa a gotejar.");

                // Evento do espelho 
                if (!state.mirrorEventShown && state.sanity < 40 && state.energy < 30 && Math.random() < 0.2) {
                    state.mirrorEventShown = true;
                    addStoryLine("", true);
                    addStoryLine("você olha para o espelho na cozinha...", true);
                    addStoryLine("algo está diferente.", true);
                    showEventChoice('mirror');
                    return true;
                }

                state.coffeeBrewTime = 2; // inicia preparo
                state.coffeeLocked = true;
                endTurn(5);               // avança tempo e reduz brewTime
                renderChoices();          // atualiza interface
                }

            //tomar café
        function drinkCoffee() {
            const texts = [
                ["você toma o café.", "está quente. amargo.", "você sente o corpo despertar um pouco."],
                ["mais café.", "o gosto já é familiar.", "como um ritual."],
                ["a xícara está morna.", "você bebe mesmo assim.", "precisa continuar."],
                ["você mal sente o gosto.", "apenas o hábito.", "a necessidade."]
            ];
            
            const index = Math.min(state.coffees - 1, texts.length - 1);
            addStoryLine("");
            texts[index].forEach(line => addStoryLine(line));
            
            const boost = Math.floor(state.coffees * 2);
            state.energy = Math.min(100, state.energy + boost);
            state.sanity -= 2;
            state.coffeeCooldown = 3;
            state.coffees--;
            state.coffeeLocked = false;
            endTurn(10);
            
            setTimeout(() => renderChoices(), 1500);
        }

        function work() {
            const texts = [
                ["você abre o editor.", "a tela pisca. cursor pulsando.", "você começa a escrever."],
                ["mais linhas de código.", "algumas funcionam.", "outras não."],
                ["você corrige um bug.", "três novos aparecem.", "mas você continua."],
                ["as linhas começam a se embaralhar.", "você pisca. tenta focar.", "continua digitando."],
                ["você não tem certeza do que está fazendo.", "mas suas mãos continuam.", "músculo. memória."]
            ];
            
            const index = Math.min(Math.floor(state.workSessions / 2), texts.length - 1);
            addStoryLine("");
            texts[index].forEach(line => addStoryLine(line));
            
            const efficiency = Math.max(5, 15 - state.workSessions);
            state.progress += efficiency;
            state.energy -= 15;
            state.sanity -= 5;
            state.workSessions++;
            state.workCooldown = 2;
            endTurn(30);
            
            if (state.workSessions >= 3 && state.phase === 'beginning') {
                state.phase = 'deteriorating';
                document.body.className = 'deteriorating';
            }
            if (state.workSessions >= 6 && state.phase === 'deteriorating') {
                state.phase = 'collapsing';
                document.body.className = 'collapsing';
            }
            if (state.sanity < 20 || state.energy < 20) {
                document.body.classList.add('critical');
            }
            
            checkGameOver();
            setTimeout(() => renderChoices(), 1500);
        }

        function makeSprite() {
            addStoryLine("");
            addStoryLine("você abre o paint.");
            addStoryLine("pixel por pixel.");
            addStoryLine("um quadrado vermelho. um quadrado azul.");
            addStoryLine("é... um sprite.");
            
            state.spriteMade = true;
            state.progress += 10;
            state.energy -= 10;
            endTurn(25);
            
            checkGameOver();
            setTimeout(() => renderChoices(), 1500);
        }

        function takePause() {
            addStoryLine("");
            addStoryLine("você se levanta.");
            addStoryLine("caminha até a janela.");
            addStoryLine("lá fora ainda existe um mundo.");
            addStoryLine("você respira fundo.");
            
            state.energy += 15;
            state.sanity += 15;
            state.pauseCooldown = 4;
            endTurn(20);
            
            setTimeout(() => renderChoices(), 2000);
        }

        function askForHelp() {
            addStoryLine("");
            addStoryLine("você abre o discord.");
            addStoryLine("digita uma mensagem.");
            addStoryLine("...");
            addStoryLine("alguém responde.");
            addStoryLine("não está sozinho nisso.");
            
            state.askedForHelp = true;
            state.sanity += 25;
            state.progress += 20;
            state.energy += 10;
            endTurn(40);
            
            checkGameOver();
            setTimeout(() => renderChoices(), 2000);
        }

        function ignoreWarning() {
            addStoryLine("");
            addStoryLine("você ignora o peso nas pálpebras.");
            addStoryLine("ignora a dor de cabeça.");
            addStoryLine("ignora tudo.");
            addStoryLine("menos o código.");
            
            state.ignoredWarnings++;
            state.progress += 12;
            state.sanity -= 20;
            state.energy -= 10;
            endTurn(35);
            
            if (state.ignoredWarnings >= 2) {
                const lines = document.querySelectorAll('.story-line');
                lines.forEach(line => {
                    if (Math.random() < 0.5) line.classList.add('glitch');
                });
            }
            
            checkGameOver();
            setTimeout(() => renderChoices(), 1500);
        }

        function checkGameOver() {
            if (state.progress >= 100) {
                if (state.askedForHelp) {
                    showEnding('recovery');
                } else if (state.ignoredWarnings >= 3) {
                    showEnding('toxic');
                } else {
                    showEnding('normal');
                }
                return true;
            }

            if (state.energy <= 0 || state.sanity <= 0) {
                showEnding('collapse');
                return true;
            }

            return false;
        }

        function showEnding(type) {
            const endings = {
                recovery: [
                    "",
                    "você desacelera.",
                    "pede ajuda.",
                    "aceita que não precisa fazer tudo sozinho.",
                    "",
                    "o jogo fica pronto.",
                    "você se orgulha dele.",
                    "",
                    "e mais importante:",
                    "você ainda está inteiro.",
                    "",
                    "[ FIM - RECUPERAÇÃO ]"
                ],
                toxic: [
                    "",
                    "você entrega o jogo.",
                    "ele funciona.",
                    "",
                    "mas quando você fecha o computador,",
                    "algo está diferente.",
                    "",
                    "você pagou um preço.",
                    "não tem certeza se valeu.",
                    "",
                    "[ FIM - ENTREGA TÓXICA ]"
                ],
                collapse: [
                    "",
                    "o mundo se fecha.",
                    "",
                    "as bordas escurecem.",
                    "",
                    "o texto embaralha.",
                    "",
                    "você tentou.",
                    "mas era demais.",
                    "",
                    "[ FIM - COLAPSO ]"
                ],
                normal: [
                    "",
                    "você termina o jogo.",
                    "ele não é perfeito.",
                    "",
                    "mas está pronto.",
                    "você sobreviveu.",
                    "",
                    "a game jam começa amanhã.",
                    "",
                    "[ FIM - SOBREVIVÊNCIA ]"
                ]
            };

            setTimeout(() => {
                endings[type].forEach((line, index) => {
                    setTimeout(() => addStoryLine(line), index * 800);
                });
                
                if (type === 'collapse') {
                    setTimeout(() => {
                        document.body.style.opacity = '0';
                    }, endings[type].length * 800 + 2000);
                }
            }, 1000);

            document.getElementById('choices').innerHTML = '';
        }

        // Inicialização
        function startGame() {
            addStoryLine("você está no quarto.");
            addStoryLine("sentado no computador.");
            addStoryLine("a caneca de café está quase vazia.");
            addStoryLine("");
            addStoryLine("faltam dois dias para a game jam.");
            
            setTimeout(() => renderChoices(), 2000);
        }

        startGame();
