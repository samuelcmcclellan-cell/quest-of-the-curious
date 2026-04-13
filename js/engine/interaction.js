/**
 * Unified drag & drop interaction manager.
 * Handles touch and mouse via pointer events.
 *
 * Usage:
 *   const manager = new InteractionManager(container);
 *   manager.onDrop = (dragId, dropZoneId) => { ... };
 *   manager.onDragStart = (dragId) => { ... };
 *   manager.destroy();
 *
 * HTML:
 *   <div data-draggable="digit-5">5</div>
 *   <div data-drop-zone="slot-ones">_</div>
 */
export class InteractionManager {
    constructor(container) {
        this.container = container;
        this.dragging = null;       // { el, id, startX, startY, offsetX, offsetY, clone }
        this.dropZones = [];
        this.onDrop = null;         // (dragId, dropZoneId) => void
        this.onDragStart = null;    // (dragId) => void
        this.onDragEnd = null;      // (dragId, dropped) => void
        this.onReturn = null;       // (dragId) => void
        this.SNAP_DISTANCE = 40;

        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);

        container.addEventListener('pointerdown', this._onPointerDown);
        document.addEventListener('pointermove', this._onPointerMove);
        document.addEventListener('pointerup', this._onPointerUp);
    }

    _onPointerDown(e) {
        const el = e.target.closest('[data-draggable]');
        if (!el || el.classList.contains('drag-disabled')) return;

        e.preventDefault();
        el.setPointerCapture(e.pointerId);

        const rect = el.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();

        // Create a visual clone for dragging
        const clone = el.cloneNode(true);
        clone.classList.add('drag-clone');
        clone.style.position = 'fixed';
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.height = rect.height + 'px';
        clone.style.zIndex = '1000';
        clone.style.transform = 'scale(1.1)';
        clone.style.transition = 'transform 0.1s ease';
        clone.style.pointerEvents = 'none';
        clone.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
        document.body.appendChild(clone);

        // Dim the original
        el.style.opacity = '0.3';

        this.dragging = {
            el,
            id: el.dataset.draggable,
            startX: rect.left,
            startY: rect.top,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            clone,
            pointerId: e.pointerId,
        };

        // Cache drop zones
        this.dropZones = Array.from(
            this.container.querySelectorAll('[data-drop-zone]')
        ).map(dz => ({
            el: dz,
            id: dz.dataset.dropZone,
            rect: dz.getBoundingClientRect(),
        }));

        if (this.onDragStart) this.onDragStart(this.dragging.id);
    }

    _onPointerMove(e) {
        if (!this.dragging) return;
        e.preventDefault();

        const { clone, offsetX, offsetY } = this.dragging;
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        clone.style.left = x + 'px';
        clone.style.top = y + 'px';

        // Highlight nearest drop zone
        const centerX = e.clientX;
        const centerY = e.clientY;

        this.dropZones.forEach(dz => {
            const dzCX = dz.rect.left + dz.rect.width / 2;
            const dzCY = dz.rect.top + dz.rect.height / 2;
            const dist = Math.hypot(centerX - dzCX, centerY - dzCY);

            if (dist < this.SNAP_DISTANCE) {
                dz.el.classList.add('drop-zone-hover');
            } else {
                dz.el.classList.remove('drop-zone-hover');
            }
        });
    }

    _onPointerUp(e) {
        if (!this.dragging) return;

        const { el, id, clone, startX, startY } = this.dragging;
        const centerX = e.clientX;
        const centerY = e.clientY;

        // Find closest drop zone within snap distance
        let bestZone = null;
        let bestDist = Infinity;

        this.dropZones.forEach(dz => {
            const dzCX = dz.rect.left + dz.rect.width / 2;
            const dzCY = dz.rect.top + dz.rect.height / 2;
            const dist = Math.hypot(centerX - dzCX, centerY - dzCY);

            if (dist < this.SNAP_DISTANCE && dist < bestDist) {
                bestDist = dist;
                bestZone = dz;
            }
        });

        // Clear all hover states
        this.dropZones.forEach(dz => dz.el.classList.remove('drop-zone-hover'));

        if (bestZone) {
            // Snap to drop zone
            const dzRect = bestZone.rect;
            clone.style.transition = 'all 0.15s ease';
            clone.style.left = (dzRect.left + dzRect.width / 2 - clone.offsetWidth / 2) + 'px';
            clone.style.top = (dzRect.top + dzRect.height / 2 - clone.offsetHeight / 2) + 'px';
            clone.style.transform = 'scale(1)';

            setTimeout(() => {
                clone.remove();
                if (this.onDrop) this.onDrop(id, bestZone.id);
            }, 150);
        } else {
            // Return to original position
            clone.style.transition = 'all 0.2s ease';
            clone.style.left = startX + 'px';
            clone.style.top = startY + 'px';
            clone.style.transform = 'scale(1)';
            clone.style.boxShadow = 'none';

            setTimeout(() => {
                clone.remove();
                el.style.opacity = '1';
                if (this.onReturn) this.onReturn(id);
            }, 200);
        }

        // Restore original unless dropped
        if (bestZone) {
            // Keep dimmed - the drop handler will manage visibility
        } else {
            // Already handled in timeout above
        }

        if (this.onDragEnd) this.onDragEnd(id, !!bestZone);
        this.dragging = null;
    }

    // Manually restore a draggable element's opacity
    restoreDraggable(dragId) {
        const el = this.container.querySelector(`[data-draggable="${dragId}"]`);
        if (el) el.style.opacity = '1';
    }

    // Disable a draggable element
    disableDraggable(dragId) {
        const el = this.container.querySelector(`[data-draggable="${dragId}"]`);
        if (el) el.classList.add('drag-disabled');
    }

    destroy() {
        this.container.removeEventListener('pointerdown', this._onPointerDown);
        document.removeEventListener('pointermove', this._onPointerMove);
        document.removeEventListener('pointerup', this._onPointerUp);
        if (this.dragging && this.dragging.clone) {
            this.dragging.clone.remove();
        }
        this.dragging = null;
    }
}
