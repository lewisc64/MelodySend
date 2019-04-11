let canvas = document.getElementById("pianoroll");
let context = canvas.getContext("2d");

let notes = [];
let timescale = [4, 4];
let bpm = 140;

let cellSize = 16;

canvas.height = cellSize * frequencies.length;
canvas.width = cellSize * 4 ** 3;

let mouseX;
let mouseY;
let dragging;
let draggingWidth = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let lastNoteWidth = cellSize * timescale[1];
let prevX;
let prevY;

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
  context.strokeRect(note.x, note.y, note.width, note.height);
}

function drawNotes() {
  for (let note of notes) {
    drawNote(note);
  }
}

function playNote(note) {
  let i = Math.floor(canvas.height / cellSize) - Math.floor(note.y / cellSize);
  let duration = timescale[1] / bpm / (timescale[0] * timescale[1]) * Math.floor(note.width / cellSize) * 60;
  playSine(frequencies[i], duration);
}

function play(x=0, played=0) {
  
  for (let note of notes) {
    if (note.x == x) {
      playNote(note);
      played++;
    }
  }
  
  x += cellSize
  
  if (played < notes.length) {
    setTimeout(function () {
      play(x, played);
    }, timescale[1] / bpm / (timescale[0] * timescale[1]) * 60 * 1000);
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

function handleMouseEvent(type, e) {
  mouseX = e.clientX - canvas.offsetLeft;
  mouseY = e.clientY - canvas.offsetTop;
  
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
        draggingWidth = Math.abs(note.x + note.width - mouseX) < cellSize / 2
      } else if (e.button == 2) {
        notes.splice(notes.indexOf(note), 1);
      }
      
    } else if (e.button == 0) {
      
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
  }
  
  if (dragging) {
    if (draggingWidth) {
      
      dragging.width = Math.max((Math.floor(mouseX / cellSize) + 1) * cellSize - dragging.x, cellSize);
      
    } else {
      dragging.x = Math.floor((mouseX + dragOffsetX) / cellSize) * cellSize;
      dragging.y = Math.floor((mouseY + dragOffsetY) / cellSize) * cellSize;
      if (dragging.x != prevX || dragging.y != prevY) {
        prevX = dragging.x;
        prevY = dragging.y;
        playNote(dragging);
      }
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
    
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    
    context.stroke();
    
  }
  
  for (let x = 0; x < canvas.width; x += cellSize) {
    
    context.beginPath();
    
    if (x % (timescale[0] * timescale[1] * cellSize) == 0) {
      context.strokeStyle = "#888888";
      context.lineWidth = 4;
    } else if (x % (timescale[1] * cellSize) == 0) {
      context.strokeStyle = "#888888";
      context.lineWidth = 2;
    } else {
      context.strokeStyle = "#AAAAAA";
      context.lineWidth = 1;
    }
    
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    
    context.stroke();
    
  }
  
}

function editloop() {
  
  drawGrid();
  drawNotes();
  
  requestAnimationFrame(editloop);
}

function getLink() {
  
  let out = [];
  
  for (let note of notes) {
    for (let key in note) {
      out.push(note[key]);
    }
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
  
  console.log(values);
  
  let note;
  for (let i = 0; i < values.length; i++) {
    if (!note || i % Object.keys(note).length == 0) {
      if (note) {
        notes.push(note);
      }
      note = createNote();
    }
    note[Object.keys(note)[i % Object.keys(note).length]] = parseInt(values[i]);
    console.log(Object.keys(note)[i % Object.keys(note).length], values[i]);
  }
  notes.push(note);
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
  
  document.getElementById("play").addEventListener("click", function () {
    play();
  });
  
  document.getElementById("reset").addEventListener("click", function () {
    loadFromParams();
  });
  
  document.getElementById("share").addEventListener("click", function () {
    alert(getLink());
  });
  
  editloop();
  
}

window.addEventListener("load", setup);