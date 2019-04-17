let canvas = document.getElementById("pianoroll");
let context = canvas.getContext("2d", { alpha: false });

const cellSize = 14;
const timescale = [4, 4];

let notes = [];
let bpm = 140;
let loop = false;

let playing = false;
let playLine = null;
let playLineFrom = null;
let playLineTo = null;
let playStart = null;
let playEnd = null;

canvas.height = cellSize * frequencies.length;
canvas.width = cellSize * 4 ** 3;

let mouseX;
let mouseY;
let dragging;
let draggingWidth = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let shift = false;
let lastNoteWidth = cellSize * timescale[1];
let prevX;
let prevY;
let prevWidth;

let draggingCanvas = false;
let grabPointX;
let grabPointY;
let prevScrollX;

let scrollX = 0;

let colors = {};

function loadColorsFromCSS() {
  let computedStyle = getComputedStyle(document.documentElement);
  colors = {
    "note-color": computedStyle.getPropertyValue("--note-color"),
    "note-color-dark": computedStyle.getPropertyValue("--note-color-dark"),
    "playline-color": computedStyle.getPropertyValue("--playline-color"),
    "pianoroll-background-color": computedStyle.getPropertyValue("--pianoroll-background-color"),
    "line-color-cell": computedStyle.getPropertyValue("--line-color-cell"),
    "line-color-beat": computedStyle.getPropertyValue("--line-color-beat"),
    "line-color-bar": computedStyle.getPropertyValue("--line-color-bar"),
  }
}

function createNote(x=0, y=0, width=0, height=0) {
  let note = {
    x: x,
    y: y,
    width: width,
    height: height,
  }
  return note
}

function drawNote(note) {
  context.lineWidth = 1;
  context.fillStyle = colors["note-color"];
  context.strokeStyle = colors["note-color-dark"];
  context.fillRect(note.x - scrollX, note.y, note.width, note.height);
  context.fillStyle = context.strokeStyle;
  context.fillRect(note.x - scrollX + note.width - cellSize / 2, note.y, cellSize / 2, note.height);
  context.strokeRect(note.x - scrollX + 0.5, note.y + 0.5, note.width, note.height);
}

function drawNotes() {
  for (let note of notes) {
    if (note.x + note.width >= scrollX && note.x <= scrollX + canvas.width) {
      drawNote(note);
    }
  }
}

function cellsToDuration(cells) {
  return timescale[1] / bpm / (timescale[0] * timescale[1]) * 60 * cells;
}

function pixelsToDuration(pixels) {
  return cellsToDuration(pixels / cellSize);
}

function playNote(note, duration) {
  let i = Math.floor(canvas.height / cellSize) - Math.floor(note.y / cellSize) - 1;
  if (!duration) {
    duration = pixelsToDuration(note.width);
  }
  const f = frequencies[i];
  playWaveform(sineWave(f), duration);
}

function getPlayLineX() {
  return playLineFrom + (playLineTo - playLineFrom) * ((Date.now() - playStart) / (playEnd - playStart));
}

function drawPlayLine() {
  let x = getPlayLineX();
  if (x < 0 || x > playLineTo) {
    destroyPlayLine()
    return;
  }
  context.beginPath();
  context.strokeStyle = colors["playline-color"];
  context.lineWidth = 1;
  context.moveTo(x - scrollX + 0.5, 0);
  context.lineTo(x - scrollX + 0.5, canvas.height);
  context.stroke();
}

function setupPlayLine(start=0, end=undefined) {
  playLineFrom = start;
  if (end == undefined) {
    let lastNote = getLastNote();
    playLineTo = lastNote.x + lastNote.width;
  } else {
    playLineTo = end;
  }
  playLine = playLineFrom;
  playStart = Date.now();
  playEnd = Date.now() + pixelsToDuration(playLineTo) * 1000;
}

function destroyPlayLine() {
  playLine = null;
}

function stop() {
  playing = false;
  document.getElementById("play").textContent = "Play";
  enableInputs();
  destroyPlayLine();
  return;
}

function getEndBar() {
  const barSize = cellSize * timescale[0] * timescale[1];
  const end = getEnd();
  return (Math.floor(end / (barSize)) + Math.min(end % barSize, 1)) * barSize;
}

function getEnd() {
  let lastNote = getLastNote();
  return lastNote.x + lastNote.width;
}

function play(x=0, end=null) {
  
  const stamp = Date.now();
  
  if (notes.length == 0) {
    stop();
    return;
  }
  
  if (!playing) {
    if (x == 0) {
      document.getElementById("play").textContent = "Stop";
      disableInputs();
      playing = true;
      if (loop) {
        end = getEndBar();
      } else {
        end = getEnd();
      }
      setupPlayLine(0, end);
    } else {
      return;
    }
  }
  
  for (let note of notes) {
    if (note.x == x) {
      playNote(note);
    }
  }
  
  let next = getNextNote(x);
  let wait;
  if (next == null) {
    wait = cellSize;
    x += cellSize;
  } else {
    wait = next.x - x;
    x = next.x;
  }
  if (x > end) {
    stop();
    if (loop) {
      play();
    }
    return;
  }

  setTimeout(function () {
    play(x, end);
  }, pixelsToDuration(wait) * 1000 - (Date.now() - stamp));
}

function togglePlay() {
  if (playing) {
    stop();
  } else {
    play();
  }
}

function getNotesAtPoint(x, y) {
  let out = []
  for (let note of notes) {
    if (x >= note.x && x <= note.x + note.width) {
      if (y >= note.y && y <= note.y + note.height) {
        out.push(note);
      }
    }
  }
  return out;
}

function getNextNote(x) {
  let closestX = null;
  let out;
  for (let note of notes) {
    if (note.x > x && (closestX == null || note.x < closestX)) {
      out = note;
      closestX = note.x;
    }
  }
  return out;
}

function getLastNote() {
  out = null;
  dist = 0;
  for (let note of notes) {
    if (note.x + note.width > dist) {
      dist = note.x + note.width;
      out = note
    }
  }
  return out;
}

function handleMouseEvent(type, e) {
  
  mouseX = e.pageX - canvas.offsetLeft + scrollX;
  mouseY = e.pageY - canvas.offsetTop;
  
  if (type == "down" && !dragging) {
    
    prevX = -1;
    prevY = -1;
    
    let hoveredNotes = getNotesAtPoint(mouseX, mouseY);
    
    if (hoveredNotes.length > 0) {
      
      let note = hoveredNotes[0];
      if (e.button == 0) {
        dragging = note;
        dragOffsetX = Math.floor((note.x - mouseX) / cellSize) * cellSize + cellSize;
        dragOffsetY = Math.floor((note.y - mouseY) / cellSize) * cellSize + cellSize;
        draggingWidth = Math.abs(note.x + note.width - mouseX) < cellSize / 2;
        prevWidth = note.width;
        
        if (draggingWidth) {
          canvas.style.cursor = "ew-resize";
        } else {
          canvas.style.cursor = "move";
        }
        
      } else if (e.button == 2) {
        notes.splice(notes.indexOf(note), 1);
      }
      
    } else if (e.button == 0) {
      
      canvas.style.cursor = "move";
      
      let note = createNote(mouseX, mouseY, lastNoteWidth, cellSize);
      notes.push(note);
      dragging = note;
      draggingWidth = false;
      dragOffsetX = note.x - mouseX;
      dragOffsetY = note.y - mouseY;
      
    }
    
  } else if (type == "up" && dragging) {
    lastNoteWidth = dragging.width;
    dragging = null;
    canvas.style.cursor = "auto";
  }
  
  if (e.button == 1) {
    if (type == "down" && !draggingCanvas) {
      
      canvas.style.cursor = "grabbing";
      e.preventDefault();
      
      draggingCanvas = true;
      grabPointX = mouseX - scrollX;
      grabPointY = mouseY;
      prevScrollX = scrollX;
    } else if (type == "up" && draggingCanvas) {
      
      canvas.style.cursor = "auto";
      
      draggingCanvas = false;
    }
  }
  
  if (draggingCanvas) {
    scrollX = Math.max(prevScrollX - (mouseX - scrollX - (grabPointX)), 0);
  }
  
  if (dragging) {
    if (draggingWidth) {
      
      dragging.width = Math.max((Math.floor(mouseX / cellSize) + 1) * cellSize - dragging.x, cellSize);
      if (shift && dragging.width != prevWidth) {
        let diff = dragging.width - prevWidth;
        for (let note of notes) {
          if (note.x >= dragging.x + prevWidth) {
            note.x += diff;
          }
        }
      }
      prevWidth = dragging.width;
      
    } else {
      dragging.x = Math.floor((mouseX + dragOffsetX) / cellSize) * cellSize;
      dragging.y = Math.floor((mouseY + dragOffsetY) / cellSize) * cellSize;
      if (dragging.x < 0) {
        dragging.x = 0;
      }
      if (dragging.y < 0) {
        dragging.y = 0;
      } else if (dragging.y + dragging.height > canvas.height) {
        dragging.y = canvas.height - dragging.height;
      }
      if (dragging.x != prevX || dragging.y != prevY) {
        prevX = dragging.x;
        prevY = dragging.y;
        playNote(dragging, 0.25);
      }
    }
  }
  
}

function handleKeyEvent(type, e) {
  if (type == "up") {
    if (e.key == "Shift") {
      shift = false;
    } else if (e.key == " ") {
      togglePlay();
    }
  } else if (type == "down") {
    if (e.key == "Shift") {
      shift = true;
    }
  }
}

function drawGrid() {
  
  context.fillStyle = colors["pianoroll-background-color"];
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  context.beginPath();
  
  for (let y = 0; y < canvas.height; y += cellSize) {
    
    context.strokeStyle = colors["line-color-cell"];
    context.lineWidth = 1;
    
    context.moveTo(0, y + 0.5);
    context.lineTo(canvas.width, y + 0.5);
    
  }
  
  context.stroke();
  
  const lines = [
    [colors["line-color-cell"], cellSize],
    [colors["line-color-beat"], cellSize * timescale[1]],
    [colors["line-color-bar"], cellSize * timescale[1] * timescale[0]],
  ];
  
  for (let line of lines) {
    
    context.beginPath();
    context.strokeStyle = line[0];
    
    for (let x = -scrollX; x < canvas.width; x += line[1]) {
      if (x >= 0) {
        context.moveTo(x + 0.5, 0);
        context.lineTo(x + 0.5, canvas.height);
      }
    }
    
    context.stroke();
  }
  
}

function editloop() {
  
  drawGrid();
  drawNotes();
  
  if (playLine !== null) {
    
    const playLineX = getPlayLineX();
    
    if (playLineX < scrollX) {
      scrollX = parseInt(playLineX);
    } else if (playLineX > scrollX + canvas.width) {
      scrollX = parseInt(playLineX);
    }
    
    drawPlayLine();
  }
  
  requestAnimationFrame(editloop);
}

function disableInputs() {
  document.getElementById("bpm").disabled = true;
  document.getElementById("loop").disabled = true;
}

function enableInputs() {
  document.getElementById("bpm").disabled = false;
  document.getElementById("loop").disabled = false;
}

function getLink() {
  
  let out = [];
  
  for (let note of notes) {
    out.push(note.x / cellSize);
    out.push(note.y / cellSize);
    out.push(note.width / cellSize);
  }
  
  return window.location.href.split("?")[0] + "?notes=" + encodeURI(out.join(",") + "&loop=" + loop + "&bpm=" + bpm);
}

function loadFromParams() {
  
  notes = [];
  scrollX = 0;
  
  const urlParams = new URLSearchParams(window.location.search);
  
  const loopparam = urlParams.get("loop");
  if (loopparam != undefined) {
    loop = loopparam === "true";
  }
  document.getElementById("loop").checked = loop;
  
  const bpmparam = urlParams.get("bpm");
  if (bpmparam != undefined) {
    bpm = parseInt(bpmparam);
  }
  document.getElementById("bpm").value = bpm;
  
  const notesparam = urlParams.get("notes");
  if (notesparam == null) {
    return;
  }
  
  const values = notesparam.split(",");
  for (let i = 0; i <= values.length - 3; i += 3) {
    
    notes.push(createNote(parseInt(values[i]) * cellSize, parseInt(values[i + 1]) * cellSize, parseInt(values[i + 2]) * cellSize, cellSize));
    
  }
}

function setupPianoroll() {
  
  loadFromParams();
  loadColorsFromCSS();
  
  canvas.addEventListener("mousemove", function (e) {
    handleMouseEvent("move", e);
  });
  canvas.addEventListener("mousedown", function (e) {
    handleMouseEvent("down", e);
  });
  canvas.addEventListener("mouseup", function (e) {
    handleMouseEvent("up", e);
  });
  canvas.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
  window.addEventListener("keydown", function (e) {
    handleKeyEvent("down", e);
  });
  window.addEventListener("keyup", function (e) {
    handleKeyEvent("up", e);
  });
  
  document.getElementById("play").addEventListener("click", function () {
    togglePlay();
  });
  
  document.getElementById("bpm").addEventListener("change", function (e) {
    bpm = parseInt(e.target.value);
  });
  
  document.getElementById("loop").addEventListener("change", function (e) {
    loop = e.target.checked;
  });
  
  document.getElementById("reset").addEventListener("click", function () {
    loadFromParams();
  });
  
  document.getElementById("share").addEventListener("click", function () {
    const url = getLink();
    navigator.clipboard.writeText(url);
    alert("Copied URL to clipboard.");
  });
  
  editloop();
  
}

window.addEventListener("load", setupPianoroll);