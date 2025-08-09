/*
 * Snake Einzelspieler‑Spiel
 *
 * Dieses Skript implementiert einen klassischen Snake‑Klon für den Browser.
 * Es nutzt moderne JavaScript‑Features (ES6) und ist vollständig clientseitig,
 * sodass kein zusätzlicher Server oder Build‑Schritt erforderlich ist.
 *
 * Die Logik ist wie folgt aufgebaut:
 *   - Konstanten definieren das Spielfeld und die Geschwindigkeit.
 *   - Beim Klick auf "Starten" wird das Spiel initialisiert und gestartet.
 *   - Die Schlange wird in jedem Tick aktualisiert (Move, Essen finden,
 *     Kollisionen erkennen). Das Rendering erfolgt per Canvas.
 *   - Tastendrücke ändern die Bewegungsrichtung.
 *   - Der Score wird rechts oben angezeigt.
 */

// Konfigurationskonstanten
const BOARD_WIDTH = 40; // Anzahl der Spalten auf dem Spielfeld
const BOARD_HEIGHT = 30; // Anzahl der Zeilen auf dem Spielfeld
const TICK_INTERVAL = 100; // Ticks in Millisekunden (je niedriger, desto schneller)

// DOM-Elemente abrufen
const startScreen = document.getElementById('start-screen');
const nameInput = document.getElementById('name-input');
const startBtn = document.getElementById('start-btn');
const gameContainer = document.getElementById('game-container');
const canvas = document.getElementById('game-canvas');
const scoreboard = document.getElementById('scoreboard');
const ctx = canvas.getContext('2d');

// Spielstatusvariablen
let playerName = '';
let snake = [];
let direction = [1, 0];
let pendingDirection = null;
let food = null;
let running = false;
let score = 0;
let intervalId = null;
let audioCtx;

/**
 * Hilfsfunktion: Erstellt eine zufällige Position auf dem Spielfeld,
 * die aktuell nicht von der Schlange besetzt ist.
 * @returns {[number, number]} Ein Koordinatenpaar [x, y]
 */
function randomEmptyPosition() {
  while (true) {
    const x = Math.floor(Math.random() * BOARD_WIDTH);
    const y = Math.floor(Math.random() * BOARD_HEIGHT);
    // Prüfe, ob sich ein Segment der Schlange dort befindet
    let occupied = false;
    for (const seg of snake) {
      if (seg[0] === x && seg[1] === y) {
        occupied = true;
        break;
      }
    }
    if (!occupied) {
      return [x, y];
    }
  }
}

/**
 * Initialisiert das Spiel:
 * - legt die Schlange an
 * - setzt die Richtung zurück
 * - platziert ein erstes Futter
 * - startet die Update-Schleife
 */
function startGame() {
  playerName = nameInput.value.trim() || 'Spieler';
  // Schlange beginnt in der Mitte mit drei Segmenten
  const startX = Math.floor(BOARD_WIDTH / 2);
  const startY = Math.floor(BOARD_HEIGHT / 2);
  snake = [
    [startX, startY],
    [startX - 1, startY],
    [startX - 2, startY],
  ];
  direction = [1, 0];
  pendingDirection = null;
  food = randomEmptyPosition();
  score = snake.length;
  updateScoreboard();
  running = true;
  // Starte den Ticker
  intervalId = setInterval(tick, TICK_INTERVAL);
  requestAnimationFrame(draw);
}

/**
 * Behandelt Tastendrücke, um die Richtung der Schlange zu ändern.
 * Umdrehen um 180° (z. B. von links direkt nach rechts) wird unterbunden.
 * @param {KeyboardEvent} e
 */
function handleKeyDown(e) {
  const key = e.key.toLowerCase();
  const map = {
    arrowup: [0, -1],
    w: [0, -1],
    arrowdown: [0, 1],
    s: [0, 1],
    arrowleft: [-1, 0],
    a: [-1, 0],
    arrowright: [1, 0],
    d: [1, 0],
  };
  if (map[key]) {
    const newDir = map[key];
    // verhindere direktes Umkehren
    if (newDir[0] !== -direction[0] || newDir[1] !== -direction[1]) {
      pendingDirection = newDir;
    }
  }
}

/**
 * Eine Spieliteration (Tick):
 * - Bewegungen ausführen
 * - Essen sammeln und wachsen
 * - Kollisionen mit sich selbst erkennen
 */
function tick() {
  if (!running) return;
  // Setze neue Richtung, falls vorhanden
  if (pendingDirection) {
    direction = pendingDirection;
    pendingDirection = null;
  }
  // Berechne neue Kopfposition (mit Wraparound)
  const head = snake[0];
  const newX = (head[0] + direction[0] + BOARD_WIDTH) % BOARD_WIDTH;
  const newY = (head[1] + direction[1] + BOARD_HEIGHT) % BOARD_HEIGHT;
  const newHead = [newX, newY];
  // Prüfe Selbstkollision
  for (let i = 0; i < snake.length; i++) {
    const seg = snake[i];
    if (seg[0] === newX && seg[1] === newY) {
      endGame();
      return;
    }
  }
  // Füge neuen Kopf hinzu
  snake.unshift(newHead);
  // Prüfe, ob Futter gesammelt wurde
  if (food && newX === food[0] && newY === food[1]) {
    // Punkte erhöhen
    score++;
    playBeep();
    // neues Futter platzieren
    food = randomEmptyPosition();
  } else {
    // Entferne letztes Segment, wenn kein Futter
    snake.pop();
  }
  updateScoreboard();
}

/**
 * Zeichnet den aktuellen Spielstand. Wird per requestAnimationFrame aufgerufen.
 */
function draw() {
  // Canvas leeren
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Berechne Zellgrösse
  const cellW = canvas.width / BOARD_WIDTH;
  const cellH = canvas.height / BOARD_HEIGHT;
  // Zeichne Futter
  if (food) {
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(
      food[0] * cellW + cellW * 0.15,
      food[1] * cellH + cellH * 0.15,
      cellW * 0.7,
      cellH * 0.7,
    );
  }
  // Zeichne Schlange (hellere Segmente am Ende)
  for (let i = 0; i < snake.length; i++) {
    const [x, y] = snake[i];
    // Farbverlauf von dunkelgrün nach hellgrün
    const lightness = 30 + (i / snake.length) * 40;
    ctx.fillStyle = `hsl(120, 60%, ${lightness}%)`;
    ctx.fillRect(x * cellW + 1, y * cellH + 1, cellW - 2, cellH - 2);
  }
  // Bei laufendem Spiel erneut zeichnen
  if (running) {
    requestAnimationFrame(draw);
  }
}

/**
 * Aktualisiert die Anzeige des Scoreboards.
 */
function updateScoreboard() {
  scoreboard.innerHTML = `
    <h2>Punkte</h2>
    <div class="row"><span class="color" style="background-color: #4caf50"></span><span>${playerName}</span><span>${score}</span></div>
  `;
}

/**
 * Beendet das Spiel und zeigt eine Meldung an. Der Spieler kann danach
 * durch Drücken der Start‑Taste neu starten.
 */
function endGame() {
  running = false;
  clearInterval(intervalId);
  alert(`Game over, ${playerName}! Deine Punktzahl: ${score}`);
  // Zeige Startbildschirm erneut an
  gameContainer.classList.add('hidden');
  startScreen.classList.remove('hidden');
}

/**
 * Erzeugt einen kurzen Piepton. Wird beim Essen ausgelöst.
 */
function playBeep() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'square';
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch (err) {
    // Ton kann ignoriert werden, wenn AudioContext nicht verfügbar
  }
}

// Eventlistener für Startknopf und Tastatur
startBtn.addEventListener('click', () => {
  // Wechsel von Startbildschirm zu Spiel
  startScreen.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  startGame();
});

window.addEventListener('keydown', handleKeyDown);