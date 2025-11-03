// main.js
const FADE_TIME = 0.001;

let ctx, osc, master;

/*async function ensureCtx() {
    if (!ctx) {
         ctx = new (window.AudioContext || window.webkitAudioContext)();
         await ctx.audioWorklet.addModule('./bitcrusher-processor.js');

         bitCrusherNode = new AudioWorkletNode(ctx, 'bitcrusher-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [2]
    });

    master = ctx.createGain();
    master.gain.value = 0.2;
    workletNode.connect(master).connect(ctx.destination);
  }
}*/


// --- UI Elements ---
const startContextButton = document.getElementById('button-start-context');

// Tone controls
const waveTypeSelect = document.getElementById('wave-type');
const startToneButton = document.getElementById('button-start-tone');

// Mic controls
const startMicButton = document.getElementById('button-start-mic');

// File controls
const audioFileInput = document.getElementById('input-audio-file');
const startFileButton = document.getElementById('button-start-file');

// Effect controls
const bitDepthSlider = document.getElementById('bit-depth');
const bitDepthDisplay = document.getElementById('bit-depth-display');
const frequencyReductionSlider =
    document.getElementById('frequency-reduction');
const frequencyReductionDisplay =
    document.getElementById('frequency-reduction-display');

// --- Global Audio Nodes & State ---
let bitCrusherNode;
let oscillatorNode = null;
let micStreamSource = null;
let fileBufferSource = null;
let micStream = null; // To keep track of the stream for stopping tracks

/**
 * Stop all other audio sources to ensure only one plays at a time.
 */
function stopAllSources() {
  // Stop Tone
  if (oscillatorNode) {
    oscillatorNode.stop(context.currentTime + FADE_TIME);
    oscillatorNode.disconnect();
    oscillatorNode = null;
    startToneButton.textContent = 'Start Tone';
  }

  // Stop Mic
  if (micStreamSource) {
    micStreamSource.disconnect();
    // Stop the media stream tracks
    micStream.getTracks().forEach(track => track.stop());
    micStreamSource = null;
    micStream = null;
    startMicButton.textContent = 'Start Mic';
  }

  // Stop File
  if (fileBufferSource) {
    fileBufferSource.stop(context.currentTime + FADE_TIME);
    fileBufferSource.disconnect();
    fileBufferSource = null;
    startFileButton.textContent = 'Play File';
  }
}

/**
 * Main setup function.
 * Called once the "Start Audio" button is clicked.
 */
function updateBits() {
      const v = Math.round(+bitDepthSlider.value);
      bitDepthSlider.textContent = v;
      if (bitCrusherNode) {
        bitCrusherNode.parameters.get('bits').value = v;
      }
  }
  function updateFreq() {
  const v = Math.round(+freqEl.value);
  freqVal.textContent = v;
  if (workletNode) {
    workletNode.parameters.get('frequencyReduction').value = v;
  }
}
async function setupAudio() {
  // Resume context if suspended
  if (context.state === 'suspended') {
    await context.resume();
  }

  // Load the bitcrusher processor
  await context.audioWorklet.addModule('bitcrusher-processor.js');
  
  // Create the node
  bitCrusherNode = new AudioWorkletNode(context, 'bitcrusher-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2]
    });

    master = context.createGain();
    master.gain.value = 0.2;
    bitCrusherNode.connect(master).connect(context.destination);
  });
  
  // Connect the effect node to the destination (output)
  // bitCrusherNode.connect(context.destination);

  // --- Setup Effect Sliders ---
  const bitDepthParam = bitCrusherNode.parameters.get('bits');
  const frequencyReductionParam =
      bitCrusherNode.parameters.get('frequencyReduction');


  bitDepthSlider.oninput = (event) => {
    const value = parseFloat(event.target.value);
    bitDepthParam.setTargetAtTime(value, context.currentTime, FADE_TIME);
    bitDepthDisplay.textContent = value;
  };
  frequencyReductionSlider.oninput = (event) => {
    const value = parseFloat(event.target.value);
    frequencyReductionParam.setTargetAtTime(
        value, context.currentTime, FADE_TIME);
    frequencyReductionDisplay.textContent = value;
  };
  
  bitDepthSlider.addEventListener('input', updateBits);
  frequencyReductionSlider.addEventListener('input', updateFreq);

  // --- Setup Audio Source Buttons ---

  // 1. Tone Generator
  startToneButton.onclick = () => {
    if (oscillatorNode) {
      // It's playing, so stop it
      stopAllSources();
    } else {
      // It's stopped, so start it
      stopAllSources(); // Stop others first
      oscillatorNode = new OscillatorNode(context, {
        type: waveTypeSelect.value,
        frequency: 220,
      });
      oscillatorNode.connect(bitCrusherNode);
      oscillatorNode.start(context.currentTime);
      startToneButton.textContent = 'Stop Tone';
    }
  };
  // Update oscillator type if changed while playing
  waveTypeSelect.onchange = () => {
    if (oscillatorNode) {
      oscillatorNode.type = waveTypeSelect.value;
    }
  };

  // 2. Microphone
  startMicButton.onclick = async () => {
    if (micStreamSource) {
      // It's playing, so stop it
      stopAllSources();
    } else {
      // It's stopped, so start it
      try {
        stopAllSources(); // Stop others first
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        micStreamSource = context.createMediaStreamSource(micStream);
        micStreamSource.connect(bitCrusherNode);
        startMicButton.textContent = 'Stop Mic';
      } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('Could not access microphone. ' + err.message);
      }
    }
  };

  // 3. Audio File
  startFileButton.onclick = () => {
    if (fileBufferSource) {
      // It's playing, so stop it
      stopAllSources();
    } else {
      // It's stopped, so start it
      const file = audioFileInput.files[0];
      if (!file) {
        alert('Please select an audio file first.');
        return;
      }
      stopAllSources(); // Stop others first

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const audioBuffer = await context.decodeAudioData(e.target.result);
          fileBufferSource = context.createBufferSource();
          fileBufferSource.buffer = audioBuffer;
          fileBufferSource.loop = true; // Loop the file as requested
          fileBufferSource.connect(bitCrusherNode);
          fileBufferSource.start(context.currentTime);

          // Handle when it stops (e.g., if loop is false)
          fileBufferSource.onended = () => {
            if (fileBufferSource) { // Check if it wasn't stopped manually
              stopAllSources();
            }
          };

          startFileButton.textContent = 'Stop File';
        } catch (err) {
          console.error('Error decoding audio file:', err);
          alert('Could not decode audio file. ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Enable all buttons
  startToneButton.disabled = false;
  startMicButton.disabled = false;
  startFileButton.disabled = false;
  startContextButton.disabled = true;
  startContextButton.textContent = 'Audio Started';
}

// Main event listener to start the audio context
startContextButton.onclick = setupAudio;
