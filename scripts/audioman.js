let audioContext = new (window.AudioContext || window.webkitAudioContext)();
const sampleRate = audioContext.sampleRate;
const channels = 1;

function playWaveform(func, duration, volume=0.2, fadepadding=0.025) {
  
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
  
  const low = 0.00001;
  
  let gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(low, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(volume, audioContext.currentTime + fadepadding);
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime + duration - fadepadding);
  gainNode.gain.exponentialRampToValueAtTime(low, audioContext.currentTime + duration);
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

function playSquare(frequency, duration) {
  playWaveform(function (n) {
    return (n % (sampleRate / frequency)) * (frequency / sampleRate) * 2 - 1 > 0 ? 1 : -1;
  }, duration); 
}
