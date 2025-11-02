class BitCrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'bits', defaultValue: 8, minValue: 2, maxValue: 16, automationRate: 'k-rate' },
      { name: 'frequencyReduction', defaultValue: 8, minValue: 1, maxValue: 64, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.phase = 0;
    this.lastSample = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    // k-rate이므로 첫 값 사용
    const rawBits = parameters.bits[0];
    const bitDepth = Math.max(2, Math.min(16, Math.round(rawBits))); // 정수화
    const freqRed  = Math.max(1, Math.round(parameters.frequencyReduction[0]));

    // -1..1 범위에서 양자화 스텝 (체감이 확 나는 값)
    const step = 1 / Math.pow(2, bitDepth - 1);

    for (let ch = 0; ch < output.length; ch++) {
      const inCh  = input[ch] || input[0];
      const outCh = output[ch];
      for (let i = 0; i < outCh.length; i++) {
        this.phase++;
        if (this.phase >= freqRed) {
          this.phase = 0;
          this.lastSample = inCh ? inCh[i] : 0;
        }
        // 양자화
        outCh[i] = Math.round(this.lastSample / step) * step;
      }
    }
    return true;
  }
}
registerProcessor('bitcrusher-processor', BitCrusherProcessor);