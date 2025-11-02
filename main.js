const startBtn = document.getElementById('start');
const stopBtn  = document.getElementById('stop');
const bitsEl   = document.getElementById('bits');
const freqEl   = document.getElementById('freq');
const bitsVal  = document.getElementById('bitsVal');
const freqVal  = document.getElementById('freqVal');

let ctx, workletNode, osc, master;

async function ensureCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    await ctx.audioWorklet.addModule('./bitcrusher-processor.js');

    workletNode = new AudioWorkletNode(ctx, 'bitcrusher-processor', {
      numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2]
    });

    master = ctx.createGain();
    master.gain.value = 0.2;
    workletNode.connect(master).connect(ctx.destination);
  }
}

function createSource() {
  // 매번 새 오실레이터를 만들어 연결
  osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 500;
  osc.connect(workletNode);
  osc.start();
}

function updateBits() {
  const v = Math.round(+bitsEl.value);       // 정수화
  bitsVal.textContent = v;
  workletNode.parameters.get('bits').value = v;
}
function updateFreq() {
  const v = Math.round(+freqEl.value);
  freqVal.textContent = v;
  workletNode.parameters.get('frequencyReduction').value = v;
}

startBtn.addEventListener('click', async () => {
  await ensureCtx();
  if (ctx.state !== 'running') await ctx.resume();
  if (!osc) createSource();                  // 이미 재생 중이면 새로 만들지 않음
  updateBits(); updateFreq();
});

stopBtn.addEventListener('click', async () => {
  if (!ctx) return;
  if (osc) { try { osc.stop(); } catch(_){}; try { osc.disconnect(); } catch(_){}; osc = null; }
  // 완전 정지 원하면 아래 주석 해제 (다시 Start 시 자동 재생되게 하려면 keep)
//   await ctx.suspend();
});

// UI 핸들러
bitsEl.addEventListener('input', updateBits);
freqEl.addEventListener('input', updateFreq);

// 초기 라벨 표시
bitsVal.textContent = bitsEl.value;
freqVal.textContent = freqEl.value;