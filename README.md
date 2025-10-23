# 🎮 A Dark Jam

*A Dark Jam* é um jogo narrativo em JavaScript sobre rotina, café e estranheza. Você começa o dia com o café acabando. Antes de trabalhar, é preciso preparar o café, tomar uma xícara e enfrentar os pequenos rituais que mantêm sua sanidade — ou não.

---

## 📦 Sobre o projeto

- 🧠 Gênero: narrativa interativa / rotina psicológica
- 🕹️ Plataforma: navegador (HTML + JS)
- 🕰️ Duração média: 5–10 minutos por sessão
- 🎨 Estilo: minimalista, introspectivo, com eventos aleatórios

---

## 🎮 Como jogar
🎯 Objetivo
Você tem 2 dias para criar e publicar seu jogo para a game jam. Precisa completar todas as etapas de desenvolvimento enquanto gerencia sua energia e sanidade.

⚡ Recursos Principais
Energia

- Cai ao fazer tarefas
- Se zerar = Game Over
- Recupera: tomando café, dormindo, fazendo pausas

Sanidade

- Cai ao trabalhar muito, ignorar avisos
- Se zerar = Game Over
- Recupera: pausas, pedindo ajuda, eventos positivos

Tempo

- Cada ação consome minutos/horas
- Às 24h você dorme automaticamente
- Prazo final: Dia 2, 20h


📋 Sequência de Tarefas do Jogo
Você precisa completar estas etapas em ordem:

- Fazer Café (primeiro!) → Desbloqueia tudo
- Sprites (5x) → Desenhar personagens
- Mapas (3x) → Criar cenários
- Personagens (4x) → Desenvolver NPCs
- Diálogos (6x) → Escrever conversas
- Testar (4x) → Buscar bugs
- Corrigir Bugs (3x) → Consertar problemas
- Build (2x) → Compilar o jogo (precisa: energia ≥40, sanidade ≥50)
- Publicar (1x) → Finalizar! 


🎮 Ações Disponíveis

☕ Fazer/Tomar Café

- Prepara em 5 segundos (tempo real)
- Recupera muita energia
- Reduz um pouco de sanidade

⏸️ Fazer Pausa

- Recupera energia e sanidade
- Tem cooldown longo
- Use estrategicamente!

📞 Pedir Ajuda

- Só 1x por dia
- Recupera muita sanidade
- Avança progresso

⚠️ Ignorar Cansaço (perigoso!)

- Avança progresso rápido
- Perde muita sanidade
- Se ignorar 2x, texto fica com glitch


Eventos Aleatórios

Cachorro Latindo

- Ir ver: pode pegar sabotador (+energia) ou só cachorro (+sanidade)
- Ignorar: arriscado, pode perder progresso

Celular Tocando

- Atender: +sanidade, +energia (gasta 20min)
- Ignorar: -sanidade

Espelho (quando energia/sanidade baixas)

- Encarar reflexo: -12 sanidade
- Desviar olhar: -3 sanidade
- Cobrir espelho: -5 sanidade, -5 energia


💤 Sistema de Sono

- Às 24h você dorme automaticamente
- Recupera energia e sanidade
- No Dia 2: escolha trabalhar na WEG ou faltar

- Trabalhar: perde energia mas é seguro
- Faltar: arriscado! Precisa terminar o jogo ou... 






 📊 FLUXO COMPLETO:
```
DIA 1 (16:45 → 00:00)
├─ Trabalha no jogo
└─ Dorme → DIA 2

DIA 2 (16:00 → 00:00)
├─ Trabalha no jogo
└─ Se publicou: SUCCESS ✅
└─ Se não publicou: Dorme → ESCOLHA

ESCOLHA (04:00 do DIA 3)
├─ IR TRABALHAR → WEG_LOYALTY (game over) ❌
└─ FALTAR → DIA 3 começa

DIA 3 (06:00 → 12:00) ⏰ DEADLINE
├─ Trabalha no jogo
├─ Se publicar antes do meio-dia: WEG_ABSENT_SUCCESS ✅
└─ Se não publicar até 12:00: WEG_ABSENT_FAILURE ❌


# Dicas Estratégicas:

- Café dá energia (+boost baseado em quantidade), mas tira sanidade (-2)
- Pausas recuperam energia (+15) e sanidade (+15)
- Pedir ajuda recupera sanidade (+25), progresso (+20) e energia (+10)
- Ignorar avisos dá progresso (+12), mas tira muita sanidade (-20) e energia (-10)
