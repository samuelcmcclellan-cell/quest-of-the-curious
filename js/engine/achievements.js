import { getState, getAllIslandSlugs, getAchievementIds, unlockAchievement } from '../state.js';

export const ACHIEVEMENTS = [
    { id: 'first-correct',  icon: '🌱', name: 'Primeiro Passo',      desc: 'Acertou o primeiro desafio.',       check: s => s.stats.totalCorrect >= 1 },
    { id: 'streak-5',       icon: '🔥', name: 'Em Chamas',            desc: 'Sequência de 5 acertos seguidos.',  check: s => s.stats.streakBest >= 5 },
    { id: 'streak-10',      icon: '⚡', name: 'Relâmpago',            desc: 'Sequência de 10 acertos seguidos.', check: s => s.stats.streakBest >= 10 },
    { id: 'coin-100',       icon: '💰', name: 'Colecionador',         desc: 'Juntou 100 moedas.',                check: s => (s.coins || 0) >= 100 },
    { id: 'speed-3',        icon: '🏎️', name: 'Veloz',                desc: 'Ganhou 3 estrelas-relâmpago.',      check: s => (s.stats.speedStars || 0) >= 3 },
    { id: 'first-boss',     icon: '👑', name: 'Caça-Chefe',           desc: 'Derrotou seu primeiro chefe.',      check: s => getAllIslandSlugs().some(slug => s.islands[slug]?.challenges?.[14]?.completed) },
    { id: 'all-bosses',     icon: '🏆', name: 'Mestre dos Chefes',    desc: 'Derrotou os 4 chefes.',             check: s => getAllIslandSlugs().every(slug => s.islands[slug]?.challenges?.[14]?.completed) },
    { id: 'perfectionist',  icon: '💎', name: 'Perfeccionista',       desc: '3 estrelas em todos os 15 de uma ilha.', check: s => getAllIslandSlugs().some(slug => {
        const ch = s.islands[slug]?.challenges || [];
        return ch.length === 15 && ch.every(c => (c.stars || 0) === 3);
    }) },
    { id: 'collector',      icon: '🗺️', name: 'Explorador',           desc: 'Completou todas as 4 ilhas.',       check: s => getAllIslandSlugs().every(slug => (s.islands[slug]?.challenges || []).every(c => c.completed)) }
];

export function checkAchievements() {
    const state = getState();
    const already = getAchievementIds();
    const newlyUnlocked = [];
    for (const a of ACHIEVEMENTS) {
        if (already.has(a.id)) continue;
        try {
            if (a.check(state)) {
                unlockAchievement(a.id);
                newlyUnlocked.push(a);
            }
        } catch (e) { /* skip */ }
    }
    return newlyUnlocked;
}

export function getAchievementById(id) {
    return ACHIEVEMENTS.find(a => a.id === id);
}
