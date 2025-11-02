const startBtn = document.getElementById('start');
const bitsEl = document.getElementById('bits');
const freqEl = document.getElementById('freq');
const bitsVal = document.getElementById('bitsVal');
const freqVal = document.getElementById('freqVal');

let ctx, workletNode, osc;

async function init() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  await ctx.audioWorklet.addModule('./bitcrusher-processor.js');

  workletNode = new AudioWorkletNode(ctx, 'bitcrusher-processor', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [2],
  });

  // 오실레이터(소리 발생기)
  osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 500;

  const master = ctx.createGain();
  master.gain.value = 0.2;

  // 초기 파라미터 연결
  workletNode.parameters.get('bits').value = +bitsEl.value;
  workletNode.parameters.get('frequencyReduction').value = +freqEl.value;

  osc.connect(workletNode).connect(master).connect(ctx.destination);
  osc.start();

  // 슬라이더로 값 조정
  const updateBits = () => {
    bitsVal.textContent = bitsEl.value;
    workletNode.parameters.get('bits').value = +bitsEl.value;
  };
  const updateFreq = () => {
    freqVal.textContent = freqEl.value;
    workletNode.parameters.get('frequencyReduction').value = +freqEl.value;
  };

  bitsEl.addEventListener('input', updateBits);
  freqEl.addEventListener('input', updateFreq);
  updateBits();
  updateFreq();
}

startBtn.addEventListener('click', async () => {
  if (!ctx) await init();
  if (ctx.state !== 'running') await ctx.resume();
});