const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');
const scoreLeftElem = document.getElementById('score-left');
const scoreRightElem = document.getElementById('score-right');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');
const winMessage = document.getElementById('win-message');
const difficultySel = document.getElementById('difficulty');
const modeToggleBtn = document.getElementById('mode-toggle-btn');

const LOGIC_WIDTH = 800, LOGIC_HEIGHT = 500;
let W = LOGIC_WIDTH, H = LOGIC_HEIGHT;

const PADDLE_WIDTH = 12, PADDLE_HEIGHT = 90, PADDLE_MARGIN = 18;
const BALL_SIZE = 16;
const WIN_SCORE = 10;
const PARTICLE_COUNT = 18;
const PARTICLE_LIFE = 24;

const AIDifficulty = {
  easy:   { reaction: 0.06, error: 48 },
  normal: { reaction: 0.12, error: 22 },
  hard:   { reaction: 0.20, error: 7 }
};
let aiLevel = 'normal';
let gameMode = 'ai'; // 'ai' or '2p' // Default to AI mode

let game = { paused: false, running: true, win: null };

let leftPaddle, rightPaddle, ball, particles, scores;


let touchStartY = null, paddleStartY = null;


function resetGame() {
  leftPaddle = { x: PADDLE_MARGIN, y: H/2-PADDLE_HEIGHT/2, vy: 0 };
  rightPaddle = { x: W-PADDLE_WIDTH-PADDLE_MARGIN, y: H/2-PADDLE_HEIGHT/2, vy: 0, ai: 0 };
  ball = {
    x: W/2-BALL_SIZE/2, y: H/2-BALL_SIZE/2,
    vx: Math.random() > 0.5 ? 5 : -5,
    vy: (Math.random()-0.5)*5,
    speed: 7
  };
  particles = [];
  scores = { left: 0, right: 0 };
  game.paused = false;
  game.running = true;
  game.win = null;

  winMessage.classList.add('hidden');
  scoreLeftElem.textContent = scores.left;
  scoreRightElem.textContent = scores.right;

  // Update UI based on gameMode
  if (gameMode === '2player') {
    difficultySel.style.display = 'none';
    if (modeToggleBtn && typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
      modeToggleBtn.textContent = translations[currentLang]['mode-toggle-btn-ai'];
    }
  } else { // AI mode
    difficultySel.style.display = 'inline-block';
    if (modeToggleBtn && typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
      modeToggleBtn.textContent = translations[currentLang]['mode-toggle-btn-2p'];
    }
  }
  // Ensure pause button text is correct according to current language and game state
  if (pauseBtn && typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && translations[currentLang]) {
    pauseBtn.textContent = game.paused ? (translations[currentLang]['resume-btn'] || '继续') : (translations[currentLang]['pause-btn'] || '暂停');
  } else if (pauseBtn) {
    pauseBtn.textContent = game.paused ? '继续' : '暂停'; // Fallback if translations not fully loaded
  }
}
resetGame();

function drawRect(x, y, w, h, color = '#fff', radius = 4) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x+radius, y);
  ctx.lineTo(x+w-radius, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+radius);
  ctx.lineTo(x+w, y+h-radius);
  ctx.quadraticCurveTo(x+w, y+h, x+w-radius, y+h);
  ctx.lineTo(x+radius, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-radius);
  ctx.lineTo(x, y+radius);
  ctx.quadraticCurveTo(x, y, x+radius, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawBall() {
  ctx.save();
  ctx.beginPath();
  ctx.arc(ball.x+BALL_SIZE/2, ball.y+BALL_SIZE/2, BALL_SIZE/2, 0, 2*Math.PI);

  const isLightTheme = document.body.classList.contains('light-theme');
  const ballColor = isLightTheme ? "#333333" : "#f3e870";

  ctx.fillStyle = ballColor;
  ctx.shadowColor = ballColor;
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.restore();
}
function drawParticles() {
  for (let p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life/PARTICLE_LIFE;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, 2*Math.PI);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  }
}
function drawNet() {
  ctx.save();
  ctx.setLineDash([8, 12]);
  ctx.strokeStyle = "#bbb5";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W/2, 0);
  ctx.lineTo(W/2, H);
  ctx.stroke();
  ctx.restore();
}
function render() {
  ctx.clearRect(0, 0, W, H);
  // net
  drawNet();
  // paddles
  drawRect(leftPaddle.x, leftPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT, "#57a6ff");
  drawRect(rightPaddle.x, rightPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT, "#fb678a");
  // ball
  drawBall();
  // particles
  drawParticles();
}


function updateParticles() {
  for (let i=particles.length-1; i>=0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}
function spawnParticles(x, y, color) {

  const isLightTheme = document.body.classList.contains('light-theme');
  

  if (isLightTheme && color === "#f3e870") {
    color = "#333333";
  }
  
  for (let i=0; i<PARTICLE_COUNT; i++) {
    let angle = Math.random()*2*Math.PI;
    let speed = Math.random()*4+1;
    particles.push({
      x: x, y: y,
      vx: Math.cos(angle)*speed,
      vy: Math.sin(angle)*speed,
      size: Math.random()*3+2,
      color: color,
      life: PARTICLE_LIFE
    });
  }
}
function updateBall() {
  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.y < 0) {
    ball.y = 0; ball.vy *= -1;

    const isLightTheme = document.body.classList.contains('light-theme');
    const ballColor = isLightTheme ? "#333333" : "#f3e870";
    spawnParticles(ball.x+BALL_SIZE/2, 0, ballColor);
  }
  if (ball.y+BALL_SIZE > H) {
    ball.y = H-BALL_SIZE; ball.vy *= -1;

    const isLightTheme = document.body.classList.contains('light-theme');
    const ballColor = isLightTheme ? "#333333" : "#f3e870";
    spawnParticles(ball.x+BALL_SIZE/2, H, ballColor);
  }

  if (
    ball.x < leftPaddle.x+PADDLE_WIDTH &&
    ball.x+BALL_SIZE > leftPaddle.x &&
    ball.y+BALL_SIZE > leftPaddle.y &&
    ball.y < leftPaddle.y+PADDLE_HEIGHT
  ) {
    ball.x = leftPaddle.x+PADDLE_WIDTH;
    ball.vx = Math.abs(ball.vx) + 0.4;
    let dy = (ball.y+BALL_SIZE/2) - (leftPaddle.y+PADDLE_HEIGHT/2);
    ball.vy = dy*0.18;
    spawnParticles(ball.x, ball.y+BALL_SIZE/2, "#57a6ff");
  }

  if (
    ball.x+BALL_SIZE > rightPaddle.x &&
    ball.x < rightPaddle.x+PADDLE_WIDTH &&
    ball.y+BALL_SIZE > rightPaddle.y &&
    ball.y < rightPaddle.y+PADDLE_HEIGHT
  ) {
    ball.x = rightPaddle.x-BALL_SIZE;
    ball.vx = -Math.abs(ball.vx) - 0.4;
    let dy = (ball.y+BALL_SIZE/2) - (rightPaddle.y+PADDLE_HEIGHT/2);
    ball.vy = dy*0.18;
    spawnParticles(ball.x+BALL_SIZE, ball.y+BALL_SIZE/2, "#fb678a");
  }

  if (ball.x < -BALL_SIZE) {
    scores.right++;
    scoreRightElem.textContent = scores.right;
    spawnParticles(W/2, H/2, "#fb678a");
    resetBall(-1);
  }
  if (ball.x > W+BALL_SIZE) {
    scores.left++;
    scoreLeftElem.textContent = scores.left;
    spawnParticles(W/2, H/2, "#57a6ff");
    resetBall(1);
  }

  if (scores.left >= WIN_SCORE) showWin('left');
  if (scores.right >= WIN_SCORE) showWin('right');
}
function resetBall(dir) {
  ball.x = W/2-BALL_SIZE/2;
  ball.y = H/2-BALL_SIZE/2;
  ball.vx = (dir||((Math.random()>0.5)?1:-1)) * (5 + Math.random()*2);
  ball.vy = (Math.random()-0.5)*6;
}
function showWin(winnerSide) {
  winMessage.classList.remove('hidden');
  let winTextKey;
  if (gameMode === 'ai') {
    winTextKey = (winnerSide === 'left') ? 'win-message-player' : 'win-message-cpu';
  } else { // 2player mode
    winTextKey = (winnerSide === 'left') ? 'win-message-left' : 'win-message-right';
  }
  if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && translations[currentLang] && translations[currentLang][winTextKey]) {
    winMessage.textContent = translations[currentLang][winTextKey];
  } else {
    winMessage.textContent = (winnerSide === 'left' ? 'Left Wins!' : 'Right Wins!');
  }
  game.running = false;
  game.paused = true;
}

let p1UpPressed = false, p1DownPressed = false;
let p2UpPressed = false, p2DownPressed = false;
function updatePlayers() {
  let speed = 7;
  if (p1UpPressed) leftPaddle.y -= speed;
  if (p1DownPressed) leftPaddle.y += speed;
  leftPaddle.y = Math.max(0, Math.min(H-PADDLE_HEIGHT, leftPaddle.y));

  if (gameMode === '2player') {
    if (p2UpPressed) rightPaddle.y -= speed;
    if (p2DownPressed) rightPaddle.y += speed;
    rightPaddle.y = Math.max(0, Math.min(H-PADDLE_HEIGHT, rightPaddle.y));
  }
}

canvas.addEventListener('mousemove', e => {
  // Mouse control only for P1 in AI mode, or if explicitly designed for mouse for P1 in 2P
  if (gameMode === 'ai' && !isMobile()) {
    let rect = canvas.getBoundingClientRect();
    let mouseY = (e.clientY - rect.top) * H / rect.height;
    leftPaddle.y = mouseY - PADDLE_HEIGHT/2;
    leftPaddle.y = Math.max(0, Math.min(H-PADDLE_HEIGHT, leftPaddle.y));
  }
});


window.addEventListener('keydown', e => {
  if (["ArrowUp", "ArrowDown", " "].includes(e.key)) {
    e.preventDefault();
  }
  if (e.key === "w" || e.key === "W") p1UpPressed = true;
  if (e.key === "s" || e.key === "S") p1DownPressed = true;
  if (e.key === "ArrowUp") p2UpPressed = true;
  if (e.key === "ArrowDown") p2DownPressed = true;
});
window.addEventListener('keyup', e => {
  if (["ArrowUp", "ArrowDown", " "].includes(e.key)) {
    e.preventDefault();
  }
  if (e.key === "w" || e.key === "W") p1UpPressed = false;
  if (e.key === "s" || e.key === "S") p1DownPressed = false;
  if (e.key === "ArrowUp") p2UpPressed = false;
  if (e.key === "ArrowDown") p2DownPressed = false;
});


canvas.addEventListener('touchstart', e => {
  if (e.touches.length > 0) {
    touchStartY = e.touches[0].clientY;
    paddleStartY = leftPaddle.y;
  }
}, {passive:false});
canvas.addEventListener('touchmove', e => {
  if (touchStartY !== null && e.touches.length > 0) {
    let rect = canvas.getBoundingClientRect();
    let delta = (e.touches[0].clientY - touchStartY) * H / rect.height;
    leftPaddle.y = Math.max(0, Math.min(H-PADDLE_HEIGHT, paddleStartY + delta));
  }
  e.preventDefault();
}, {passive:false});
canvas.addEventListener('touchend', () => {
  touchStartY = null;
  paddleStartY = null;
});


function updateAI() {
  if (gameMode !== 'ai') return; // Only run AI in AI mode
  let ai = AIDifficulty[aiLevel];
  let paddleCenter = rightPaddle.y + PADDLE_HEIGHT/2;
  let target = ball.y + BALL_SIZE/2 + (Math.random()-0.5)*ai.error;
  if (ball.vx > 0) {
    let diff = target - paddleCenter;
    rightPaddle.y += diff * ai.reaction;
    rightPaddle.y = Math.max(0, Math.min(H-PADDLE_HEIGHT, rightPaddle.y));
  }
}


function gameLoop() {
  if (!game.paused && game.running) {
    updatePlayers(); // Changed from updatePlayer to updatePlayers
    updateAI();
    updateBall();
    updateParticles();
  }
  render();
  requestAnimationFrame(gameLoop);
}
gameLoop();


pauseBtn.addEventListener('click', () => {
  if (!game.running && !game.paused) return; // Allow unpausing if game ended but was paused
  if (game.win && game.paused) { // If game has ended and is paused, restart instead of unpausing
    resetGame();
    return;
  }
  game.paused = !game.paused;
  if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && translations[currentLang]){
    pauseBtn.textContent = game.paused ? (translations[currentLang]['resume-btn'] || '继续') : (translations[currentLang]['pause-btn'] || '暂停');
  } else {
    pauseBtn.textContent = game.paused ? '继续' : '暂停'; // Fallback
  }
});
restartBtn.addEventListener('click', () => {
  resetGame();
  pauseBtn.textContent = '暂停';
});
difficultySel.addEventListener('change', () => {
  aiLevel = difficultySel.value;
});

if (modeToggleBtn) {
  modeToggleBtn.addEventListener('click', () => {
    gameMode = (gameMode === 'ai') ? '2player' : 'ai';
    resetGame(); // Reset game to apply new mode and update UI elements
  });
}

function scaleObj(obj, oldW, oldH, newW, newH) {
  if (!obj) return;
  if (typeof obj.x === "number") obj.x = (obj.x / oldW) * newW;
  if (typeof obj.y === "number") obj.y = (obj.y / oldH) * newH;
}
function scaleParticles(oldW, oldH, newW, newH) {
  if (!particles) return;
  for (let p of particles) {
    p.x = (p.x / oldW) * newW;
    p.y = (p.y / oldH) * newH;
  }
}

function resizeCanvas() {
  let container = document.getElementById('game-container');
  let oldW = W, oldH = H;
  let w = container.offsetWidth;
  let ratio = LOGIC_HEIGHT / LOGIC_WIDTH;
  let h = w * ratio;
  if (window.innerHeight < h) {
    h = window.innerHeight * 0.95;
    w = h / ratio;
  }
  canvas.width = w;
  canvas.height = h;
  W = w;
  H = h;


  if (leftPaddle && rightPaddle && ball) {
    scaleObj(leftPaddle, oldW, oldH, W, H);
    scaleObj(rightPaddle, oldW, oldH, W, H);
    scaleObj(ball, oldW, oldH, W, H);
    scaleParticles(oldW, oldH, W, H);
    leftPaddle.y = Math.max(0, Math.min(H-PADDLE_HEIGHT, leftPaddle.y));
    rightPaddle.y = Math.max(0, Math.min(H-PADDLE_HEIGHT, rightPaddle.y));
  }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
}