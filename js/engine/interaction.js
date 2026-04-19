/**
 * Unified drag & drop interaction manager.
 * Handles touch and mouse via pointer events.
 *
 * Robustness fixes:
 *  - Re-entry guard (ignore pointerdown while already dragging)
 *  - pointerId filtering on move/up/cancel (multi-touch safety)
 *  - pointercancel listener (iOS / context switches)
 *  - window.blur + document.visibilitychange cleanup
 *  - Live recompute of drop-zone rects + start rect each move (handles scroll)
 *  - Stray-clone sweep in destroy()
 *  - Opacity restore in destroy() for any mid-drag element
 *  - try/catch around setPointerCapture (not always supported)
 *  - Clone positioned with fixed offset from cursor (no jump)
 *
 * Usage:
 *   const manager = new InteractionManager(container);
 *   manager.onDrop = (dragId, dropZoneId) => { ... };
 *   manager.destroy();
 *
 * HTML:
 *   <div data-draggable="digit-5">5</div>
 *   <div data-drop-zone="slot-ones">_</div>
 */
export class InteractionManager {
    constructor(container) {
        this.container = container;
        this.dragging = null;
        this.dropZones = [];
        this.onDrop = null;
        this.onDragStart = null;
        this.onDragEnd = null;
        this.onReturn = null;
        this.SNAP_DISTANCE = 40;

        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);
        this._onPointerCancel = this._onPointerCancel.bind(this);
        this._onBlur = this._onBlur.bind(this);
        this._onVisibility = this._onVisibility.bind(this);

        container.addEventListener('pointerdown', this._onPointerDown);
        document.addEventListener('pointermove', this._onPointerMove);
        document.addEventListener('pointerup', this._onPointerUp);
        document.addEventListener('pointercancel', this._onPointerCancel);
        window.addEventListener('blur', this._onBlur);
        document.addEventListener('visibilitychange', this._onVisibility);
    }

    _onPointerDown(e) {
        // Re-entry guard — only one drag at a time
        if (this.dragging) return;

        const el = e.target.closest('[data-draggable]');
        if (!el || el.classList.contains('drag-disabled')) return;

        e.preventDefault();

        try {
            el.setPointerCapture(e.pointerId);
        } catch (err) {
            // Some environments don't support pointer capture; ignore.
        }

        const rect = el.getBoundingClientRect();

        // Build clone at exact element position; no inflated scale jump.
        const clone = el.cloneNode(true);
        clone.classList.add('drag-clone');
        clone.style.position = 'fixed';
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.height = rect.height + 'px';
        clone.style.margin = '0';
        clone.style.zIndex = '1000';
        clone.style.transform = 'scale(1.1)';
        clone.style.transformOrigin = 'center center';
        clone.style.transition = 'transform 0.1s ease';
        clone.style.pointerEvents = 'none';
        clone.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
        document.body.appendChild(clone);

        // Dim the original
        el.style.opacity = '0.3';

        this.dragging = {
            el,
            id: el.dataset.draggable,
            // Live start rect (recomputed on drag end to handle scroll)
            startRect: rect,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            clone,
            pointerId: e.pointerId,
        };

        this._refreshDropZones();

        if (this.onDragStart) this.onDragStart(this.dragging.id);
    }

    _refreshDropZones() {
        this.dropZones = Array.from(
            this.container.querySelectorAll('[data-drop-zone]')
        ).map(dz => ({
            el: dz,
            id: dz.dataset.dropZone,
            rect: dz.getBoundingClientRect(),
        }));
    }

    _onPointerMove(e) {
        if (!this.dragging) return;
        if (e.pointerId !== this.dragging.pointerId) return;
        e.preventDefault();

        const { clone, offsetX, offsetY } = this.dragging;
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        clone.style.left = x + 'px';
        clone.style.top = y + 'px';

        // Recompute drop-zone rects live — the container may scroll during drag.
        this._refreshDropZones();

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
        if (e.pointerId !== this.dragging.pointerId) return;

        const { el, id, clone } = this.dragging;
        // Live rect for start position (element may have shifted while dragging)
        const startRect = el.isConnected ? el.getBoundingClientRect() : this.dragging.startRect;
        const centerX = e.clientX;
        const centerY = e.clientY;

        // Recompute drop zones one last time for accurate drop
        this._refreshDropZones();

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

        this.dropZones.forEach(dz => dz.el.classList.remove('drop-zone-hover'));

        if (bestZone) {
            const dzRect = bestZone.rect;
            clone.style.transition = 'all 0.15s ease';
            clone.style.left = (dzRect.left + dzRect.width / 2 - clone.offsetWidth / 2) + 'px';
            clone.style.top = (dzRect.top + dzRect.height / 2 - clone.offsetHeight / 2) + 'px';
            clone.style.transform = 'scale(1)';

            const dropId = bestZone.id;
            setTimeout(() => {
                if (clone.parentNode) clone.remove();
                if (this.onDrop) this.onDrop(id, dropId);
            }, 150);
        } else {
            clone.style.transition = 'all 0.2s ease';
            clone.style.left = startRect.left + 'px';
            clone.style.top = startRect.top + 'px';
            clone.style.transform = 'scale(1)';
            clone.style.boxShadow = 'none';

            setTimeout(() => {
                if (clone.parentNode) clone.remove();
                if (el && el.isConnected) el.style.opacity = '1';
                if (this.onReturn) this.onReturn(id);
            }, 200);
        }

        if (this.onDragEnd) this.onDragEnd(id, !!bestZone);
        this.dragging = null;
    }

    _onPointerCancel(e) {
        if (!this.dragging) return;
        if (e.pointerId !== this.dragging.pointerId) return;
        this._abortDrag();
    }

    _onBlur() {
        if (this.dragging) this._abortDrag();
    }

    _onVisibility() {
        if (document.hidden && this.dragging) this._abortDrag();
    }

    _abortDrag() {
        if (!this.dragging) return;
        const { el, clone, id } = this.dragging;
        if (clone && clone.parentNode) clone.remove();
        if (el && el.isConnected) el.style.opacity = '1';
        this.dropZones.forEach(dz => dz.el.classList.remove('drop-zone-hover'));
        if (this.onReturn) this.onReturn(id);
        if (this.onDragEnd) this.onDragEnd(id, false);
        this.dragging = null;
    }

    restoreDraggable(dragId) {
        const el = this.container.querySelector(`[data-draggable="${dragId}"]`);
        if (el) el.style.opacity = '1';
    }

    disableDraggable(dragId) {
        const el = this.container.querySelector(`[data-draggable="${dragId}"]`);
        if (el) el.classList.add('drag-disabled');
    }

    destroy() {
        this.container.removeEventListener('pointerdown', this._onPointerDown);
        document.removeEventListener('pointermove', this._onPointerMove);
        document.removeEventListener('pointerup', this._onPointerUp);
        document.removeEventListener('pointercancel', this._onPointerCancel);
        window.removeEventListener('blur', this._onBlur);
        document.removeEventListener('visibilitychange', this._onVisibility);

        // Restore opacity on active drag element
        if (this.dragging && this.dragging.el && this.dragging.el.isConnected) {
            this.dragging.el.style.opacity = '1';
        }
        // Remove active drag clone
        if (this.dragging && this.dragging.clone && this.dragging.clone.parentNode) {
            this.dragging.clone.remove();
        }
        // Sweep any stray clones left in the DOM (e.g. from a previous aborted drag)
        document.querySelectorAll('.drag-clone').forEach(n => n.remove());

        // Also restore any draggables that may still be dimmed
        this.container.querySelectorAll('[data-draggable]').forEach(el => {
            if (el.style.opacity && parseFloat(el.style.opacity) < 1) {
                el.style.opacity = '1';
            }
        });

        this.dragging = null;
        this.dropZones = [];
    }
}
