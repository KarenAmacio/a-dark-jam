
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

            showingWegChoice: false,  // Controla se está mostrando a escolha de faltar
            wegDecisionMade: false,   // Se já tomou a decisão

            //fases do jogo
            spriteCount: 0, maxSprites: 5,
            mapCount: 0, maxMaps: 3,
            characterCount: 0, maxCharacters: 5,
            dialogueCount: 0, maxDialogues: 5,
            testCount: 0, maxTests: 4,
            rebugCount: 0, maxRebugs: 3,
            buildCount: 0, buildPassed: false, maxBuilds: 1,
            publishCount: 0, publishPassed: false,

            // Sistema de save
            lastSave: null, // guarda o estado do último save
            saveAvailable: false, // controla se o botão de save está visível
            saveTimeout: null, // guarda o timeout do botão de save
            lastSaveEventTime: 0,        // Timestamp do último save event

            lastWarningEventTime: 0,     // Timestamp do último warning event
            
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
            publishGameCooldown: 0,

            saveEventCooldown: 0,        // Cooldown de 50 segundos para save
            warningEventCooldown: 0,     // Cooldown de 15 segundos para warning
            

            
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
                prerequisite: (s) => (s.turnsPlayed || 0) >= 4 && !s.askedForHelp,
                countKey: null,
                limitKey: null,
                cooldownKey: 'askForHelpCooldown'
            },


            ignoreWarning: {
                prerequisite: (s) => {
                    // Checa cooldown primeiro
                    if (cooldowns.warningEventCooldown > 0) return false;
                    
                    // Depois checa condições normais
                    return (s.turnsPlayed || 0) >= 4 && (s.energy || 0) < 35;
                },
                countKey: null,
                limitKey: null,
                cooldownKey: null // Não usa cooldown tradicional
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
                prerequisite: (s) => (s.dialogueCount || 0) >= (s.maxDialogues || 0),
                countKey: 'testCount',
                limitKey: 'maxTests',
                cooldownKey: 'testGameCooldown'
            },

            rebugGame: {
                prerequisite: (s) => (s.testCount || 0) >= (s.maxTests || 0),
                countKey: 'rebugCount',
                limitKey: 'maxRebugs',
                cooldownKey: 'rebugGameCooldown'
            },

           buildGame: {
                prerequisite: (s) => (s.rebugCount || 0) >= (s.maxRebugs || 0)  && (s.energy || 0) >= 40 && (s.sanity || 0) >= 50 && !s.buildPassed,
                countKey: 'buildCount',
                limitKey: null,
                cooldownKey: 'buildGameCooldown'
            },


            publishGame: {
                prerequisite: (s) => s.buildPassed === true && (s.energy || 0) >= 40 && (s.sanity || 0) >= 50,
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
            
            if (cooldowns.saveEventCooldown > 0) return false;
                if (state.saveAvailable) return false;
                
                const hasProgress = state.spriteCount >= 2 || state.mapCount >= 1 || state.characterCount >= 1;
                const enoughTurns = state.turnsPlayed >= 10;
                
                if (hasProgress && enoughTurns && Math.random() < 0.10) {
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
            
            // Remove o botão após 1.5 segundos
            state.saveTimeout = setTimeout(() => {
                state.saveAvailable = false;
                addStoryLine("você esqueceu de salvar.", true);
                
                // ATIVA COOLDOWN DE 100 SEGUNDOS
                cooldowns.saveEventCooldown = 100;
                
                renderChoices();
            }, 2000);
        }

        function quickSave() {
            disableAllButtons();
            
            if (state.saveTimeout) {
                clearTimeout(state.saveTimeout);
                state.saveTimeout = null;
            }
            
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
                
                // ✅ ATIVA COOLDOWN DE 50 SEGUNDOS
                cooldowns.saveEventCooldown = 50;
                
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
                    delay += 600;
                });

                if (finalCallback) {
                    setTimeout(finalCallback, delay);
                }
        }

        // função para atualizar o display de tempo
        function updateTime(minutes = 15) {
                state.time += minutes;
                
                // DIA 3 COM FALTA: Deadline de meio-dia (12:00 = 720 minutos)
                if (state.day === 3 && state.wegDecisionMade) {
                    if (state.time >= 12 * 60) {
                        // Se não publicou até meio-dia = perdeu
                        if (state.publishCount === 0) {
                            delayedLines([
                                "",
                                "meio-dia.",
                                "o tempo acabou.",
                                "você não conseguiu.",
                                ""
                            ], () => {
                                showEnding('weg_absent_failure');
                            });
                            return; // ← Para aqui!
                        }
                        // Se publicou, não precisa fazer nada (já ganhou)
                    }
                }
                
                // Dias normais: meia-noite (24:00 = 1440 minutos)
                if (state.time >= 24 * 60) {
                    state.time -= 24 * 60;
                    state.day++;
                    forceSleep();
                    return;
                }
                
                // Atualiza o display
                const hours = Math.floor(state.time / 60);
                const mins = state.time % 60;
                const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
                document.getElementById('time-display').textContent = `DIA ${state.day} - ${timeStr}`;
            }

            //função para forçar o sono ao passar da meia-noite
        //função para forçar o sono ao passar da meia-noite
            function forceSleep() {
                //  DIA 3 (fim do Dia 2): Mostra escolha de faltar ou não
                if (state.day === 3 && state.publishCount === 0 && !state.wegDecisionMade) {
                    showWegChoice();
                    return;
                }
                
                // DIA 4+: Se chegou aqui sem publicar = perdeu
                if (state.day >= 4 && state.publishCount === 0) {
                    showEnding('weg_loyalty');
                    return;
                }
                
                // Se chegou aqui, é dia normal OU dia 3 mas já publicou
                delayedLines([
                    "",
                    "Você não percebe, mas o cansaço vence.",
                    "A tela escurece. Você dorme.",
                    "...",
                    "Você acorda no dia seguinte, é 4h da manhã.",
                    "Levanta cara, você tem que ir pra WEG.",
                    "Você aperta muito parafuso e volta pra casa. Ta na hora de voltar pro jogo.",
                    ""
                ], () => {
                    // Reseta café
                    state.coffees = 0;
                    state.coffeeLocked = true;
                    state.coffeeBrewTime = 0;
                    
                    // SEMPRE começa às 16:00 
                    state.time = 16 * 60;
                    
                    // Recuperação normal
                    state.energy = Math.min(100, state.energy + 50);
                    state.sanity = Math.min(100, state.sanity + 10);
                    cooldowns.drinkCoffeeCooldown = 0;
                    
                    updateTime(0);
                    renderChoices();
                });
            }



        // Helper simples para garantir que valores fiquem dentro de um intervalo
        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }


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
                    state.coffees += 5;
                    addStoryLine("O café está pronto.");
                    renderChoices();
                }
            }
            
             if (hasActiveCooldowns) {
                renderChoices();
                setTimeout(tick, 1000);
            } else {
                tickRunning = false; 
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
                }
            }
            
            actionInProgress = false;
            state.energy = clamp(state.energy, 0, 100);
            state.sanity = clamp(state.sanity, 0, 100);
            
            renderChoices(); 
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
            if (!state.phoneEventShown && state.turnsPlayed >= 5 && state.sanity < 60 && Math.random() < 0.20) {
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
                    disableAllButtons(); 
                    
                    delayedLines([
                        "",
                        "você abre a porta. olha ao redor."
                    ], () => {
                        // ← Callback executa DEPOIS das linhas acima
                        
                        if (Math.random() < 0.3) {
                            // Pegou o competidor no flagra
                            delayedLines([
                                "",
                                "um vulto corre pelo corredor.",
                                "você grita. ele foge.",
                                "era um competidor tentando sabotar sua energia.",
                                "você evita a perda e se sente mais alerta.",
                                ""
                            ], () => {
                                
                                state.sanity += 10;
                                state.energy -= 10;
                                
                                if (checkGameOver()) return;
                                eventActive = false; 
                                endTurn(20); 
                                
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
                                state.energy -= 5;
                                
                                if (checkGameOver()) return;
                                eventActive = false; 
                                endTurn(20); 
                                
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
                        if (Math.random() < 0.3) {
                            // Sabotagem acontece - PERDE PROGRESSO
                            delayedLines([
                                "",
                                "de repente, a luz pisca.",
                                "a energia cai. tudo desliga.",
                                "",
                                "Você... você salvou?"
                            ], () => {
                                loadLastSave(); // ← CHAMA A FUNÇÃO DE CARREGAR SAVE
                                state.sanity -= 25; // Perde mais sanidade por perder progresso
                                
                                if (checkGameOver()) return;
                                eventActive = false;
                                endTurn(5);
                                
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
                                eventActive = false;
                                endTurn(5);
                                
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
                            state.sanity += 15;
                            state.energy += 5;
                            updateTime(20);
                            if (checkGameOver()) return;
                            eventActive = false;
                            endTurn(40);
                            
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
                            state.sanity -= 15;
                            if (checkGameOver()) return;
                            eventActive = false;
                            endTurn(5);
                            
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
                            eventActive = false;
                            endTurn(10);
                            
                        });
                    });

                    createButton('desviar o olhar', () => {
                        disableAllButtons();
                        delayedLines([
                            "",
                            "você desvia o olhar.",
                            "sente como se algo ainda tivesse te observando.",
                            ""
                        ], () => {
                            state.sanity -= 10;
                            if (checkGameOver()) return;
                            eventActive = false;
                            endTurn(10);
                            
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
                            state.sanity -= 7;
                            state.energy -= 5;
                            if (checkGameOver()) return;
                            eventActive = false;
                            endTurn(15);
                            
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
                            
                            //  ATIVA COOLDOWN DE 15 SEGUNDOS
                            cooldowns.warningEventCooldown = 15;
                            
                            if (state.ignoredWarnings >= 2) {
                                const lines = document.querySelectorAll('.story-line');
                                lines.forEach(line => {
                                    if (Math.random() < 0.5) line.classList.add('glitch');
                                });
                            }
                            
                            if (checkGameOver()) return;
                            eventActive = false;
                            endTurn(2);
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
                            
                            //  ATIVA COOLDOWN DE 15 SEGUNDOS
                            cooldowns.warningEventCooldown = 15;
                            
                            if (checkGameOver()) return;
                            eventActive = false;
                            endTurn(10);
                        });
                    });
                }

            }

        //cria o botão de escolha  DANGER
        function createButton(text, onClick, isDanger = false) {
            const button = document.createElement('button');
            button.textContent = text;
            if (isDanger) button.className = 'danger';
            button.onclick = onClick;
            button.disabled = false;
            document.getElementById('choices').appendChild(button);
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
            if (state.showingWegChoice) return;

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
            if ((state.coffeeBrewTime || 0) > 0) {
                createButtonWithCooldown(
                    `preparando café...`, 
                    null, 
                    'coffeeBrewTime' //  Usa o coffeeBrewTime como cooldown
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
                    askForHelp,
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
                return; 
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
                if (!state.mirrorEventShown && state.sanity < 50 && Math.random() < 0.50) {
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
                endTurn(15);           
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
                state.sanity -= 5;
                cooldowns.drinkCoffeeCooldown = 5;
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
        
            //  Sorteia um bloco aleatório
            const index = Math.floor(Math.random() * blocks.length);
            const selectedBlock = blocks[index];

            delayedLines(["", ...selectedBlock, ""], () =>{
            state.spriteCount++;    
            state.spriteMade = true;
            state.energy -= 10;
            cooldowns.makeSpriteCooldown = 3;

            if (checkGameOver()) return;
            endTurn(25);
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

            //  Sorteia um bloco aleatório
            const index = Math.floor(Math.random() * blocks.length);
            const selectedBlock = blocks[index];

            delayedLines(["", ...selectedBlock, ""], () => {    
                state.mapCount++;
                state.mapMade = true;
                state.energy -= 10;
                cooldowns.makeMapCooldown = 4;
                
                if (checkGameOver()) return;
                endTurn(25);
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
            

            const index = state.characterCount % characterBlocks.length;
            const selectedBlock = characterBlocks[index]; 

            delayedLines(["", ...selectedBlock, ""], () => {    
                state.characterCount++;
                state.characterMade = true;
                state.energy -= 10;
                cooldowns.makeCharacterCooldown = 5;
                 
                if (checkGameOver()) return;
                renderChoices();
                endTurn(25);
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
            ];

            const index = state.dialogueCount % dialogueBlocks.length;
            const selectedBlock = dialogueBlocks[index]; 


            delayedLines(["", ...selectedBlock, ""], () => {
                state.dialogueCount++;
                state.dialogueMade = true;
                state.energy -= 10;
                cooldowns.makeDialogueCooldown = 4;

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

            //  Sorteia um bloco aleatório
            const index = Math.floor(Math.random() * blocks.length);
            const selectedBlock = blocks[index];

            delayedLines(["", ...selectedBlock, ""], () => {
                const efficiency = Math.max(5, 15 - state.testSessions);
                state.progress += efficiency;
                state.energy -= 15;
                state.sanity -= 5;
                state.testSessions++;
                state.testCount++;
                cooldowns.testGameCooldown = 3;

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

             //  Sorteia um bloco aleatório
            const index = Math.floor(Math.random() * blocks.length);
            const selectedBlock = blocks[index];

            delayedLines(["", ...selectedBlock, ""], () => {
                state.rebugCount++;
                state.energy -= 15;
                state.sanity -= 15;
                cooldowns.rebugGameCooldown = 4;

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

            disableAllButtons();

            const blocks = [
                ["você inicia o processo de build.", "aguarda ansiosamente.", "o build falha."],
                ["você verifica as configurações.", "tudo parece certo.", "o build falha."],
                ["você tenta novamente.", "dessa vez, o build passa.", "você respira aliviado."]
            ];

            let selectedBlock;

            // Verifica se o build pode passar
            const buildSucceeded = (state.rebugCount || 0) >= (state.maxRebugs || 0)
                && (state.energy || 0) >= 40
                && (state.sanity || 0) >= 50;

            if (buildSucceeded) {
                selectedBlock = blocks[2]; // sucesso
                state.buildPassed = true;  // ← aqui você marca que o build passou
            } else if (state.buildCount === 0) {
                selectedBlock = blocks[0]; // primeira falha
            } else {
                selectedBlock = blocks[1]; // segunda falha
            }

            delayedLines(["", ...selectedBlock, ""], () => {
                state.buildCount++;
                state.energy -= 20;
                state.sanity -= 10;
                cooldowns.buildGameCooldown = 6;

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
            
            // Verifica se pode publicar
            const publishSucceeded = state.buildPassed === true
                && (state.energy || 0) >= 40
                && (state.sanity || 0) >= 50;
            
            let selectedBlock;
            
            if (publishSucceeded) {
                selectedBlock = ["você clica no botão de publicar.", "tudo está pronto.", "o jogo é publicado com sucesso."];
                state.publishPassed = true;
            } else if (state.publishCount === 0) {
                selectedBlock = ["você tenta publicar.", "mas algo está faltando.", "a publicação falha."];
            } else {
                selectedBlock = ["você verifica tudo novamente.", "ainda não está pronto.", "a publicação falha."];
            }
            
            delayedLines(["", ...selectedBlock, ""], () => {
                state.publishCount++;
                state.energy -= 25;
                state.sanity -= 15;
                cooldowns.publishGameCooldown = 8;
                
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


    
        // RETIRADO DEVIDO ALTERAÇÃO FORMATAÇÃO DAS FASES 
       function askForHelp() {
            disableAllButtons();
            
            // Determina em qual fase o jogador está
            let currentPhase = '';
            let progressAmount = 0;
            
            if (state.spriteCount < state.maxSprites) {
                currentPhase = 'sprites';
                progressAmount = Math.min(3, state.maxSprites - state.spriteCount);
                state.spriteCount += progressAmount;
            } else if (state.mapCount < state.maxMaps) {
                currentPhase = 'mapas';
                progressAmount = Math.min(3, state.maxMaps - state.mapCount);
                state.mapCount += progressAmount;
            } else if (state.characterCount < state.maxCharacters) {
                currentPhase = 'personagens';
                progressAmount = Math.min(3, state.maxCharacters - state.characterCount);
                state.characterCount += progressAmount;
            } else if (state.dialogueCount < state.maxDialogues) {
                currentPhase = 'diálogos';
                progressAmount = Math.min(3, state.maxDialogues - state.dialogueCount);
                state.dialogueCount += progressAmount;
            } else if (state.testCount < state.maxTests) {
                currentPhase = 'testes';
                progressAmount = Math.min(3, state.maxTests - state.testCount);
                state.testCount += progressAmount;
            } else if (state.rebugCount < state.maxRebugs) {
                currentPhase = 'debugs';
                progressAmount = Math.min(3, state.maxRebugs - state.rebugCount);
                state.rebugCount += progressAmount;
            }
            
            const blocks = [
                ["você abre o discord.", "digita uma mensagem.", "espera.", `alguém te ajuda com ${progressAmount} ${currentPhase}.`],
                ["você escreve 'alguém aí?'", "ninguém responde por um tempo.", "depois alguém aparece.", `conseguiu ajuda com ${progressAmount} ${currentPhase}.`],
                ["você manda um print do problema.", "alguém entende na hora.", `te ajudaram a fazer ${progressAmount} ${currentPhase}.`],
                ["você pergunta se mais alguém tá travado.", "descobre que sim.", "trocam dicas.", `juntos, avançam ${progressAmount} ${currentPhase}.`],
                ["você explica o bug.", "alguém manda uma solução.", `você aplica e completa ${progressAmount} ${currentPhase}.`],
                ["você pede socorro.", "a comunidade responde.", `coletivamente, fazem ${progressAmount} ${currentPhase}.`]
            ];
            
            const index = Math.floor(Math.random() * blocks.length);
            const selectedBlock = blocks[index];

            delayedLines(["", ...selectedBlock, ""], () => {
                state.askedForHelp = true;
                state.sanity += 25;
                state.energy += 10;
                cooldowns.askForHelpCooldown = 80;
                
                if (checkGameOver()) return;
                endTurn(40);
                renderChoices();
            }); 
        }
   



        // ==== 🎯 CHECAGEM DE FIM DE JOGO ====
        function checkGameOver() {
                // Verifica se publicou o jogo COM SUCESSO
            if (state.publishCount >= 1 && state.publishPassed) {
                const publishedOnTime = state.day <= 2;
                
                if (publishedOnTime) {
                    showEnding('success');
                } else {
                    showEnding('weg_absent_success');
                }
                return true;
            }


            // Verifica se perdeu sanidade/energia
            if (state.energy <= 0 || state.sanity <= 0) {
                showEnding('weg_absent_failure');
                return true;
            }

            return false;
        }
        
        function showWegChoice() {
            eventActive = true;
            state.showingWegChoice = true;
            
            const choicesDiv = document.getElementById('choices');
            choicesDiv.innerHTML = '';
            
            delayedLines([
                "",
                "O despertador toca.",
                "4h da manhã.",
                "",
                "Você olha para o computador.",
                "O jogo ainda não está pronto.",
                "",
                "Você sente o peso da decisão.",
                "Ir trabalhar... ou faltar?"
            ], () => {
                // Botão 1: Ir trabalhar (submissão)
                createButton('ir trabalhar', () => {
                    disableAllButtons();
                    
                    delayedLines([
                        "",
                        "você levanta.",
                        "coloca a camisa da empresa.",
                        "a rotina vence.",
                        ""
                    ], () => {
                        showEnding('weg_loyalty');
                    });
                });
                
                // Botão 2: Faltar (última chance)
                createButton('faltar', () => {
                    disableAllButtons();
                    
                    delayedLines([
                        "",
                        "você desliga o despertador.",
                        "ignora as mensagens.",
                        "isso vai ter consequências.",
                        "",
                        "mas hoje, o jogo vem primeiro.",
                        "",
                        "você tem até o meio-dia."
                    ], () => {
                        state.wegDecisionMade = true;
                        state.showingWegChoice = false;
                        eventActive = false;
                        actionInProgress = false;
                        
                        // RESETA PARA DIA 3, 06:00
                        state.time = 6 * 60;
                        state.day = 3;
                        
                        // Reseta café
                        state.coffees = 0;
                        state.coffeeLocked = true;
                        state.coffeeBrewTime = 0;
                        
                        // Penalidade por faltar
                        state.sanity -= 15;
                        state.energy = Math.min(100, state.energy + 30); // Menos energia que o normal
                        
                        updateTime(0);
                        setTimeout(() => {
                            renderChoices();
                        }, 100);

                    });
                }, true); // ← true = botão danger (vermelho)
            });
        }


        function showEnding(type) {
            disableAllButtons();
            const endings = {
                success: [
                    "",
                    "você publica o jogo.",
                    "ele está longe de perfeito.",
                    "mas ele existe.",
                    "",
                    "você respira fundo.",
                    "o mundo não desmoronou.",
                    "",
                    "e amanhã, tem mais.",
                    "",
                    "[ FIM - ENTREGA COM SUCESSO ]"
                ],
                weg_loyalty: [

                    "",
                    "o jogo não foi publicado.",
                    "ele fica ali, inacabado.",
                    "",
                    "você também.",
                    "",
                    "com o tempo, você se adapta.",
                    "se molda.",
                    "se transforma.",
                    "",
                    "em algo menor.",
                    "em algo obediente.",
                    "",
                    "[ FIM - SUBMISSÃO CORPORATIVA ]"
                ],
                weg_absent_success: [
                    "",
                    "você faltou na WEG.",
                    "talvez se arrependa mais que pensa.",
                    "",
                    "mas aqui dentro, você termina.",
                    "o jogo está pronto.",
                    "você publica.",
                    "",
                    "não foi fácil.",
                    "mas foi seu.",
                    "",
                    "[ FIM - ENTREGA COM SACRIFÍCIO ]"
                ],
               weg_absent_failure: [
                    "",
                    "o mundo lá fora continuou.",
                    "mas aqui dentro, o tempo escorreu como óleo.",
                    "",
                    "o jogo não está pronto.",
                    "você tenta, mas os dedos não respondem.",
                    "a tela pisca.",
                    "",
                    "você sente algo rastejar.",
                    "por dentro.",
                    "",
                    "a pele endurece.",
                    "os olhos se multiplicam.",
                    "a mente se fragmenta.",
                    "",
                    "você não é mais você.",
                    "é só um reflexo do que tentou ser.",
                    "",
                    "um inseto que ainda lembra o que era humano.",
                    "preso entre teclas e promessas não cumpridas.",
                    "",
                    "[ FIM - METAMORFOSE INÚTIL ]"
                ]
         };

            setTimeout(() => {
                endings[type].forEach((line, index) => {
                    setTimeout(() => addStoryLine(line), index * 800);
                });
                
                // Efeito especial para o final de metamorfose
                if (type === 'weg_absent_failure') {
                    setTimeout(() => {
                        document.body.style.opacity = '0';
                    }, endings[type].length * 800 + 2000);
                }

                // Mostra tela de créditos após o final
                const totalTime = endings[type].length * 800 + 3000;
                setTimeout(() => {
                    showCredits();
                }, totalTime);
            }, 1000);

            document.getElementById('choices').innerHTML = '';
        }

        function showCredits() {
            // Esconde o jogo
            document.getElementById('game-container').style.display = 'none';
            
            // Mostra a tela de créditos
            const creditsScreen = document.getElementById('credits-screen');
            creditsScreen.style.display = 'flex';
            creditsScreen.style.opacity = '0';
            
            // Fade in suave
            setTimeout(() => {
                creditsScreen.style.transition = 'opacity 2s';
                creditsScreen.style.opacity = '1';
            }, 100);
        }



        // Inicialização
        function startGame() {
            // Esconde o menu e mostra o jogo
            document.getElementById('main-menu').style.display = 'none';
            document.getElementById('game-container').style.display = 'block';
            
            delayedLines([
                "você está no quarto.",
                "sentado no computador.",
                "a caneca de café está quase vazia.",
                "",
                "faltam dois dias para a game jam."
            ]);
            updateTime(0); // Força o display inicial do relógio

            setTimeout(() => renderChoices(), 2000);
        }

        // Controle do Menu
        document.getElementById('start-game').addEventListener('click', () => {
            startGame();
        });

        document.getElementById('show-instructions').addEventListener('click', () => {
            document.getElementById('main-menu').style.display = 'none';
            document.getElementById('instructions-screen').style.display = 'flex';
        });

        document.getElementById('back-to-menu').addEventListener('click', () => {
            document.getElementById('instructions-screen').style.display = 'none';
            document.getElementById('main-menu').style.display = 'flex';
        });

        // Carrega o som de introdução
        const introSound = new Audio('assets/backgroundsound.mp3');
        introSound.volume = 0.6; 

        // Quando clicar em "COMEÇAR", toca o som e inicia o jogo
        document.getElementById('start-game').addEventListener('click', () => {
            introSound.currentTime = 0;
            introSound.play();

            // Esconde o menu e mostra o jogo
            document.getElementById('main-menu').style.display = 'none';
            document.getElementById('game-container').style.display = 'block';

        });





// ==== 🔧 MODO DEBUG ====
let debugMode = false;

// Cria o painel de debug uma vez só
const debugPanel = document.createElement('div');
debugPanel.id = 'debug-panel';
debugPanel.innerHTML = '<h3>🔧 DEBUG MODE</h3>';
document.body.appendChild(debugPanel);

// Ativa/desativa com a tecla 'D'
document.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') {
        debugMode = !debugMode;
        debugPanel.classList.toggle('active');
        console.log('Debug mode:', debugMode ? 'ON' : 'OFF');
    }
});

// Função helper para criar botões de debug
function addDebugButton(text, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.onclick = onClick;
    debugPanel.appendChild(btn);
}

// Adiciona todos os botões de debug
addDebugButton('⚡ +3 Sprites', () => { 
    state.spriteCount += 3; 
    renderChoices(); 
});

addDebugButton('⚡ +3 Mapas', () => { 
    state.mapCount += 3; 
    renderChoices(); 
});

addDebugButton('⚡ +3 Personagens', () => { 
    state.characterCount += 3; 
    renderChoices(); 
});

addDebugButton('⚡ +3 Diálogos', () => { 
    state.dialogueCount += 3; 
    renderChoices(); 
});

addDebugButton('⚡ Skip para Testes', () => { 
    state.spriteCount = state.maxSprites;
    state.mapCount = state.maxMaps;
    state.characterCount = state.maxCharacters;
    state.dialogueCount = state.maxDialogues;
    renderChoices();
});

addDebugButton('⚡ Skip para Build', () => { 
    state.spriteCount = state.maxSprites;
    state.mapCount = state.maxMaps;
    state.characterCount = state.maxCharacters;
    state.dialogueCount = state.maxDialogues;
    state.testCount = state.maxTests;
    state.rebugCount = state.maxRebugs;
    renderChoices();
});

addDebugButton('🕐 Zerar Cooldowns', () => {
    for (let key in cooldowns) cooldowns[key] = 0;
    state.coffeeBrewTime = 0;
    renderChoices();
});

addDebugButton('❤️ +50 Energia', () => { 
    state.energy = Math.min(100, state.energy + 50); 
    renderChoices(); 
});

addDebugButton('🧠 +50 Sanidade', () => { 
    state.sanity = Math.min(100, state.sanity + 50); 
    renderChoices(); 
});

addDebugButton('☕ +5 Cafés', () => { 
    state.coffees += 5;
    state.coffeeLocked = false;
    renderChoices(); 
});

addDebugButton('⏰ +1 Hora', () => { 
    updateTime(60); 
});

addDebugButton('⏰ +4 Horas', () => { 
    updateTime(240); 
});

addDebugButton('📅 Próximo Dia', () => { 
    state.time = 23 * 60 + 50; // 23:50
    updateTime(15); // Força passar da meia-noite
});

addDebugButton('🐕 Evento Cachorro', () => { 
    state.dogEventShown = false;
    addStoryLine("", true);
    addStoryLine("você ouve latidos lá fora.", true);
    addStoryLine("", true);
    showEventChoice('dog'); 
});

addDebugButton('📱 Evento Celular', () => { 
    state.phoneEventShown = false;
    addStoryLine("", true);
    addStoryLine("o celular vibra na mesa.", true);
    addStoryLine("é alguém que você conhece.", true);
    showEventChoice('phone'); 
});

addDebugButton('🪞 Evento Espelho', () => { 
    state.mirrorEventShown = false;
    addStoryLine("", true);
    addStoryLine("você olha para o espelho na cozinha...", true);
    addStoryLine("algo está diferente.", true);
    showEventChoice('mirror'); 
});

addDebugButton('⚠️ Evento Warning', () => { 
    cooldowns.warningEventCooldown = 0;
    state.energy = 30; // Força condição
    addStoryLine("", true);
    addStoryLine("Você se sente muito cansado, seu corpo pede uma pausa.", true);
    addStoryLine("", true);
    showEventChoice('ignoreWarning'); 
});

addDebugButton('💾 Forçar Save Event', () => { 
    cooldowns.saveEventCooldown = 0;
    state.spriteCount = 3; // Garante pré-requisito
    triggerSaveEvent(); 
});

addDebugButton('🆘 Resetar Ajuda', () => { 
    state.askedForHelp = false;
    cooldowns.askForHelpCooldown = 0;
    renderChoices();
});

addDebugButton('✅ Build Pass', () => { 
    state.buildPassed = true;
    renderChoices();
});

addDebugButton('🎮 Publish Pass', () => { 
    state.buildPassed = true;
    state.publishPassed = true;
    renderChoices();
});

addDebugButton('🔄 Reset Completo', () => { 
    if (confirm('Resetar o jogo completamente?')) {
        location.reload();
    }
});

// ==== 🎮 FUNÇÕES DE DEBUG NO CONSOLE ====
// Use no console do navegador (F12) com: debug.comando()
window.debug = {
    // Mostra/esconde o painel
    show: () => {
        debugPanel.classList.add('active');
        return '✅ Painel de debug ativado!';
    },
    
    hide: () => {
        debugPanel.classList.remove('active');
        return '❌ Painel de debug desativado!';
    },
    
    // Mostra o estado atual
    state: () => {
        console.table({
            'Dia': state.day,
            'Hora': `${Math.floor(state.time / 60)}:${(state.time % 60).toString().padStart(2, '0')}`,
            'Energia': state.energy,
            'Sanidade': state.sanity,
            'Cafés': state.coffees,
            'Sprites': `${state.spriteCount}/${state.maxSprites}`,
            'Mapas': `${state.mapCount}/${state.maxMaps}`,
            'Personagens': `${state.characterCount}/${state.maxCharacters}`,
            'Diálogos': `${state.dialogueCount}/${state.maxDialogues}`,
            'Testes': `${state.testCount}/${state.maxTests}`,
            'Debugs': `${state.rebugCount}/${state.maxRebugs}`,
            'Build Passou': state.buildPassed,
            'Publish Passou': state.publishPassed
        });
        return state;
    },
    
    // Acessa diretamente o state
    get: (key) => state[key],
    
    // Modifica o state
    set: (key, value) => {
        state[key] = value;
        renderChoices();
        return `✅ ${key} = ${value}`;
    },
    
    // Pula para uma fase específica
    skipTo: (phase) => {
        const phases = {
            'sprites': () => { /* já está no início */ },
            'mapas': () => { state.spriteCount = state.maxSprites; },
            'personagens': () => { 
                state.spriteCount = state.maxSprites;
                state.mapCount = state.maxMaps;
            },
            'dialogos': () => { 
                state.spriteCount = state.maxSprites;
                state.mapCount = state.maxMaps;
                state.characterCount = state.maxCharacters;
            },
            'testes': () => { 
                state.spriteCount = state.maxSprites;
                state.mapCount = state.maxMaps;
                state.characterCount = state.maxCharacters;
                state.dialogueCount = state.maxDialogues;
            },
            'debug': () => { 
                state.spriteCount = state.maxSprites;
                state.mapCount = state.maxMaps;
                state.characterCount = state.maxCharacters;
                state.dialogueCount = state.maxDialogues;
                state.testCount = state.maxTests;
            },
            'build': () => { 
                state.spriteCount = state.maxSprites;
                state.mapCount = state.maxMaps;
                state.characterCount = state.maxCharacters;
                state.dialogueCount = state.maxDialogues;
                state.testCount = state.maxTests;
                state.rebugCount = state.maxRebugs;
            },
            'publish': () => { 
                state.spriteCount = state.maxSprites;
                state.mapCount = state.maxMaps;
                state.characterCount = state.maxCharacters;
                state.dialogueCount = state.maxDialogues;
                state.testCount = state.maxTests;
                state.rebugCount = state.maxRebugs;
                state.buildPassed = true;
            }
        };
        
        if (phases[phase]) {
            phases[phase]();
            renderChoices();
            return `✅ Pulou para: ${phase}`;
        } else {
            return `❌ Fase inválida. Use: ${Object.keys(phases).join(', ')}`;
        }
    },
    
    // Limpa todos os cooldowns
    clearCooldowns: () => {
        for (let key in cooldowns) cooldowns[key] = 0;
        state.coffeeBrewTime = 0;
        renderChoices();
        return '✅ Todos os cooldowns zerados!';
    },
    
    // God mode
    god: () => {
        state.energy = 100;
        state.sanity = 100;
        state.coffees = 10;
        debug.clearCooldowns();
        return '⚡ GOD MODE ATIVADO!';
    },
    
    // Ajuda
    help: () => {
        console.log(`
🔧 COMANDOS DE DEBUG DISPONÍVEIS:

debug.show()           - Mostra o painel de debug
debug.hide()           - Esconde o painel de debug
debug.state()          - Mostra o estado completo do jogo
debug.get('key')       - Pega um valor do state
debug.set('key', val)  - Define um valor no state
debug.skipTo('fase')   - Pula para uma fase específica
debug.clearCooldowns() - Zera todos os cooldowns
debug.god()            - God mode (energia/sanidade máxima)
debug.help()           - Mostra esta ajuda

FASES DISPONÍVEIS PARA SKIP:
sprites, mapas, personagens, dialogos, testes, debug, build, publish

EXEMPLO DE USO:
debug.skipTo('build')
debug.set('energy', 100)
debug.god()
        `);
        return '📖 Ajuda exibida no console!';
    }
};

console.log('🔧 Debug mode carregado! Digite "debug.help()" no console para ver os comandos.');
