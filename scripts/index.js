
function showHelp() {
  document.getElementById("openhelp").style.display = "none";
  document.getElementById("help").style.display = "inline-block";
}

function hideHelp() {
  document.getElementById("openhelp").style.display = "inline-block";
  document.getElementById("help").style.display = "none";
}

function setup() {
  
  hideHelp();
  
  document.getElementById("openhelp").addEventListener("click", showHelp);
  document.getElementById("closehelp").addEventListener("click", hideHelp);
  
}

window.addEventListener("load", setup)
