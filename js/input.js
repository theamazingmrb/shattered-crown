// ============================================================
// input.js  —  Keyboard & mouse input handler
// ============================================================

const INPUT = (() => {
  const keys      = {};
  const justPressed = {};
  let mouseX = 0, mouseY = 0;
  let pendingClicks = [];   // queue so nothing gets eaten twice

  window.addEventListener('keydown', e => {
    const k = e.key;
    if (!keys[k]) justPressed[k] = true;
    keys[k] = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(k)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', e => {
    keys[e.key] = false;
  });

  const canvas = document.getElementById('game-canvas');
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top)  * scaleY;
  });

  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    pendingClicks.push({
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    });
  });

  function wasPressed(k) { return !!justPressed[k]; }
  function isDown(k)     { return !!keys[k]; }

  function flush() {
    for (const k in justPressed) delete justPressed[k];
    // Keep pendingClicks for consumeClick
  }

  function consumeClick() {
    if (pendingClicks.length > 0) return pendingClicks.shift();
    return null;
  }

  function peekClick() {
    return pendingClicks.length > 0 ? pendingClicks[0] : null;
  }

  function clearClicks() { pendingClicks = []; }

  function getMousePos() { return { x: mouseX, y: mouseY }; }

  function didAdvance() {
    return wasPressed('Enter') || wasPressed(' ');
  }

  return { wasPressed, isDown, flush, consumeClick, peekClick, clearClicks, getMousePos, didAdvance };
})();
