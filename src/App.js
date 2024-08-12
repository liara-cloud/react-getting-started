import React, { useEffect, useRef } from 'react';
import './App.css';

const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI * 0.5;
const timeStep = 1 / 60;

function Point(x, y) {
  this.x = x || 0;
  this.y = y || 0;
}

function Particle(p0, p1, p2, p3) {
  this.p0 = p0;
  this.p1 = p1;
  this.p2 = p2;
  this.p3 = p3;

  this.time = 0;
  this.duration = 3 + Math.random() * 2;
  this.color = '#' + Math.floor(Math.random() * 0xffffff).toString(16);

  this.w = 8;
  this.h = 6;

  this.complete = false;
}

Particle.prototype.update = function () {
  this.time = Math.min(this.duration, this.time + timeStep);

  const f = Ease.outCubic(this.time, 0, 1, this.duration);
  const p = cubeBezier(this.p0, this.p1, this.p2, this.p3, f);

  const dx = p.x - this.x;
  const dy = p.y - this.y;

  this.r = Math.atan2(dy, dx) + HALF_PI;
  this.sy = Math.sin(Math.PI * f * 10);
  this.x = p.x;
  this.y = p.y;

  this.complete = this.time === this.duration;
};

Particle.prototype.draw = function (ctx) {
  ctx.save();
  ctx.translate(this.x, this.y);
  ctx.rotate(this.r);
  ctx.scale(1, this.sy);

  ctx.fillStyle = this.color;
  ctx.fillRect(-this.w * 0.5, -this.h * 0.5, this.w, this.h);

  ctx.restore();
};

function Loader(x, y) {
  this.x = x;
  this.y = y;

  this.r = 24;
  this._progress = 0;

  this.complete = false;
}

Loader.prototype.reset = function () {
  this._progress = 0;
  this.complete = false;
};

Object.defineProperty(Loader.prototype, 'progress', {
  get: function () {
    return this._progress;
  },
  set: function (p) {
    this._progress = p < 0 ? 0 : p > 1 ? 1 : p;
    this.complete = this._progress === 1;
  }
});

Loader.prototype.draw = function (ctx) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r, -HALF_PI, TWO_PI * this._progress - HALF_PI);
  ctx.lineTo(this.x, this.y);
  ctx.closePath();
  ctx.fill();
};

function Exploader(x, y) {
  this.x = x;
  this.y = y;

  this.startRadius = 24;

  this.time = 0;
  this.duration = 0.4;
  this.progress = 0;

  this.complete = false;
}

Exploader.prototype.reset = function () {
  this.time = 0;
  this.progress = 0;
  this.complete = false;
};

Exploader.prototype.update = function () {
  this.time = Math.min(this.duration, this.time + timeStep);
  this.progress = Ease.inBack(this.time, 0, 1, this.duration);

  this.complete = this.time === this.duration;
};

Exploader.prototype.draw = function (ctx) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.startRadius * (1 - this.progress), 0, TWO_PI);
  ctx.fill();
};

const particles = [];
let loader, exploader;
let phase = 0;

function Ease() {}
Ease.outCubic = function (t, b, c, d) {
  t /= d;
  t--;
  return c * (t * t * t + 1) + b;
};
Ease.inBack = function (t, b, c, d, s) {
  s = s || 1.70158;
  return c * (t /= d) * t * ((s + 1) * t - s) + b;
};

function cubeBezier(p0, c0, c1, p1, t) {
  const nt = 1 - t;
  return new Point(
    nt * nt * nt * p0.x + 3 * nt * nt * t * c0.x + 3 * nt * t * t * c1.x + t * t * t * p1.x,
    nt * nt * nt * p0.y + 3 * nt * nt * t * c0.y + 3 * nt * t * t * c1.y + t * t * t * p1.y
  );
}

function App() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function initDrawingCanvas() {
      createLoader();
      createExploader();
      createParticles();
    }

    function createLoader() {
      loader = new Loader(canvas.width * 0.5, canvas.height * 0.5);
    }

    function createExploader() {
      exploader = new Exploader(canvas.width * 0.5, canvas.height * 0.5);
    }

    function createParticles() {
      for (let i = 0; i < 128; i++) {
        const p0 = new Point(canvas.width * 0.5, canvas.height * 0.5);
        const p1 = new Point(Math.random() * canvas.width, Math.random() * canvas.height);
        const p2 = new Point(Math.random() * canvas.width, Math.random() * canvas.height);
        const p3 = new Point(Math.random() * canvas.width, canvas.height + 64);
        particles.push(new Particle(p0, p1, p2, p3));
      }
    }

    function update() {
      switch (phase) {
        case 0:
          loader.progress += 1 / 45;
          break;
        case 1:
          exploader.update();
          break;
        case 2:
          particles.forEach(p => p.update());
          break;
        default:
          break;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      switch (phase) {
        case 0:
          loader.draw(ctx);
          break;
        case 1:
          exploader.draw(ctx);
          break;
        case 2:
          particles.forEach(p => p.draw(ctx));
          break;
        default:
          break;
      }
    }

    function checkParticlesComplete() {
      return particles.every(p => p.complete);
    }

    function loop() {
      update();
      draw();

      if (phase === 0 && loader.complete) {
        phase = 1;
      } else if (phase === 1 && exploader.complete) {
        phase = 2;
      } else if (phase === 2 && checkParticlesComplete()) {
        // Reset
        phase = 2;
        exploader.reset();
        particles.length = 0;
        createParticles();
      }

      requestAnimationFrame(loop);
    }

    canvas.width = 512;
    canvas.height = 350;
    initDrawingCanvas();
    requestAnimationFrame(loop);
  }, []);

  return (
    <div className="App">
      <h1>Hooray!</h1>
      <canvas id="drawing_canvas" ref={canvasRef}></canvas>
    </div>
  );
}

export default App;
