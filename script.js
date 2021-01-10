const THEME_COLOR_DARK = '#F25C54';
const THEME_COLOR_LIGHT = '#F7B267';
const TWO_PI = Math.PI * 2;

const canvas = document.getElementById('canvas');
const canvasCtx = canvas.getContext('2d');

let canvasGrd;
let canvasCenterX, canvasCenterY;

function resetCanvas() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;

  canvasCenterX = canvas.width / 2;
  canvasCenterY = canvas.height / 2;

  canvasGrd = canvasCtx.createLinearGradient(0, 0, canvas.width, canvas.height);
  canvasGrd.addColorStop(0, '#9C27B0');
  canvasGrd.addColorStop(0.25, '#03A9F4');
  canvasGrd.addColorStop(0.5, '#8BC34A');
  canvasGrd.addColorStop(0.75, '#FFEB3B');
  canvasGrd.addColorStop(1, '#f44336');
}

resetCanvas();
window.addEventListener('resize', resetCanvas);

const audio = new Audio();
const audioCtx = new AudioContext();
const source = audioCtx.createMediaElementSource(audio);
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;

const BUFFER_LENGTH = analyser.frequencyBinCount;

source.connect(analyser);
analyser.connect(audioCtx.destination);

let freqArr = new Uint8Array(BUFFER_LENGTH);
let timeDomainArr = new Uint8Array(BUFFER_LENGTH);

analyser.getByteFrequencyData(freqArr);
analyser.getByteTimeDomainData(timeDomainArr);

const MAX_FREQ = 255;
const MAX_TIME_DOMAIN = 128;
const TIME_DOMAIN_ZERO = 128;

let freqAvg, freqFactor;
let timeDomainAvg, timeDomainFactor;

audio.src = 'audio.mp3';
audio.addEventListener('play', () => {
  audioCtx.resume();
});

let bubbles = [];
let bubbleSmoothFactor = 20;
let networkAlpha = 0.1;

const woofer = {
  posX: canvasCenterX,
  posY: canvasCenterY,
  minRadius: 25,
  radius: 25,
  fill: THEME_COLOR_LIGHT,
  stroke: THEME_COLOR_DARK,
  minStrokeWidth: 2,
  strokeWidth: 2,
  smoothFactor: 3,
};

function updateData() {
  analyser.getByteFrequencyData(freqArr);
  analyser.getByteTimeDomainData(timeDomainArr);

  freqAvg = 0;
  for (let i = 0; i < freqArr.length; i++) freqAvg += freqArr[i];
  freqAvg /= freqArr.length;
  freqFactor = freqAvg / MAX_FREQ;

  timeDomainAvg = 0;
  for (let i = 0; i < timeDomainArr.length; i++)
    timeDomainAvg += Math.abs(timeDomainArr[i] - TIME_DOMAIN_ZERO);
  timeDomainAvg /= timeDomainArr.length;
  timeDomainFactor = timeDomainAvg / MAX_TIME_DOMAIN;
}

const transFuncs = [
  val => Math.sin(val),
  val => Math.cos(val),
  val => Math.tan(val),
  val => 1 / Math.sin(val),
  val => 1 / Math.cos(val),
  val => 1 / Math.tan(val),
];

let transFunc1 = transFuncs[0];
let transFunc2 = transFuncs[1];

setInterval(() => {
  transFunc1 = transFuncs[Math.floor(Math.random() * transFuncs.length)];
  do {
    transFunc2 = transFuncs[Math.floor(Math.random() * transFuncs.length)];
  } while (transFunc1 == transFunc2);
}, 5000);

function updateFrame() {
  const beatScaler = beatScale =>
    freqFactor * (1 - beatScale) + timeDomainFactor * beatScale;

  bubbles.forEach(bubble => {
    bubble.dist += beatScaler(0.8) * 14 + 1;
    bubble.dir -= 0.0025;

    const targetPosX = canvasCenterX + bubble.dist * transFunc1(bubble.dir);
    bubble.posX += (targetPosX - bubble.posX) / bubbleSmoothFactor;

    const targetPosY = canvasCenterY + bubble.dist * transFunc2(bubble.dir);
    bubble.posY += (targetPosY - bubble.posY) / bubbleSmoothFactor;
  });

  bubbles = bubbles.filter(
    bubble =>
      bubble.posX > 0 &&
      bubble.posX < canvas.width &&
      bubble.posY > 0 &&
      bubble.posY < canvas.height
  );

  for (let i = 0; i < beatScaler(0.5) * 4 + 1; i++) {
    let dist = woofer.radius * 1.5;
    let dir = TWO_PI * Math.random();
    let posX = canvasCenterX + dist * transFunc1(dir);
    let posY = canvasCenterY + dist * transFunc2(dir);

    bubbles.push({
      dist,
      dir,
      posX,
      posY,
      radius: beatScaler(0.8) * 12 + 3,
      fill: canvasGrd,
      alpha: beatScaler(0.8) * 0.8 + 0.2,
    });
  }

  woofer.posX = canvasCenterX;
  woofer.posY = canvasCenterY;

  const targetRadius = woofer.minRadius * (beatScaler(0.8) * 2 + 1);
  woofer.radius += (targetRadius - woofer.radius) / woofer.smoothFactor;

  const targetStrokeWidth = woofer.minStrokeWidth * (beatScaler(0.8) * 14 + 1);
  woofer.strokeWidth +=
    (targetStrokeWidth - woofer.strokeWidth) / woofer.smoothFactor;
}

function drawFrame() {
  canvasCtx.save();
  canvasCtx.fillStyle = '#0009';
  canvasCtx.beginPath();
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
  canvasCtx.restore();

  canvasCtx.save();
  canvasCtx.strokeStyle = canvasGrd;
  canvasCtx.globalAlpha = networkAlpha;
  canvasCtx.beginPath();
  canvasCtx.moveTo(bubbles[0].x, bubbles[0].y);

  for (let i = 1; i < bubbles.length - 1; i++) {
    canvasCtx.bezierCurveTo(
      bubbles[i - 1].posX,
      bubbles[i - 1].posY,
      bubbles[i + 1].posX,
      bubbles[i + 1].posY,
      bubbles[i].posX,
      bubbles[i].posY
    );
  }

  canvasCtx.stroke();
  canvasCtx.restore();

  bubbles.forEach(bubble => {
    canvasCtx.save();
    canvasCtx.fillStyle = bubble.fill;
    canvasCtx.globalAlpha = bubble.alpha;
    canvasCtx.beginPath();
    canvasCtx.arc(bubble.posX, bubble.posY, bubble.radius, 0, TWO_PI);
    canvasCtx.fill();
    canvasCtx.restore();

    canvasCtx.save();
    canvasCtx.fillStyle = THEME_COLOR_DARK;
    canvasCtx.globalAlpha = bubble.alpha / 2;
    canvasCtx.beginPath();
    canvasCtx.arc(bubble.posX, bubble.posY, bubble.radius, 0, TWO_PI);
    canvasCtx.fill();
    canvasCtx.restore();
  });

  canvasCtx.save();
  canvasCtx.strokeStyle = woofer.stroke;
  canvasCtx.fillStyle = woofer.fill;
  canvasCtx.lineWidth = woofer.strokeWidth;
  canvasCtx.beginPath();
  canvasCtx.arc(woofer.posX, woofer.posY, woofer.radius, 0, TWO_PI);
  canvasCtx.fill();
  canvasCtx.stroke();
  canvasCtx.restore();
}

function animateFrame() {
  updateData();
  updateFrame();
  drawFrame();

  requestAnimationFrame(animateFrame);
}

animateFrame();

const audioSelInp = document.createElement('input');
audioSelInp.type = 'file';
audioSelInp.accept = 'audio/*';
audioSelInp.addEventListener('change', () => {
  const [file] = audioSelInp.files;

  if (!file || !file.type.startsWith('audio/')) return 0;

  audio.src = URL.createObjectURL(file);
  audio.load();
  audio.play();
});

const audioSelBtn = document.getElementById('audio-sel-btn');
audioSelBtn.addEventListener('click', () => {
  audioSelInp.click();
  audioSelBtn.blur();
});

document.addEventListener('keydown', e => {
  if (e.key === ' ') {
    audio[audio.paused ? 'play' : 'pause']();
  } else if (e.key === 'ArrowRight') {
    audio.currentTime += 10;
  } else if (e.key === 'ArrowLeft') {
    audio.currentTime -= 10;
  } else if (e.key === 'ArrowUp') {
    let newVol = audio.volume + 0.1;
    audio.volume = newVol > 1 ? 1 : newVol;
  } else if (e.key === 'ArrowDown') {
    let newVol = audio.volume - 0.1;
    audio.volume = newVol < 0 ? 0 : newVol;
  }
});
