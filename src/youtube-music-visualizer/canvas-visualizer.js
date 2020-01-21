// ==UserScript==
// @name     Youtube Canvas Music Visualizer
// @version  1
// @grant    none
// ==/UserScript==

let analyser
let dataArray
let isDrawing = false
const videoEl = document.querySelector('.html5-main-video')
const backCanvas = document.createElement('canvas')
const backContext = backCanvas.getContext('2d')
const canvas = document.createElement('canvas')
const context = canvas.getContext('2d')
let currentMode = 'redBars'
const modeTransitions = {
  'redBars': 'frameDrip',
  'frameDrip': undefined,
  undefined: 'redBars'
}
const modes = {
  redBars,
  frameDrip
}

canvas.addEventListener('click', () => {
  currentMode = modeTransitions[currentMode]
})

function init() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  if(!videoEl) {
    return
  }

  const boundingRect = videoEl.getBoundingClientRect()
  const source = audioContext.createMediaElementSource(videoEl)
  analyser = audioContext.createAnalyser()

  analyser.fftSize = 2048
  const bufferLength = analyser.frequencyBinCount
  dataArray = new Uint8Array(bufferLength)
  
  source.connect(analyser)
  analyser.connect(audioContext.destination)

  canvas.style.position = 'absolute'
  canvas.width = boundingRect.width
  canvas.height = 20
  canvas.style.top = `${boundingRect.bottom}px`
  canvas.style.left = `${boundingRect.left}px`

  document.body.append(canvas)
  
  startDrawing()
}

function startDrawing() {
  isDrawing = true
  requestAnimationFrame(draw)
}

function draw() {
  if(!isDrawing) {
    return;
  }
  const boundingRect = videoEl.getBoundingClientRect()
  canvas.width = boundingRect.width
  canvas.height = 20
  canvas.style.top = `${boundingRect.bottom + window.scrollY}px`
  canvas.style.left = `${boundingRect.left}px`
  
  analyser.getByteFrequencyData(dataArray)
  context.clearRect(0, 0, canvas.width, canvas.height)

  const drawAction = modes[currentMode]
  if(drawAction) {
    drawAction(boundingRect)
  }
  
  requestAnimationFrame(draw)
}

function stopDrawing() {
  isDrawing = false
}

function redBars() {
  const widthRatio = canvas.width / dataArray.length
  const heightRatio = canvas.height / 256
  let x, y
  context.strokeStyle = 'red'
  context.lineWidth = 1;

  for(let i=0; i < dataArray.length; i++) {
    x = Math.floor(i * widthRatio)
    y = Math.floor(dataArray[i] * heightRatio)

    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, y)
    context.stroke()
  }
}

function frameDrip(boundingRect) {
  backCanvas.width = canvas.width
  backCanvas.height = canvas.height
  backContext.drawImage(
    videoEl,
    0, boundingRect.height - 1,
    boundingRect.width, 1,
    0, 0,
    boundingRect.width, 1
  )

  const widthRatio = canvas.width / dataArray.length
  const heightRatio = canvas.height / 256
  let x, y, pixel
  context.lineWidth = 1;

  for(let i=0; i < dataArray.length; i++) {
    
    x = Math.floor(i * widthRatio)
    y = Math.floor(dataArray[i] * heightRatio)
    pixel = backContext.getImageData(x, 0, 1, 1).data;
    context.strokeStyle = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;

    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, y)
    context.stroke()
  }
}

init()