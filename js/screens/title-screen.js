import { getState, updateState } from '../state.js';
import { navigate } from '../router.js';

export function enter(container) {
    const state = getState();

    container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:20px;padding:24px;text-align:center;background:linear-gradient(180deg,#1565C0 0%,#2196F3 40%,#64B5F6 70%,#FFF8E1 100%);">
            <div class="anim-float" style="font-size:5rem;margin-bottom:-10px;">🦉</div>
            <h1 style="color:#FFF;text-shadow:0 2px 8px rgba(0,0,0,0.2);font-size:2.2rem;">Quest of the<br>Curious</h1>
            <p style="color:rgba(255,255,255,0.9);font-size:1rem;max-width:280px;">Explore Numbers Reef and solve math puzzles!</p>
            <div style="width:100%;max-width:280px;margin-top:12px;">
                <label style="color:#FFF;font-size:0.9rem;font-weight:600;display:block;text-align:left;margin-bottom:6px;">Your explorer name:</label>
                <input class="input" id="name-input" type="text" value="${state.playerName}" maxlength="20" placeholder="Enter your name">
            </div>
            <button class="btn btn-primary btn-large" id="start-btn">
                Start Adventure 🚀
            </button>
            ${state.totalStars > 0 ? '<button class="btn btn-ghost" id="continue-btn" style="color:#FFF;border-color:rgba(255,255,255,0.5);">Continue Journey ⭐ ' + state.totalStars + '</button>' : ''}
        </div>
    `;

    const startBtn = container.querySelector('#start-btn');
    const continueBtn = container.querySelector('#continue-btn');
    const nameInput = container.querySelector('#name-input');

    startBtn.addEventListener('click', () => {
        const name = nameInput.value.trim() || 'Explorer';
        updateState(s => { s.playerName = name; });
        navigate('map');
    });

    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            const name = nameInput.value.trim() || 'Explorer';
            updateState(s => { s.playerName = name; });
            navigate('map');
        });
    }
}

export function exit() {}
