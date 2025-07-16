(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const levelEl = document.getElementById('level');
  const startBtn = document.getElementById('startBtn');

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  // --- GAME STATE ---
  let score = 0;
  let lives = 3;
  let level = 1;
  let running = false;
  let gameOver = false;

  // --- PLAYER SHIP ---
  const ship = {
    x: WIDTH / 2 - 25,
    y: HEIGHT - 60,
    width: 50,
    height: 40,
    speed: 10,
    movingLeft: false,
    movingRight: false,
    canShoot: true,
    shootCooldown: 300,
    lastShotTime: 0
  };

  // --- BULLETS ---
  const bullets = [];

  // --- ENEMIES ---
  const enemies = [];
  let enemySpeed = 1.5;
  let enemySpawnInterval = 2000;
  let lastEnemySpawnTime = 0;

  // --- EXPLOSIONS (PARTICLES) ---
  const explosions = [];

  // --- SOUNDS ---

  const shootSound = new Audio('https://freesound.org/data/previews/320/320181_5260870-lq.mp3'); // Schuss
  // const explosionSound = new Audio('https://freesound.org/data/previews/109/109662_945474-lq.mp3'); // Explosion

  const explosionSound = new Audio('https://freesound.org/data/previews/320/320181_5260870-lq.mp3'); // Explosion

  // --- INPUT HANDLING ---
  const keys = {};

  window.addEventListener('keydown', e => {
    keys[e.code] = true;
  });

  window.addEventListener('keyup', e => {
    keys[e.code] = false;
  });

  // --- HELPERS ---
  function rectsCollide(a, b) {
    return !(
      b.x > a.x + a.width ||
      b.x + b.width < a.x ||
      b.y > a.y + a.height ||
      b.y + b.height < a.y
    );
  }

  // --- SHOOT FUNCTION ---
  function shoot() {
    const now = Date.now();
    if (!ship.canShoot || now - ship.lastShotTime < ship.shootCooldown) return;

    bullets.push({
      x: ship.x + ship.width / 2 - 4,
      y: ship.y - 10,
      width: 8,
      height: 16,
      speed: 20
    });

    ship.lastShotTime = now;

    // Sound abspielen
    shootSound.currentTime = 0;
    shootSound.play();
  }

  // --- SPAWN ENEMY ---
  function spawnEnemy() {
    const x = Math.random() * (WIDTH - 40);
    enemies.push({
      x,
      y: -40,
      width: 40,
      height: 30,
      speed: enemySpeed + Math.random(),
      zigzagTimer: 0,
      zigzagPeriod: 60 + Math.random() * 60
    });
  }

  // --- LOSE LIFE ---
  function loseLife() {
    lives--;
    if (lives <= 0) {
      running = false;
      gameOver = true;
      startBtn.style.display = 'inline-block';
      alert('Game Over! Dein Score: ' + score);
    }
  }

  // --- LEVEL UP ---
  function levelUp() {
    level++;
    enemySpeed += 0.3;
    if (enemySpawnInterval > 600) enemySpawnInterval -= 150;
    lives++;
    
  }

  // --- EXPLOSION ERZEUGEN ---
  function createExplosion(x, y) {
    explosionSound.currentTime = 0;
    explosionSound.play();

    const particlesCount = 20;
    for (let i = 0; i < particlesCount; i++) {
      explosions.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        alpha: 1,
        size: 4 + Math.random() * 3,
        decay: 0.03 + Math.random() * 0.03
      });
    }
  }

  // --- UPDATE EXPLOSIONS ---
  function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
      const p = explosions[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) explosions.splice(i, 1);
    }
  }

  // --- DRAW EXPLOSIONS ---
  function drawExplosions(ctx) {
    explosions.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = 'orange';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }



  // --- UPDATE ---
  function update(deltaTime) {
    if (!running) return;

    // Bewegung des Spielers
    if (keys['ArrowLeft'] || keys['KeyA']) ship.x -= ship.speed;
    if (keys['ArrowRight'] || keys['KeyD']) ship.x += ship.speed;
    ship.x = Math.max(0, Math.min(WIDTH - ship.width, ship.x));

    // Schießen
    if (keys['KeyE']) shoot();

    // Bullets bewegen
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y -= bullets[i].speed;
      if (bullets[i].y + bullets[i].height < 0) bullets.splice(i, 1);
    }

    // Feinde spawnen
    if (Date.now() - lastEnemySpawnTime > enemySpawnInterval) {
      spawnEnemy();
      lastEnemySpawnTime = Date.now();
    }

    // Feinde bewegen & Kollisionsabfrage
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.y += e.speed;
      e.zigzagTimer++;
      e.x += Math.sin(e.zigzagTimer / e.zigzagPeriod) * 2;

      // Gegner innerhalb des Canvas halten
      if (e.x < 0) e.x = 0;
      if (e.x > WIDTH - e.width) e.x = WIDTH - e.width;

      // Kollision mit Spieler
      if (rectsCollide(e, ship)) {
        enemies.splice(i, 1);
        loseLife();
        continue;
      }

      // Wenn Feind unten raus ist
      if (e.y > HEIGHT) {
        enemies.splice(i, 1);
        loseLife();
        continue;
      }

      // Kollision mit Kugeln
      let hit = false;
      for (let j = bullets.length - 1; j >= 0; j--) {
        if (rectsCollide(e, bullets[j])) {
          bullets.splice(j, 1);
          hit = true;
          score += 10;
          if (score % 100 === 0) levelUp();
          break;
        }
      }
      if (hit) {
        createExplosion(e.x + e.width / 2, e.y + e.height / 2);
        enemies.splice(i, 1);
      }
    }

    updateExplosions();
  }

  // --- DRAW ---
  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Schiff zeichnen (Dreieck)
    ctx.fillStyle = '#0ff';
    ctx.strokeStyle = '#0cc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ship.x + ship.width / 2, ship.y);
    ctx.lineTo(ship.x + ship.width, ship.y + ship.height);
    ctx.lineTo(ship.x, ship.y + ship.height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Kugeln zeichnen
    ctx.fillStyle = '#ff0';
    bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));

    // Feinde zeichnen (rote Ellipsen)
    enemies.forEach(e => {
      ctx.fillStyle = '#f00';
      ctx.beginPath();
      ctx.ellipse(e.x + e.width / 2, e.y + e.height / 2, e.width / 2, e.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a00';
      ctx.stroke();
    });

    // Explosionen zeichnen
    drawExplosions(ctx);

    // UI updaten
    scoreEl.textContent = 'Score: ' + score;
    livesEl.textContent = 'Lives: ' + lives;
    levelEl.textContent = 'Level: ' + level;
  }

  // --- GAME LOOP ---
  let lastFrameTime = 0;
  function gameLoop(timestamp = 0) {
    if (!running) return;
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
  }

  // --- GAME START ---
  function startGame() {
    score = 0;
    lives = 3;
    level = 1;
    enemySpeed = 2.5;
    enemySpawnInterval = 2000;
    bullets.length = 0;
    enemies.length = 0;
    explosions.length = 0;
    ship.x = WIDTH / 2 - ship.width / 2;
    running = true;
    gameOver = false;
    startBtn.style.display = 'none';
    requestAnimationFrame(gameLoop);
  }

  startBtn.addEventListener('click', () => {
    startGame();
  });
})();
