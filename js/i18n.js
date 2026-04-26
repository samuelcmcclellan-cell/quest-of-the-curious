// Centralized PT-BR strings for new UI added in the 2026-04 update.
// Existing hard-coded PT-BR strings across screens still live inline.

export const STRINGS = {
    lockout: {
        speechBubble: 'Vamos dar uma pausinha no cérebro! Volte em…',
        why: 'Por quê?',
        whyBody: 'Depois de 5 respostas erradas seguidas, fazemos uma pausa de 5 minutos para seu cérebro descansar. Isso ajuda você a aprender melhor!',
        switchPlayer: '🔄 Trocar Jogador',
        home: '🏠 Início',
        autoRelease: 'Hora de brincar! 🎉',
        encouragements: [
            'Seu cérebro está ganhando músculos 💪',
            'Bons alunos também descansam',
            'Alongue-se, beba água e volte com tudo',
            'Uma pausinha deixa o cérebro mais forte 🧠',
            'Respire fundo — já já você volta!'
        ]
    },
    hearts: {
        tooltip: 'Respostas erradas seguidas'
    },
    mascot: {
        genericWrong: 'Essa foi difícil — tente de novo?'
    },
    results3starByProfile: {
        ziva: 'PURA MAGIA! Nota máxima! ✨',
        ava:  'UIVO PERFEITO! Nota máxima! 🐺',
        ella: 'RUGIDO PERFEITO! Nota máxima! 🦖'
    },
    // Star-based reaction phrases for the results screen.
    // Pre-rendered to mp3 by scripts/generate-audio.mjs; runtime must look up
    // by star count rather than build the string locally.
    resultsByStars: {
        3: 'INCRÍVEL! Nota máxima! Você é uma estrela da matemática!',
        2: 'Ótimo trabalho, explorador! Quase perfeito!',
        1: 'Bom trabalho! Você resolveu! Continue praticando!',
        0: 'Continue tentando! Você vai conseguir!'
    },
    // Per-name pre-rendered progress headline. progress-screen.js looks up by
    // playerName; never build this string with template literals at runtime.
    progressHeadlineByName: {
        Ziva: 'Boa, Ziva! Vamos continuar!',
        Ava:  'Boa, Ava! Vamos continuar!',
        Ella: 'Boa, Ella! Vamos continuar!'
    },
    islandsGreeting: (accent, name) => `Olá ${accent} ${name}! Escolha uma ilha para explorar.`,
    themes: {
        ziva: {
            correctPhrases: ['Mágico!', 'Encantador!', 'Cristalino!', 'Feitiço perfeito!', 'Pura magia ✨'],
            wrongPhrases:   ['A bola de cristal vê grandeza — tente de novo!', 'Até feiticeiras treinam!', 'Sua magia está crescendo — continue!']
        },
        ava: {
            correctPhrases: ['AUUUUU!', 'Loba esperta!', 'Faro certeiro!', 'Olfato de loba!', 'Uivo da vitória! 🐺'],
            wrongPhrases:   ['A alcateia confia em você — tente de novo!', 'Lobas também treinam!', 'Sinta o caminho — outra tentativa!']
        },
        ella: {
            correctPhrases: ['Rugidoso!', 'Dino-mite!', 'Estupendossauro!', 'Trabalho jurássico!', 'Perfeição pré-histórica!'],
            wrongPhrases:   ['Os dinos não desistem!', 'Dê outra pisada!', 'O T-Rex acredita em você!']
        }
    }
};

export function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
