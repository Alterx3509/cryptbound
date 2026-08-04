'use strict';

(function applyFullScreenCanvasFix() {
  function fitCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Use CSS pixels for both the backing canvas and game coordinates.
    // This avoids the quarter-screen Retina scaling bug on iPhone.
    DPR = 1;
    W = width;
    H = height;

    canvas.width = width;
    canvas.height = height;
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    joystick.baseY = height - 105;
  }

  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  window.addEventListener('orientationchange', function () {
    window.setTimeout(fitCanvas, 120);
    window.setTimeout(fitCanvas, 450);
  });
})();
