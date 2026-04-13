const COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF9F43', '#A66DD4'];

export function confetti(count = 30) {
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.backgroundColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        particle.style.animationDuration = (1.5 + Math.random() * 2) + 's';
        particle.style.animationDelay = Math.random() * 0.5 + 's';
        particle.style.width = (6 + Math.random() * 8) + 'px';
        particle.style.height = (6 + Math.random() * 8) + 'px';
        particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        document.body.appendChild(particle);

        particle.addEventListener('animationend', () => particle.remove());
    }
}

export function starBurst(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.textContent = '⭐';
        star.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            font-size: 1.2rem;
            pointer-events: none;
            z-index: 1000;
            transition: all 0.8s ease-out;
        `;
        document.body.appendChild(star);

        const angle = (i / count) * Math.PI * 2;
        const distance = 40 + Math.random() * 40;

        requestAnimationFrame(() => {
            star.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`;
            star.style.opacity = '0';
        });

        setTimeout(() => star.remove(), 900);
    }
}
