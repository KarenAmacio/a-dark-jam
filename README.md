# 🎮 Deadline - Game Jam 2025

Um jogo narrativo sobre criar um jogo em 48 horas enquanto trabalha.

## 🎯 Sobre o Jogo

Você tem 2 dias para terminar seu jogo para a game jam. 
Mas você também precisa trabalhar. 
E dormir. 
E manter a sanidade.

Será que você consegue?

## ⚡ Mecânicas Principais

- **Sistema de Energia e Sanidade**: Gerencie seus recursos físicos e mentais
- **Fases de Desenvolvimento**: Sprites → Mapas → Personagens → Diálogos → Testes → Debug → Build → Publish
- **Eventos Aleatórios**: Cachorro latindo, celular tocando, espelho estranho...
- **Sistema de Save/Load**: Lembre-se de salvar seu progresso (ou perca tudo)
- **Cooldowns em Tempo Real**: Ações levam tempo para serem executadas novamente
- **Múltiplos Finais**: Suas escolhas importam

## 🛠️ Tecnologias

- **JavaScript vanilla** - Toda a lógica do jogo
- **HTML5/CSS3** - Interface e estilização
- **Sistema de estados** - Gerenciamento complexo de game state
- **Proxy Objects** - Para rastreamento automático de cooldowns

## 🎮 Como Jogar

1. Clone o repositório
```bash
git clone [seu-repo]
```

2. Abra o `index.html` no navegador
   - Não precisa de servidor local
   - Funciona offline

3. Ou jogue online: [SEU_LINK_ITCH.IO]

## 🎨 Recursos

- Sistema de cooldown visual com barras de progresso
- Efeitos de glitch quando a sanidade está baixa
- Transições de atmosfera baseadas no progresso
- Sistema de eventos condicionais

## 🐛 Debug Mode

Pressione `D` durante o jogo para ativar o painel de debug.

Comandos no console:
```javascript
debug.skipTo('build')      // Pula para uma fase
debug.god()                // God mode
debug.state()              // Ver estado atual
debug.clearCooldowns()     // Zera cooldowns
```

## 📋 Características Técnicas

- **Arquitetura baseada em regras**: Sistema flexível de pré-requisitos para tarefas
- **Event-driven**: Eventos aleatórios baseados em condições
- **State management**: Gerenciamento robusto de estado do jogo
- **No dependencies**: Zero bibliotecas externas

## 🎓 O que Aprendi

- Gerenciamento de estado complexo sem frameworks
- Implementação de game loops e cooldowns
- Balanceamento de mecânicas de jogo
- Criar tensão através de sistemas de recursos
- Debug tools para desenvolvimento ágil

## 🏆 Game Jam Details

- **Evento**: Game Jam CatolicaSC 2025
- **Tema**: [tema da jam]
- **Duração**: 20 a 24 de outubro
- **Time**: Karen Amancio e Esther Riggol - Eng de Software 2° período

## 📝 Licença

MIT License - sinta-se livre para usar e modificar!

## 🤝 Contato

Email:  karenamancio.dev@gmail.com 
LindedIn: https://www.linkedin.com/in/karen-amancio/

---

⭐ Se gostou do jogo, deixe uma estrela!
