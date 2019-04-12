let audioContext = new (window.AudioContext || window.webkitAudioContext)();
const sampleRate = audioContext.sampleRate;
const channels = 2;

function playWaveform(func, duration) {
  
  let samples = duration * sampleRate;
  
  let buffer = audioContext.createBuffer(channels, samples, sampleRate);
  
  for (let channel = 0; channel < channels; channel++) {
    let nowBuffering = buffer.getChannelData(channel);
    for (let i = 0; i < samples; i++) {
      nowBuffering[i] = func(i);
    }
  }
  
  let source = audioContext.createBufferSource();
  
  source.buffer = buffer;
  
  let gainNode = audioContext.createGain();
  gainNode.gain.value = 0.2;
  gainNode.connect(audioContext.destination);
  
  source.connect(gainNode);
  source.start();
}

function playSine(frequency, duration) {
  playWaveform(function (n) {
    return Math.sin(n * 2 * Math.PI * frequency / sampleRate);
  }, duration); 
}

function playSaw(frequency, duration) {
  playWaveform(function (n) {
    return ((n % (sampleRate / frequency)) * (frequency / sampleRate) * 2 - 1);
  }, duration); 
}
