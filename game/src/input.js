// Lumen Drift — keyboard, mouse and touch input, normalised into one small
// object the world steps with. Arrow keys / WASD steer, Space or Shift dashes,
// mouse (held) steers toward the pointer, P pauses, M mutes, Enter starts.
// (game/src/input.js)
export function makeInput(canvas) {
  const keys = new Set();
  const pointer = { x: 0, y: 0, down: false, seen: false };
  let dashQueued = false;
  let anyQueued = false;

  function toLocal(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function onKeyDown(event) {
    const code = event.code;
    if (code === 'Space' || code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight') {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(code);
    if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') dashQueued = true;
    if (code === 'Enter' || code === 'Space') anyQueued = true;
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onPointerDown(event) {
    const p = toLocal(event);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.down = true;
    pointer.seen = true;
    anyQueued = true;
  }

  function onPointerMove(event) {
    if (!pointer.down) return;
    const p = toLocal(event);
    pointer.x = p.x;
    pointer.y = p.y;
  }

  function onPointerUp() {
    pointer.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  function axis(neg, pos) {
    return (keys.has(pos) ? 1 : 0) - (keys.has(neg) ? 1 : 0);
  }

  return {
    keys,
    pointer,
    /** Snapshot the current controls; consumes one-shot presses. */
    sample() {
      const out = {
        x: axis('ArrowLeft', 'ArrowRight') + axis('KeyA', 'KeyD'),
        y: axis('ArrowUp', 'ArrowDown') + axis('KeyW', 'KeyS'),
        dash: dashQueued,
        any: anyQueued,
        pause: keys.has('KeyP'),
        mute: keys.has('KeyM'),
        restart: keys.has('KeyR'),
        pointer: { x: pointer.x, y: pointer.y, down: pointer.down, seen: pointer.seen },
      };
      dashQueued = false;
      anyQueued = false;
      return out;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
    },
  };
}
