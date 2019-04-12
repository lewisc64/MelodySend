let canvas = document.getElementById("pianoroll");
let context = canvas.getContext("2d");

let notes = [];
let timescale = [4, 4];
let bpm = 140;
let playing = false;

let playLine = null;
let playLineFrom = null;
let playLineTo = null;
let playStart = null;
let playEnd = null;

let cellSize = 14;

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
  context.fillStyle = "#00DDDD";
  context.strokeStyle = "#008888";
  context.fillRect(note.x, note.y, note.width, note.height);
  context.fillStyle = context.strokeStyle;
  context.fillRect(note.x + note.width - cellSize / 2, note.y, cellSize / 2, note.height);
  context.strokeRect(note.x + 0.5, note.y + 0.5, note.width, note.height);
}

function drawNotes() {
  for (let note of notes) {
    drawNote(note);
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
  playSine(frequencies[i], duration);
}

function drawPlayLine() {
  let x = playLineFrom + (playLineTo - playLineFrom) * ((new Date().getTime() - playStart.getTime()) / (playEnd.getTime() - playStart.getTime()));
  if (x < 0 || x > playLineTo) {
    destroyPlayLine()
    return;
  }
  context.beginPath();
  context.strokeStyle = "#FF0000";
  context.lineWidth = 1;
  context.moveTo(x + 0.5, 0);
  context.lineTo(x + 0.5, canvas.height);
  context.stroke();
}

function setupPlayLine(start=0) {
  playLineFrom = start;
  playLine = playLineFrom;
  playStart = new Date();
  let lastNote = getLastNote();
  playLineTo = lastNote.x + lastNote.width;
  playEnd = new Date(Date.now() + pixelsToDuration(playLineTo) * 1000);
}

function destroyPlayLine() {
  playLine = null;
}

function stop() {
  playing = false;
  document.getElementById("play").textContent = "Play";
  destroyPlayLine();
  return;
}

function play(x=0, end=null) {
  
  if (notes.length == 0) {
    stop();
    return;
  }
  
  if (!playing) {
    if (x == 0) {
      document.getElementById("play").textContent = "Stop";
      playing = true;
      setupPlayLine();
      let lastNote = getLastNote();
      end = lastNote.x + lastNote.width;
    } else {
      return;
    }
  }
  
  for (let note of notes) {
    if (note.x == x) {
      playNote(note);
    }
  }
  
  x += cellSize;
  
  if (x <= end) {
    setTimeout(function () {
      play(x, end);
    }, cellsToDuration(1) * 1000);
  } else {
    stop();
  }
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
  
  mouseX = e.pageX - canvas.offsetLeft;
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
    }
  } else if (type == "down") {
    if (e.key == "Shift") {
      shift = true;
    }
  }
}

function drawGrid() {
  
  context.fillStyle = "#EEEEEE";
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  for (let y = 0; y < canvas.height; y += cellSize) {
    
    context.beginPath();
    
    context.strokeStyle = "#DDDDDD";
    context.lineWidth = 1;
    
    context.moveTo(0, y + 0.5);
    context.lineTo(canvas.width, y + 0.5);
    
    context.stroke();
    
  }
  
  for (let x = 0; x < canvas.width; x += cellSize) {
    
    context.beginPath();
    
    context.lineWidth = 1;
    if (x % (timescale[0] * timescale[1] * cellSize) == 0) {
      context.strokeStyle = "#777777";
    } else if (x % (timescale[1] * cellSize) == 0) {
      context.strokeStyle = "#AAAAAA";
    } else {
      context.strokeStyle = "#CCCCCC";
    }
    
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, canvas.height);
    
    context.stroke();
    
  }
  
}

function editloop() {
  
  drawGrid();
  drawNotes();
  
  if (playLine !== null) {
    drawPlayLine();
  }
  
  requestAnimationFrame(editloop);
}

function getLink() {
  
  let out = [];
  
  for (let note of notes) {
    out.push(note.x / cellSize);
    out.push(note.y / cellSize);
    out.push(note.width / cellSize);
  }
  
  return window.location.href.split("?")[0] + "?notes=" + encodeURI(out.join(","));
}

function loadFromParams() {
  
  notes = [];
  
  const urlParams = new URLSearchParams(window.location.search);
  const param = urlParams.get("notes");
  if (param == null) {
    return;
  }
  
  const values = param.split(",");
  for (let i = 0; i <= values.length - 3; i += 3) {
    
    notes.push(createNote(parseInt(values[i]) * cellSize, parseInt(values[i + 1]) * cellSize, parseInt(values[i + 2]) * cellSize, cellSize));
    
  }
}

function setup() {
  
  loadFromParams();
  
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

window.addEventListener("load", setup);