import { getState, updateState, getIslandProgress, getAllIslandSlugs } from '../state.js';
import { navigate } from '../router.js';
import * as sound from '../engine/sound.js';
import { confetti, starBurst } from '../engine/particles.js';

const ISLAND_META = {
    'numbers-reef':  { name: 'Numbers Reef',  emoji: '🏝️' },
    'purrfect-park': { name: 'Purrfect Park', emoji: '🌳' }
};

const HATS = [
    { id: 'none', emoji: '', label: 'No Hat', cost: 0 },
    { id: 'crown', emoji: '👑', label: 'Crown', cost: 10 },
    { id: 'tophat', emoji: '🎩', label: 'Top Hat', cost: 20 },
    { id: 'cap', emoji: '🧢', label: 'Cap', cost: 15 },
    { id: 'wizard', emoji: '🪄', label: 'Wizard', cost: 30 },
    { id: 'pirate', emoji: '🏴‍☠️', label: 'Pirate', cost: 40 },
];

const FACES = [
    { id: '😊', cost: 0 },
    { id: '😎', cost: 5 },
    { id: '🤓', cost: 10 },
    { id: '🥳', cost: 15 },
    { id: '🤠', cost: 20 },
    { id: '🧑‍🚀', cost: 30 },
    { id: '🦸', cost: 40 },
    { id: '🧙', cost: 50 },
];

const ACHIEVEMENTS = [
    { id: 'first-solve', label: 'First Steps', emoji: '🌟', desc: 'Complete your first challenge' },
    { id: 'three-stars', label: 'Perfect!', emoji: '⭐', desc: 'Get 3 stars on a challenge' },
    { id: 'five-complete', label: 'Halfway There', emoji: '🏅', desc: 'Complete 5 challenges' },
    { id: 'all-complete', label: 'Island Master', emoji: '🏆', desc: 'Complete all 10 challenges' },
    { id: 'practice-5', label: 'Practice Pro', emoji: '🎯', desc: 'Answer 5 practice problems' },
    { id: 'streak-3', label: 'On Fire!', emoji: '🔥', desc: 'Get a streak of 3 correct' },
    { id: 'coin-100', label: 'Treasure Hunter', emoji: '💰', desc: 'Collect 100 coins' },
    { id: 'streak-5', label: 'Unstoppable!', emoji: '⚡', desc: 'Get a streak of 5 correct' },
    { id: 'cat-whisperer', label: 'Cat Whisperer', emoji: '🐈', desc: 'Complete Purrfect Park' },
    { id: 'both-islands', label: 'World Explorer', emoji: '🌍', desc: 'Complete every island' },
];

export function enter(container) {
    const state = getState();
    checkAchievements(state);

    const slugs = getAllIslandSlugs();
    const islandStats = slugs.map(slug => ({ slug, meta: ISLAND_META[slug], progress: getIslandProgress(slug) }));
    const completedCount = islandStats.reduce((sum, is) => sum + is.progress.completed, 0);
    const totalChallenges = islandStats.reduce((sum, is) => sum + is.progress.total, 0);
    const accuracy = state.stats.totalChallenges > 0
        ? Math.round((state.stats.totalCorrect / state.stats.totalChallenges) * 100)
        : 0;

    const islandLinesHtml = islandStats.map(is =>
        `<span style="display:inline-flex;align-items:center;gap:4px;">${is.meta.emoji} ${is.meta.name}: <b>${is.progress.completed}/${is.progress.total}</b></span>`
    ).join(' &nbsp;·&nbsp; ');

    container.innerHTML = `
        <div class="top-bar" style="background:linear-gradient(135deg,#1565C0,#2196F3);color:#FFF;">
            <button class="btn btn-small" id="back-btn" style="background:transparent;color:#FFF;border:1px solid rgba(255,255,255,0.3);">← Back</button>
            <span class="top-bar-title" style="color:#FFF;">Explorer Profile</span>
            <div style="display:flex;gap:8px;">
                <span class="badge badge-stars">⭐ ${state.totalStars}</span>
                <span class="badge badge-coins">💰 ${state.coins || 0}</span>
            </div>
        </div>
        <div style="flex:1;overflow-y:auto;padding:16px;">
            <!-- Character Display -->
            <div class="card" style="text-align:center;margin-bottom:16px;">
                <div id="character-display" style="font-size:4rem;margin-bottom:8px;">
                    ${state.character.hat !== 'none' ? HATS.find(h => h.id === state.character.hat)?.emoji || '' : ''}${state.character.face}
                </div>
                <h2>${state.playerName}</h2>
                <div style="display:flex;justify-content:center;gap:16px;margin-top:12px;font-size:0.9rem;color:var(--text-light);">
                    <div>📝 ${completedCount}/${totalChallenges}</div>
                    <div>🎯 ${accuracy}%</div>
                    <div>🔥 ${state.stats.streakBest}</div>
                    <div>💰 ${state.coins || 0}</div>
                </div>
                <div style="margin-top:10px;font-size:0.82rem;color:var(--text-light);">
                    ${islandLinesHtml}
                </div>
            </div>

            <!-- Face Shop -->
            <div class="card" style="margin-bottom:16px;">
                <h3 style="margin-bottom:12px;">Choose Your Face <span style="font-size:0.8rem;color:var(--text-light);">(buy with 💰)</span></h3>
                <div id="face-grid" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;"></div>
            </div>

            <!-- Hat Shop -->
            <div class="card" style="margin-bottom:16px;">
                <h3 style="margin-bottom:12px;">Choose Your Hat <span style="font-size:0.8rem;color:var(--text-light);">(buy with 💰)</span></h3>
                <div id="hat-grid" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;"></div>
            </div>

            <!-- Achievements -->
            <div class="card" style="margin-bottom:16px;">
                <h3 style="margin-bottom:12px;">Achievements</h3>
                <div id="achievements" style="display:flex;flex-direction:column;gap:8px;"></div>
            </div>
        </div>
    `;

    // Face selection (coin-based)
    const faceGrid = container.querySelector('#face-grid');
    FACES.forEach(face => {
        const owned = face.cost === 0 || (state.purchasedFaces || []).includes(face.id) || state.character.face === face.id;
        const canAfford = (state.coins || 0) >= face.cost;
        const selected = state.character.face === face.id;

        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.style.cssText = `
            width:56px;height:56px;font-size:2rem;padding:0;
            border-radius:var(--radius);position:relative;
            background:${selected ? 'var(--primary-light)' : owned ? 'var(--bg-card)' : '#EEE'};
            border:3px solid ${selected ? 'var(--primary)' : 'transparent'};
            opacity:${owned || canAfford ? '1' : '0.4'};
            box-shadow:none;
        `;
        btn.textContent = face.id;

        if (!owned && face.cost > 0) {
            const costLabel = document.createElement('span');
            costLabel.style.cssText = 'position:absolute;bottom:-2px;right:-2px;font-size:0.55rem;background:#FFD740;border-radius:8px;padding:1px 4px;';
            costLabel.textContent = `💰${face.cost}`;
            btn.appendChild(costLabel);
        }

        if (owned) {
            btn.addEventListener('click', () => {
                updateState(s => { s.character.face = face.id; });
                sound.tap();
                enter(container);
            });
        } else if (canAfford) {
            btn.addEventListener('click', () => {
                updateState(s => {
                    s.coins -= face.cost;
                    s.purchasedFaces = s.purchasedFaces || [];
                    s.purchasedFaces.push(face.id);
                    s.character.face = face.id;
                });
                sound.coinCollect();
                confetti(15);
                enter(container);
            });
        }

        faceGrid.appendChild(btn);
    });

    // Hat selection (coin-based)
    const hatGrid = container.querySelector('#hat-grid');
    HATS.forEach(hat => {
        const owned = hat.cost === 0 || (state.purchasedHats || []).includes(hat.id) || state.character.hat === hat.id;
        const canAfford = (state.coins || 0) >= hat.cost;
        const selected = state.character.hat === hat.id;

        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.style.cssText = `
            min-width:70px;height:56px;font-size:${hat.emoji ? '1.5rem' : '0.8rem'};padding:4px 8px;
            border-radius:var(--radius);position:relative;
            background:${selected ? 'var(--primary-light)' : owned ? 'var(--bg-card)' : '#EEE'};
            border:3px solid ${selected ? 'var(--primary)' : 'transparent'};
            opacity:${owned || canAfford ? '1' : '0.4'};
            box-shadow:none;
            display:flex;flex-direction:column;align-items:center;gap:2px;
        `;
        btn.innerHTML = `<span>${hat.emoji || '—'}</span><span style="font-size:0.65rem;">${hat.label}</span>`;

        if (!owned && hat.cost > 0) {
            const costLabel = document.createElement('span');
            costLabel.style.cssText = 'position:absolute;bottom:-2px;right:-2px;font-size:0.55rem;background:#FFD740;border-radius:8px;padding:1px 4px;';
            costLabel.textContent = `💰${hat.cost}`;
            btn.appendChild(costLabel);
        }

        if (owned) {
            btn.addEventListener('click', () => {
                updateState(s => { s.character.hat = hat.id; });
                sound.tap();
                enter(container);
            });
        } else if (canAfford) {
            btn.addEventListener('click', () => {
                updateState(s => {
                    s.coins -= hat.cost;
                    s.purchasedHats = s.purchasedHats || [];
                    s.purchasedHats.push(hat.id);
                    s.character.hat = hat.id;
                });
                sound.coinCollect();
                confetti(15);
                enter(container);
            });
        }

        hatGrid.appendChild(btn);
    });

    // Achievements
    const achievementsEl = container.querySelector('#achievements');
    ACHIEVEMENTS.forEach(ach => {
        const earned = state.achievements.includes(ach.id);
        const el = document.createElement('div');
        el.style.cssText = `
            display:flex;align-items:center;gap:12px;padding:10px;
            border-radius:var(--radius);
            background:${earned ? '#E8F5E9' : '#F5F5F5'};
            opacity:${earned ? '1' : '0.5'};
        `;
        el.innerHTML = `
            <span style="font-size:1.8rem;">${earned ? ach.emoji : '🔒'}</span>
            <div>
                <div style="font-weight:700;font-size:0.95rem;">${ach.label}</div>
                <div style="font-size:0.8rem;color:var(--text-light);">${ach.desc}</div>
            </div>
        `;
        achievementsEl.appendChild(el);
    });

    container.querySelector('#back-btn').addEventListener('click', () => navigate('islands'));
}

function checkAchievements(state) {
    const earned = new Set(state.achievements);

    // Flatten all island challenges
    const allChallenges = [];
    for (const island of Object.values(state.islands || {})) {
        allChallenges.push(...(island.challenges || []));
    }
    const completed = allChallenges.filter(c => c.completed).length;
    const has3Star = allChallenges.some(c => c.stars === 3);

    const reefProgress = getIslandProgress('numbers-reef');
    const parkProgress = getIslandProgress('purrfect-park');

    if (completed >= 1) earned.add('first-solve');
    if (has3Star) earned.add('three-stars');
    if (completed >= 5) earned.add('five-complete');
    if (reefProgress.isComplete) earned.add('all-complete');
    if (state.stats.totalChallenges >= 5) earned.add('practice-5');
    if (state.stats.streakBest >= 3) earned.add('streak-3');
    if (state.stats.streakBest >= 5) earned.add('streak-5');
    if ((state.coins || 0) >= 100) earned.add('coin-100');
    if (parkProgress.isComplete) earned.add('cat-whisperer');
    if (reefProgress.isComplete && parkProgress.isComplete) earned.add('both-islands');

    const newAchievements = [...earned];
    if (newAchievements.length !== state.achievements.length) {
        updateState(s => { s.achievements = newAchievements; });
    }
}

export function exit() {}
