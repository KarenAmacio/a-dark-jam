
        const state = {
            // Atributos do jogador
            energy: 70,
            progress: 0,
            sanity: 100,
            coffees: 0,
            testSessions: 0,
            spriteMade: false,
            askedForHelp: false,
            lastHelpDay: 0,
            ignoredWarnings: 0,
            turnsPlayed: 0,
            phase: 'beginning',
            time: 16 * 60 + 45, // minutos desde meia-noite - isso significa 16:45
            day: 1,
            

            // Estados de eventos
            coffeeLocked: true,
            coffeeBrewTime: 0,
            dogEventShown: false,
            phoneEventShown: false,
            mirrorEventShown: false,
            ignoredWarningEvent: false,

            //fases do jogo
            spriteCount: 0, maxSprites: 5,
            mapCount: 0, maxMaps: 3,
            characterCount: 0, maxCharacters: 4,
            dialogueCount: 0, maxDialogues: 6,
            testCount: 0, maxTests: 4,
            rebugCount: 0, maxRebugs: 3,
            buildCount: 0, maxBuilds: 2,

            // Sistema de save
            lastSave: null, // guarda o estado do último save
            saveAvailable: false, // controla se o botão de save está visível
            saveTimeout: null, // guarda o timeout do botão de save

        };


        // Guarda os valores máximos automaticamente
        const maxCooldowns = {};

        // Wrapper pro objeto cooldowns que captura o valor máximo
        const cooldowns = new Proxy({
            makeCoffeeCooldown: 0,
            drinkCoffeeCooldown: 0,
            makeSpriteCooldown: 0,
            makeMapCooldown: 0,
            makeCharacterCooldown: 0,
            makeDialogueCooldown: 0,
            testGameCooldown: 0,
            rebugGameCooldown: 0,
            buildGameCooldown: 0,
            takePauseCooldown: 0,
            askForHelpCooldown: 0,
            coffeeBrewTime: 0,
            
        }, {
            set(target, key, value) {
                // Se tá setando um valor > 0 e não tem max guardado ainda, guarda
                if (value > 0 && !maxCooldowns[key]) {
                    maxCooldowns[key] = value;
                }
                target[key] = value;
                return true;
            }
        });


        //flag para evitar múltiplas ações simultâneas
        let actionInProgress = false;
        let eventActive = false;
        let eventButtons = false;


        // Desabilita todos os botões para evitar cliques múltiplos
        function disableAllButtons() {
            actionInProgress = true;
            const buttons = document.querySelectorAll('#choices button');
            buttons.forEach(btn => btn.disabled = true);
            renderChoices();
        }


        // Regras para disponibilidade de tarefas 
        const taskRules = {
            // Utilitários / ações de jogador
            makeCoffee: {
                prerequisite: (s) => s.coffeeBrewTime === 0 && (s.coffees || 0) === 0,
                countKey: null,
                limitKey: null,
                cooldownKey: 'makeCoffeeCooldown'
            },

            drinkCoffee: {
                prerequisite: (s) => (s.coffees || 0) > 0,
                countKey: null,
                limitKey: null,
                cooldownKey: 'drinkCoffeeCooldown'
            },

            takePause: {
                prerequisite: (s) => (s.turnsPlayed || 0) >= 6,
                countKey: null,
                limitKey: null,
                cooldownKey: 'takePauseCooldown'
            },

            askForHelp: {
                prerequisite: (s) => (s.turnsPlayed || 0) >= 4 && (s.energy || 0) < 35 && s.lastHelpDay !== s.day,
                countKey: null,
                limitKey: null,
                cooldownKey: 'askForHelpCooldown'
            },

            ignoreWarning: {
                prerequisite: (s) => (s.turnsPlayed || 0) >= 4 && (s.energy || 0) < 35,
                countKey: null,
                limitKey: null,
                cooldownKey: 'ignoreWarningCooldown'
            },

            // Fases do jogo
            makeSprite: {
                prerequisite: (s) => s.coffeeLocked === false,
                countKey: 'spriteCount',
                limitKey: 'maxSprites',
                cooldownKey: 'makeSpriteCooldown'
            },

            makeMap: {
                prerequisite: (s) => (s.spriteCount || 0) >= (s.maxSprites || 0),
                countKey: 'mapCount',
                limitKey: 'maxMaps',
                cooldownKey: 'makeMapCooldown'
            },

            makeCharacter: {
                prerequisite: (s) => (s.mapCount || 0) >= (s.maxMaps || 0),
                countKey: 'characterCount',
                limitKey: 'maxCharacters',
                cooldownKey: 'makeCharacterCooldown'
            },

            makeDialogue: {
                prerequisite: (s) => (s.characterCount || 0) >= (s.maxCharacters || 0),
                countKey: 'dialogueCount',
                limitKey: 'maxDialogues',
                cooldownKey: 'makeDialogueCooldown'
            },

            testGame: {
                prerequisite: (s) => (s.dialogueCount || 0) >= 3,
                countKey: 'testCount',
                limitKey: 'maxTests',
                cooldownKey: 'testGameCooldown'
            },

            rebugGame: {
                prerequisite: (s) => (s.testCount || 0) >= 1,
                countKey: 'rebugCount',
                limitKey: 'maxRebugs',
                cooldownKey: 'rebugGameCooldown'
            },

            buildGame: {
                prerequisite: (s) => (s.rebugCount || 0) >= 1 && (s.energy || 0) >= 40 && (s.sanity || 0) >= 50,
                countKey: 'buildCount',
                limitKey: 'maxBuilds',
                cooldownKey: 'buildGameCooldown'
            },

            publishGame: {
                prerequisite: (s) => (s.buildCount || 0) >= 1,
                countKey: null,
                limitKey: null,
                cooldownKey: 'publishGameCooldown'
            },

            quickSave: {
                prerequisite: (s) => s.saveAvailable === true,
                countKey: null,
                limitKey: null,
                cooldownKey: null
            }

    };

        // Verifica se uma tarefa está disponível com base nas regras definidas
        function isTaskAvailable(taskName, s = state) {
            const rule = taskRules[taskName];
            if (!rule) return false;

            // checa prerequisite se existir
            if (rule.prerequisite && !rule.prerequisite(s)) return false;

            // se não há contagem/limite, retorna true (ignora cooldown aqui)
            if (!rule.countKey) return true;

            // caso haja contagem/limite, checa isso
            const count = s[rule.countKey] || 0;
            const limit = rule.limitKey ? (s[rule.limitKey] || Infinity) : Infinity;
            return count < limit;
        }

        function checkSaveEvent() {
            // Só aparece se:
            // - Já fez pelo menos 2 sprites OU 1 mapa OU 1 personagem
            // - Tem pelo menos 10 turnos jogados
            // - Não está com save disponível no momento
            // - 15% de chance por turno
            
            if (state.saveAvailable) return false;
            
            const hasProgress = state.spriteCount >= 2 || state.mapCount >= 1 || state.characterCount >= 1;
            const enoughTurns = state.turnsPlayed >= 10;
            
            if (hasProgress && enoughTurns && Math.random() < 0.15) {
                triggerSaveEvent();
                return true;
            }
            
            return false;
        }

        // Dispara o evento de save
        function triggerSaveEvent() {
            state.saveAvailable = true;
            
            addStoryLine("", true);
            addStoryLine("você se lembra de salvar o projeto.", true);
            
            renderChoices();
            
            // Remove o botão após 3 segundos
            state.saveTimeout = setTimeout(() => {
                state.saveAvailable = false;
                addStoryLine("você esqueceu de salvar.", true);
                renderChoices();
            }, 3000);
        }
        
        function quickSave() {
            disableAllButtons();
            
            // Cancela o timeout se existir
            if (state.saveTimeout) {
                clearTimeout(state.saveTimeout);
                state.saveTimeout = null;
            }
            
            // Salva o estado atual
            state.lastSave = {
                spriteCount: state.spriteCount,
                mapCount: state.mapCount,
                characterCount: state.characterCount,
                dialogueCount: state.dialogueCount,
                testCount: state.testCount,
                rebugCount: state.rebugCount,
                buildCount: state.buildCount,
                progress: state.progress,
                energy: state.energy,
                sanity: state.sanity,
                day: state.day,
                time: state.time
            };
            
            state.saveAvailable = false;
            
            delayedLines([
                "",
                "você salva o projeto.",
                "ctrl+s. um hábito.",
                "você respira aliviado.",
                ""
            ], () => {
                state.sanity += 5;
                if (checkGameOver()) return;
                endTurn(1);
                renderChoices();
            });
        }

        function loadLastSave() {
            if (!state.lastSave) {
                // Se nunca salvou, perde TUDO
                addStoryLine("", true);
                addStoryLine("você nunca salvou o projeto.", true);
                addStoryLine("tudo se foi.", true);
                addStoryLine("", true);
                
                state.spriteCount = 0;
                state.mapCount = 0;
                state.characterCount = 0;
                state.dialogueCount = 0;
                state.testCount = 0;
                state.rebugCount = 0;
                state.buildCount = 0;
                state.progress = 0;
            } else {
                // Restaura o último save
                addStoryLine("", true);
                addStoryLine("você carrega o último save.", true);
                addStoryLine(`voltou para: sprite ${state.lastSave.spriteCount}/${state.maxSprites}`, true);
                if (state.lastSave.mapCount > 0) {
                    addStoryLine(`mapa ${state.lastSave.mapCount}/${state.maxMaps}`, true);
                }
                addStoryLine("", true);
                
                state.spriteCount = state.lastSave.spriteCount;
                state.mapCount = state.lastSave.mapCount;
                state.characterCount = state.lastSave.characterCount;
                state.dialogueCount = state.lastSave.dialogueCount;
                state.testCount = state.lastSave.testCount;
                state.rebugCount = state.lastSave.rebugCount;
                state.buildCount = state.lastSave.buildCount;
                state.progress = state.lastSave.progress;
            }
        }


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
        // função para adicionar linhas com delay
        function delayedLines(lines, finalCallback) {
                let delay = 0;
                lines.forEach((line, i) => {
                    setTimeout(() => addStoryLine(line), delay);
                    delay += 1500;
                });

                if (finalCallback) {
                    setTimeout(finalCallback, delay);
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
                delayedLines([
                    "",
                    "Você não percebe, mas o cansaço vence.",
                    "A tela escurece. Você dorme.",
                    "...",
                    "Você acorda no dia seguinte, é 4h da manhã.",
                    "Levanta cara, você tem que ir pra WEG.",
                    "Você aperta muito parafuso e volta pra casa. Ta na hora de voltar pro jogo.",
                ]);

                state.energy = Math.min(100, state.energy + 50);
                state.sanity = Math.min(100, state.sanity + 10);
                cooldowns.drinkCoffeeCooldown = 0;
                state.coffeeBrewTime = 0;

                renderChoices();
                }

        // Helper simples para garantir que valores fiquem dentro de um intervalo
        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        /**
         * Centraliza o fim de turno: incrementa turnsPlayed, atualiza tempo,
         * 
         * Chame essa função ao final de qualquer ação que consome um turno.
         */




       // ==== ⏳ AVANÇO AUTOMÁTICO DO TURNO POR TEMPO REAL ====
        let tickRunning = false; // verdadeiro se o tick estiver ativo

        function tick() {
            let hasActiveCooldowns = false;
            
            for (let key in cooldowns) {
                if (cooldowns[key] > 0) {
                    cooldowns[key]--;
                    hasActiveCooldowns = true;
                }
            }
            
            if (state.coffeeBrewTime > 0) {
                state.coffeeBrewTime--;
                cooldowns.coffeeBrewTime = state.coffeeBrewTime; // ← sincroniza com cooldowns
                hasActiveCooldowns = true;
                
                if (state.coffeeBrewTime === 0) {
                    state.coffees += 15;
                    addStoryLine("O café está pronto.");
                    renderChoices();
                }
            }
            
            if (hasActiveCooldowns) {
                renderChoices();
                setTimeout(tick, 1000);
            } else {
                tickRunning = false; // libera quando acabar
                renderChoices();
            }
        }

        function endTurn(minutes = 1) {
            state.turnsPlayed++;
            updateTime(minutes);
            
            // Só inicia tick se não estiver rodando
            if (!tickRunning) {
                const hasAnyCooldown = Object.values(cooldowns).some(cd => cd > 0) || state.coffeeBrewTime > 0;
                if (hasAnyCooldown) {
                    tickRunning = true;
                    setTimeout(tick, 1000);
                } else {
                    renderChoices();
                }
            }
            
            actionInProgress = false;

            state.energy = clamp(state.energy, 0, 100);
            state.sanity = clamp(state.sanity, 0, 100);
        }

        

        function checkRandomEvents() {
            // Evento do cachorro
            if (!state.dogEventShown && state.turnsPlayed >= 3 && Math.random() < 0.15) {
                state.dogEventShown = true;
                addStoryLine("", true);
                addStoryLine("você ouve latidos lá fora.", true);
                addStoryLine("", true);
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
            eventActive = true;
            actionInProgress = false;
            eventButtons = true;

            //limpa as escolhas atuais
            const choicesDiv = document.getElementById('choices');
            choicesDiv.innerHTML = '';
            

            //evento do cachorro
            if (eventType === 'dog') {
                createButton('ir ver', () => {
                    disableAllButtons(); // ← ADICIONE ISSO
                    
                    delayedLines([
                        "",
                        "você abre a porta. olha ao redor."
                    ], () => {
                        // ← Callback executa DEPOIS das linhas acima
                        
                        if (Math.random() < 0.2) {
                            // Pegou o competidor no flagra
                            delayedLines([
                                "",
                                "um vulto corre pelo corredor.",
                                "você grita. ele foge.",
                                "era um competidor tentando sabotar sua energia.",
                                "você evita a perda e se sente mais alerta.",
                                ""
                            ], () => {
                                // ← Modifica state DENTRO do callback
                                state.sanity += 10;
                                state.energy += 10;
                                
                                if (checkGameOver()) return;
                                endTurn(10); 
                                eventActive = false; 
                            });
                        } else {
                            // Era só o cachorro
                            delayedLines([
                                "",
                                "não tem ninguém. só o cachorro abanando o rabo.",
                                "você fala pra ele ficar quieto.",
                                "algo estranho paira no ar, mas você não consegue identificar.",
                                ""
                            ], () => {
                                // ← Modifica state DENTRO do callback
                                state.sanity += 15;
                                state.energy += 5;
                                
                                if (checkGameOver()) return;
                                endTurn(5); 
                                eventActive = false; 
                            });
                        }
                    });
                });

                createButton('ignorar', () => {
                    disableAllButtons();
                    
                    delayedLines([
                        "",
                        "você decide ignorar.",
                        "os latidos continuam.",
                        "mas você foca no seu trabalho.",
                        ""
                    ], () => {
                        if (Math.random() < 0.2) {
                            // Sabotagem acontece - PERDE PROGRESSO
                            delayedLines([
                                "",
                                "de repente, a luz pisca.",
                                "a energia cai. tudo desliga.",
                                ""
                            ], () => {
                                loadLastSave(); // ← CHAMA A FUNÇÃO DE CARREGAR SAVE
                                state.sanity -= 20; // Perde mais sanidade por perder progresso
                                
                                if (checkGameOver()) return;
                                endTurn(5);
                                eventActive = false;
                            });
                        } else {
                            // Nada acontece
                            delayedLines([
                                "",
                                "nada acontece. só silêncio.",
                                ""
                            ], () => {
                                state.sanity -= 5;
                                if (checkGameOver()) return;
                                endTurn(5);
                                eventActive = false;
                            });
                        }
                    });
                });


                // === EVENTO CELULAR ===

                } else if (eventType === 'phone') {
                    createButton('atender', () => {
                        disableAllButtons();

                        delayedLines([
                            "",
                            "você atende. uma voz familiar.",
                            "'como você está?'",
                            "você conversa por alguns minutos.",
                            "você se sente um pouco melhor.",
                            ""
                        ], () => {
                            state.sanity += 10;
                            state.energy += 5;
                            updateTime(20);
                            if (checkGameOver()) return;
                            endTurn(20);
                            eventActive = false;
                        });
                    });

                    createButton('ignorar', () => {
                        disableAllButtons();
                        delayedLines([
                            "",
                            "você decide não atender.",
                            "o telefone para de vibrar.",
                            "silêncio novamente, você se sente sozinho.",
                            ""
                        ], () => {
                            state.sanity -= 10;
                            if (checkGameOver()) return;
                            endTurn(5);
                            eventActive = false;
                        });
                    });

                // === EVENTO ESPELHO ===
                } else if (eventType === 'mirror') {
                    createButton('encarar o reflexo', () => {
                        disableAllButtons();
                        delayedLines([
                            "",
                            "você encara o espelho.",
                            "por um instante, o reflexo não acompanha seu movimento.",
                            "ele sorri. você não.",
                            "um arrepio percorre sua espinha.",
                            ""
                        ], () => {
                            state.sanity -= 12;
                            if (checkGameOver()) return;
                            endTurn(5);
                            eventActive = false;
                        });
                    });

                    createButton('desviar o olhar', () => {
                        disableAllButtons();
                        delayedLines([
                            "",
                            "você desvia o olhar.",
                            "não quer mais ver aquilo.",
                            "mas sente que algo ficou preso lá dentro.",
                            ""
                        ], () => {
                            state.sanity -= 3;
                            if (checkGameOver()) return;
                            endTurn(5);
                            eventActive = false;
                        });
                    });

                    createButton('cobrir o espelho', () => {
                        disableAllButtons();
                        delayedLines([
                            "",
                            "você pega um pano e cobre o espelho.",
                            "não quer mais ver aquilo.",
                            "mas sente que algo ficou preso lá dentro.",
                            ""
                        ], () => {
                            state.sanity -= 5;
                            state.energy -= 5;
                            if (checkGameOver()) return;
                            endTurn(5);
                            eventActive = false;
                        });
                    });
                }

                //evento de aviso de cansaço
                if (eventType === 'ignoreWarning')  {
                    createButton('ignorar e continuar', () => {
                        disableAllButtons();
                        delayedLines([
                            "",
                            "você ignora o cansaço.",
                            "ignora a dor de cabeça.",
                            "ignora tudo.",
                            "menos o código.",
                            ""
                        ], () => {
                            state.ignoredWarnings++;
                            state.progress += 12;
                            state.sanity -= 20;
                            state.energy -= 10;
                            cooldowns.ignoreWarningCooldown = 10;

                            if (state.ignoredWarnings >= 2) {
                                const lines = document.querySelectorAll('.story-line');
                                lines.forEach(line => {
                                    if (Math.random() < 0.5) line.classList.add('glitch');
                                });
                            }

                            if (checkGameOver()) return;
                            endTurn(2);
                            eventActive = false;
                        });
                    });

                    createButton('pausar por um momento', () => {
                        disableAllButtons();
                        delayedLines([
                            "",
                            "você respira fundo.",
                            "fecha os olhos por alguns segundos.",
                            "o mundo desacelera.",
                            "mas o código espera.",
                            ""
                        ], () => {
                        state.energy += 10;
                        state.sanity += 10;
                        if (checkGameOver()) return;
                        endTurn(10);
                        eventActive = false;
                    });
                });
            }
         eventButtons = false; 
         renderChoices();
        }

        //cria o botão de escolha  DANGER
        function createButton(text, onClick, isDanger = false) {
            const button = document.createElement('button');
            button.textContent = text;
            if (isDanger) button.className = 'danger';
            button.onclick = onClick;
            document.getElementById('choices').appendChild(button);

            if (eventButtons) {
                button.disabled = false;
            }
        }

        //faz o botão ter barrinha que diminui conforme decremento do cooldown
        function createButtonWithCooldown(text, onClick, cooldownKey) {
            const currentCd = cooldowns[cooldownKey] || 0;
            const maxCd = maxCooldowns[cooldownKey] || 0;
            
            const wrapper = document.createElement('div');
            wrapper.className = 'button-wrapper';
            
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.disabled = currentCd > 0;
            btn.onclick = currentCd === 0 ? onClick : null;
            
            wrapper.appendChild(btn);
            
            // Se tiver cooldown ativo, mostra a barra
            if (currentCd > 0 && maxCd > 0) {
                const progress = ((maxCd - currentCd) / maxCd) * 100;
                
                const bar = document.createElement('div');
                bar.className = 'cooldown-bar';
                
                const progressBar = document.createElement('div');
                progressBar.className = 'cooldown-progress';
                progressBar.style.width = `${progress}%`;
                
                bar.appendChild(progressBar);
                wrapper.appendChild(bar);
            }
            
            document.getElementById('choices').appendChild(wrapper);
}


        function renderChoices() {
            if (eventActive) return; 

            const choicesDiv = document.getElementById('choices');
            choicesDiv.innerHTML = '';

            if (checkRandomEvents()) return;
            if (checkSaveEvent()) return;
            if (actionInProgress) return;

            // === Ações utilitárias ====

            // botao de save
            if (isTaskAvailable('quickSave')) {
                createButton('💾 SALVAR AGORA', quickSave, true); // true = botão danger/destaque
            }
            // Fazer mais café
            if (isTaskAvailable('makeCoffee')) {
                createButtonWithCooldown('fazer café', makeCoffee, 'makeCoffeeCooldown');
            }

            // Café sendo preparado (caso especial)
            console.log('coffeeBrewTime:', state.coffeeBrewTime);
            if ((state.coffeeBrewTime || 0) > 0) {
                createButtonWithCooldown(
                    `preparando café...`, // ← ERA ISSO, NÃO SPRITE!
                    null, // ← Sem onClick porque tá disabled
                    'coffeeBrewTime' // ← Usa o coffeeBrewTime como cooldown
                );
            }

            // Café pronto para tomar
            if (isTaskAvailable('drinkCoffee')) {
                createButtonWithCooldown('tomar café', drinkCoffee, 'drinkCoffeeCooldown');
            }

            // Pausa
            if (isTaskAvailable('takePause')) {
                createButtonWithCooldown('fazer uma pausa', takePause, 'takePauseCooldown');
            }

            // Pedir ajuda
            if (isTaskAvailable('askForHelp')) {
                createButtonWithCooldown(
                    'pedir ajuda', 
                    () => { askForHelp(); state.lastHelpDay = state.day; }, // ← Precisa do wrapper
                    'askForHelpCooldown'
                );
            }

            // Aviso de cansaço    
            if (isTaskAvailable('ignoreWarning')) {
                state.ignoredWarningEvent = true;
                addStoryLine("", true);
                addStoryLine("Você se sente muito cansado, seu corpo pede uma pausa.", true);
                addStoryLine("", true);
                showEventChoice('ignoreWarning');
                return; // ← NÃO PRECISA DO 'true', só return
            }

            // ==== 🎯 FASES DO JOGO ====
            if (isTaskAvailable('makeSprite')) {
                createButtonWithCooldown(
                    `fazer sprite (${state.spriteCount}/${state.maxSprites})`, 
                    makeSprite, 
                    'makeSpriteCooldown'
                );
            }

            if (isTaskAvailable('makeMap')) {
                createButtonWithCooldown(
                    `fazer mapa (${state.mapCount}/${state.maxMaps})`, 
                    makeMap, 
                    'makeMapCooldown'
                );
            }

            if (isTaskAvailable('makeCharacter')) {
                createButtonWithCooldown(
                    `fazer personagem (${state.characterCount}/${state.maxCharacters})`, 
                    makeCharacter, 
                    'makeCharacterCooldown'
                );
            }

            if (isTaskAvailable('makeDialogue')) {
                createButtonWithCooldown(
                    `fazer diálogo (${state.dialogueCount}/${state.maxDialogues})`, 
                    makeDialogue, 
                    'makeDialogueCooldown'
                );
            }

            if (isTaskAvailable('testGame')) {
                createButtonWithCooldown(
                    `fazer teste (${state.testCount}/${state.maxTests})`, 
                    testGame, 
                    'testGameCooldown'
                );
            }

            if (isTaskAvailable('rebugGame')) { // ← FALTOU ESSE!
                createButtonWithCooldown(
                    `debugar (${state.rebugCount}/${state.maxRebugs})`, 
                    rebugGame, 
                    'rebugGameCooldown'
                );
            }

            if (isTaskAvailable('buildGame')) {
                createButtonWithCooldown(
                    `fazer build (${state.buildCount}/${state.maxBuilds})`, 
                    buildGame, 
                    'buildGameCooldown'
                );
            }

            if (isTaskAvailable('publishGame')) {
                createButtonWithCooldown(
                    `publicar jogo`, 
                    publishGame, 
                    'publishGameCooldown'
                );
            }
        }

//==== 🎯 AÇÕES DISPONÍVEIS ====



// ==== ☕ INÍCIO DO PREPARO DO CAFÉ ====
        function makeCoffee() {
            disableAllButtons();  
            delayedLines([
                "",
                "você se levanta.",
                "caminha até a cozinha.",
                "água na máquina. pó no filtro.",
                "o café começa a gotejar.",
            ], () => {


                // ==== 🪞 EVENTO DO ESPELHO ====
                if (!state.mirrorEventShown && state.sanity < 40 && state.energy < 30 && Math.random() < 0.2) {
                    state.mirrorEventShown = true;
                    delayedLines([
                        "",
                        "você olha para o espelho na cozinha...",
                        "algo está diferente."
                    ], () => {
                        showEventChoice('mirror');
                    });
                    return;
                }

                 // ==== ⏳ INICIA PREPARO DO CAFÉ ====
                state.coffeeBrewTime = 5;    // tempo real em segundos
                cooldowns.coffeeBrewTime = state.coffeeBrewTime; // ← sincroniza com cooldowns
                state.coffeeLocked = true;

                // limpa timeout anterior se existir
                if (state._coffeeTimeout) {
                    clearTimeout(state._coffeeTimeout);
                    delete state._coffeeTimeout;
                }
                endTurn(5);           
            });

        }



            // ==== ☕ TOMAR CAFÉ ====
        function drinkCoffee() {

            if (!isTaskAvailable('drinkCoffee')) {
                addStoryLine("Essa tarefa não está disponível no momento.");
                return;
            }

            disableAllButtons();  

            const blocks = [
                ["você toma o café.", "está quente. amargo.", "você sente o corpo despertar um pouco."],
                ["mais café.", "o gosto já é familiar.", "como um ritual."],
                ["a xícara está morna.", "você bebe mesmo assim.", "precisa continuar."],
                ["você mal sente o gosto.", "apenas o hábito.", "a necessidade."]
            ];

            // 🎲 Sorteia um bloco aleatório
            const index = Math.floor(Math.random() * blocks.length);
            const selectedBlock = blocks[index];

            delayedLines(["", ...selectedBlock, ""], () => {
                const boost = Math.floor(state.coffees * 2);
                state.energy = Math.min(100, state.energy + boost);
                state.sanity -= 2;
                cooldowns.drinkCoffeeCooldown = 3;
                state.coffeeLocked = false;
                state.coffees--;
                

                if (checkGameOver()) return;
                endTurn(3);
                renderChoices();

            });
        }


        // ==== 💻 FAZER SPRITE (FASE 01) ====

        function makeSprite() {

            if (!isTaskAvailable('makeSprite')) {
                addStoryLine("Essa tarefa não está disponível no momento.");
                return;
            }
            disableAllButtons();  
             const blocks = [
                ["você abre o paint.", "pixel por pixel.", "um quadrado vermelho, um quadrado azul.", "é... um sprite."],
                ["um pixel fora do lugar.", "você corrige.", "agora parece errado de outro jeito."],
                ["você desenha um rosto.", "não sabe se está feliz ou assustado.", "decide não mexer."],
                ["a paleta é limitada.", "você força contraste.", "funciona, mais ou menos."],
                ["você anima um passo.", "ele engasga no meio.", "você aceita assim."],
                ["o sprite pisca.", "não era pra piscar.", "mas ficou bom."],
                ["você copia e cola.", "ajusta dois pixels.", "chama de versão nova."],
                ["o personagem vira de lado.", "parece outra pessoa.", "você gosta disso."],
                ["você tenta sombrear.", "fica pior.", "volta pro plano original."],
            ];
        
            // 🎲 Sorteia um bloco aleatório
            const index = Math.floor(Math.random() * blocks.length);
            const selectedBlock = blocks[index];

            delayedLines(["", ...selectedBlock, ""], () =>{
            state.spriteCount++;    
            state.spriteMade = true;
            state.energy -= 10;
            cooldowns.makeSpriteCooldown = 5;

            if (checkGameOver()) return;
            endTurn(5);
            renderChoices();
        });
        }

        // ==== FASE DE MAPA (FASE 02) ====
    
        function makeMap() {
            if (!isTaskAvailable('makeMap')) {
                addStoryLine("Essa tarefa não está disponível no momento.");
                return;
            }

            disableAllButtons();  
            const blocks = [
                ["você abre o editor de mapas.", "grid alinhado, pronto.", "um retângulo vira sala."],
                ["você desenha um corredor curto.", "muda a cor do chão.", "fica funcional."],
                ["coloca uma porta simples.", "a maçaneta range só um pouco.", "decide que serve."],
                ["marca uma escada com pixels.", "o personagem sobe sem glamour.", "ok, sobe."],
                ["pinta um canto escuro.", "alguém pode se perder ali.", "pode ser interessante."],
            ];

            // 🎲 Sorteia um bloco aleatório
            const index = Math.floor(Math.random() * blocks.length);
            const selectedBlock = blocks[index];

            delayedLines(["", ...selectedBlock, ""], () => {    
                state.mapCount++;
                state.mapMade = true;
                state.energy -= 10;
                cooldowns.makeMapCooldown = 5;
                
                if (checkGameOver()) return;
                endTurn(5);
                renderChoices();
            });
        }

        // ==== FASE DE PERSONAGENS (FASE 03) ====
        function makeCharacter() {
            if (!isTaskAvailable('makeCharacter')) {
                addStoryLine("Essa tarefa não está disponível no momento.");
                return;
            }

            disableAllButtons();  
            const characterBlocks = [
                ["você desenha uma silhueta.", "usa bota de salto.", "hmm... essa é a Tassiana."],
                ["vamo fazer um cara com alargador.", "ele parece ser envolvido em cultura pop.", "pode ser Juninho, eu acho."],
                ["cria um personagem bem nerd.", "viciado em instalar Linux nas máquinas do jogo.", "que tal Andrei pro nome hein?"],
                ["vamos colocar um cara que ainda coda em Java hoje em dia.", "ele tem cara de quem defende isso com orgulho.", "esse vai ser o Leonardo."],
                ["tem um cara estranho que vem perguntar pro player se quer ir pra robótica.", "ele pode ser tipo o jumpscare.", "Manfred, um bom nome."],
            ];
            // 🎲 Sorteia um bloco aleatório
            const index = Math.floor(Math.random() * characterBlocks.length);
            const selectedBlock = characterBlocks[index];
            delayedLines(["", ...selectedBlock, ""], () => {    
                state.characterCount++;
                state.characterMade = true;
                state.energy -= 10;
                cooldowns.makeCharacterCooldown = 5;
                 
                if (checkGameOver()) return;
                renderChoices();
                endTurn(20);
            });
        }

        // ==== FASE DE DIÁLOGOS (FASE 04) ====
        function makeDialogue() {
            if (!isTaskAvailable('makeDialogue')) {
                addStoryLine("Essa tarefa não está disponível no momento.");
                return;
            }
           
            disableAllButtons();  
            const dialogueBlocks = [
                ["Tassiana te encara por 3 segundos.", "ela pergunta se você fez o relatório do PAC.", "você mente que sim."],
                ["Juninho mostra um pôster de anime.", "você não reconhece.", "ele te chama de normie."],
                ["Andrei instala Arch Linux no seu inventário.", "você não pediu isso.", "ele diz que é pela performance."],
                ["Leonardo fala sobre Java.", "ninguém pediu.", "ele continua mesmo assim."],
                ["Manfred aparece do nada.", "pergunta se você quer ir pra robótica.", "você diz não, ele diz que vai buscar os troféus."],
                ["um personagem sem nome te observa.", "ele não fala nada.", "você sente que foi julgado."],
                ["alguém te pergunta se você prefere sprites ou mapas.", "você responde mapas.", "ele te bloqueia."]
            ];

            // 🎲 Sorteia um bloco aleatório
            const index = Math.floor(Math.random() * dialogueBlocks.length);
            const selectedBlock = dialogueBlocks[index];    
            delayedLines(["", ...selectedBlock, ""], () => {
                state.dialogueCount++;
                state.dialogueMade = true;
                state.energy -= 10;
                cooldowns.makeDialogueCooldown = 5;

                if (checkGameOver()) return;
                endTurn(20); 
                renderChoices();
            });
        }

        // === FASE DE TESTE (FASE 05) ===

        function testGame() {
            if (!isTaskAvailable('testGame')) {
                addStoryLine("Essa tarefa não está disponível no momento.");
                return;
            }

            disableAllButtons();  
            const blocks = [
                ["você abre o editor.", "a tela pisca. cursor pulsando.", "você começa a escrever."],
                ["mais linhas de código.", "algumas funcionam.", "outras não."],
                ["você corrige um bug.", "três novos aparecem.", "mas você continua."],
                ["as linhas começam a se embaralhar.", "você pisca. tenta focar.", "continua digitando."],
                ["você não tem certeza do que está fazendo.", "mas suas mãos continuam.", "músculo. memória."]
            ];

            // 🎲 Sorteia um bloco aleatório
            const index = Math.floor(Math.random() * blocks.length);
            const selectedBlock = blocks[index];

            delayedLines(["", ...selectedBlock, ""], () => {
                const efficiency = Math.max(5, 15 - state.testSessions);
                state.progress += efficiency;
                state.energy -= 15;
                state.sanity -= 5;
                state.testSessions++;
                cooldowns.testGameCooldown = 2;

                if (checkGameOver()) return;
                endTurn(30);
                renderChoices();

                if (state.testSessions >= 3 && state.phase === 'beginning') {
                    state.phase = 'deteriorating';
                    document.body.className = 'deteriorating';
                }
                if (state.testSessions >= 6 && state.phase === 'deteriorating') {
                    state.phase = 'collapsing';
                    document.body.className = 'collapsing';
                }
                if (state.sanity < 20 || state.energy < 20) {
                    document.body.classList.add('critical');
                }
            });
        }

        // ==== DEBUG: FASE DE REBUG (FASE 06) ====
        function rebugGame() {
            if (!isTaskAvailable('rebugGame')) {
                addStoryLine("Essa tarefa não está disponível no momento.");
                return;
            }

            disableAllButtons();  
            const blocks = [
                ["você revisita o código antigo.", "encontra linhas confusas.", "decide reescrever."],
                ["você encontra um bug estranho.", "ele some quando você olha.", "mas volta quando desvia o olhar."],
                ["você tenta isolar o problema.", "mas ele parece se multiplicar.", "você respira fundo e continua."],
            ];  

             // 🎲 Sorteia um bloco aleatório
            const index = Math.floor(Math.random() * blocks.length);
            const selectedBlock = blocks[index];

            delayedLines(["", ...selectedBlock, ""], () => {
                state.rebugCount++;
                state.energy -= 15;
                state.sanity -= 15;
                cooldowns.rebugGameCooldown = 3;

                if (checkGameOver()) return;
                endTurn(25);
                renderChoices();
            });
        }

        // ====  🎮 FAZER BUILD (FASE 07) ====
        function buildGame() {
            if (!isTaskAvailable('buildGame')) {
                addStoryLine("Essa tarefa não está disponível no momento.");
                return;
            }

            //TODO: VERIFICAR PARA QUE ULTIMA FRASE SEJA A QUE DEU CERTO

            disableAllButtons();
            const blocks = [
                ["você inicia o processo de build.", "aguarda ansiosamente.", "o build falha."],
                ["você verifica as configurações.", "tudo parece certo.", "o build falha."],
                ["você tenta novamente.", "dessa vez, o build passa.", "você respira aliviado."],
            ];

            const index = Math.floor(Math.random() * blocks.length);
            const selectedBlock = blocks[index];

            delayedLines(["", ...selectedBlock, ""], () => {
                state.buildCount++;
                state.energy -= 20;
                state.sanity -= 10;
                cooldowns.buildGameCooldown = 5;

                if (checkGameOver()) return;
                endTurn(30);
                renderChoices();
            });
        }

        // ====  📢 FAZER PUBLISH (FASE 08) ====
        function publishGame() {
            if (!isTaskAvailable('publishGame')) {
                addStoryLine("Essa tarefa não está disponível no momento.");
                return;
            }
            disableAllButtons();
            const blocks = [
                ["você clica no botão de publicar.", "aguarda ansiosamente.", "o jogo é publicado."],
                ["você verifica as configurações de publicação.", "tudo parece certo.", "o jogo é publicado."],
                ["você tenta novamente.", "dessa vez, a publicação é bem-sucedida.", "você respira aliviado."],
            ];

            const index = Math.floor(Math.random() * blocks.length);
            const selectedBlock = blocks[index];

            delayedLines(["", ...selectedBlock, ""], () => {
                state.publishCount++;
                state.energy -= 25;
                state.sanity -= 15;
                // Sem cooldown pois nao é feito duas vezes

                if (checkGameOver()) return;
                endTurn(40);
                renderChoices();
            });
        }

        // === OPÇÕES EXTRAS ===
        function takePause() {
            disableAllButtons();
            const blocks = [
                ["você se afasta do computador.", "respira fundo.", "olha pela janela."],
                ["o mundo lá fora parece calmo.", "você fecha os olhos por um momento.", "tenta se reconectar."],
                ["você estica os braços.", "sente os músculos relaxarem.", "uma breve pausa."],
            ];

            const index = Math.floor(Math.random() * blocks.length);
            const selectedBlock = blocks[index];

            delayedLines(["", ...selectedBlock, ""], () => {
                state.energy += 15;
                state.sanity += 15;
                cooldowns.takePauseCooldown = 20;

                if (checkGameOver()) return; 
                endTurn(15);
                renderChoices();
                
            });
        }

        // ==== 📞 PEDIR AJUDA ====
        function askForHelp() {
            disableAllButtons();
            const blocks = [
                ["você abre o discord.", "digita uma mensagem.", "espera."],
                ["você escreve 'alguém aí?'", "ninguém responde por um tempo.", "depois alguém aparece."],
                ["você manda um print do erro.", "alguém diz 'já tentou reiniciar?'", "você tenta não gritar."],
                ["você pergunta se mais alguém tá travado.", "descobre que sim.", "isso ajuda um pouco."],
                ["você só escreve 'socorro'.", "alguém manda um meme.", "você ri, meio triste."],
                ["você explica o bug.", "alguém entende.", "você sente que não tá sozinho."]
            ];
            
           
            const index = Math.floor(Math.random() * blocks.length);
            const selectedBlock = blocks[index];

            delayedLines(["", ...selectedBlock, ""], () => {
                state.askedForHelp = true;
                state.sanity += 25;
                state.progress += 20;
                state.energy += 10;
                cooldowns.askForHelpCooldown = 60;
                
                if (checkGameOver()) return;
                endTurn(20);
                renderChoices();
                
        }); 
    }   



        // ==== 🎯 CHECAGEM DE FIM DE JOGO ====
        function checkGameOver() {
            disableAllButtons();
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
            disableAllButtons();
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
            delayedLines([
                "você está no quarto.",
                "sentado no computador.",
                "a caneca de café está quase vazia.",
                "",
                "faltam dois dias para a game jam."
            ]);

            setTimeout(() => renderChoices(), 2000);
        }

        startGame();
