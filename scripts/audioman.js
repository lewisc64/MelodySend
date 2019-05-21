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
  
  // fade in
  gainNode.gain.setValueAtTime(low, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(volume, audioContext.currentTime + fadepadding);
  
  // fade out
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime + duration - fadepadding);
  gainNode.gain.exponentialRampToValueAtTime(low, audioContext.currentTime + duration);
  
  gainNode.connect(audioContext.destination);
  
  source.connect(gainNode);
  source.start();
}

function addTremolo(func, frequency=4, fadeSamples=sampleRate) {
  return function (n) {
    const m = Math.sin(n * 2 * Math.PI * frequency / sampleRate)
    return func(n) * (((1 - m) * (1 - Math.min(n, fadeSamples) / fadeSamples)) + m);
  }
}

function mixWaves(func1, func2) {
  return function (n) {
    return func1(n) * func2(n);
  }
}

function addWaves(func1, func2) {
  return function (n) {
    return func1(n) + func2(n);
  }
}

function sineWave(frequency) {
  return function (n) {
    return Math.sin(n * 2 * Math.PI * frequency / sampleRate);
  }
}

function warbleSineWave(frequency, warbleFrequency=5, frequencyChangeRatio=0.001) {
  return function (n) {
    const f = (frequency + Math.sin(n * 2 * Math.PI * warbleFrequency / sampleRate) * (frequency * frequencyChangeRatio));
    return Math.sin(n * 2 * Math.PI * f / sampleRate);
  }
}

function sawWave(frequency) {
  return function (n) {
    return ((n % (sampleRate / frequency)) * (frequency / sampleRate) * 2 - 1);
  }
}

function squareWave(frequency) {
  return function (n) {
    return (n % (sampleRate / frequency)) * (frequency / sampleRate) * 2 - 1 > 0 ? 1 : -1;
  }
}
