// ==UserScript==
// @name     Youtube WebGL Music Visualizer
// @version  0.3
// @grant    none
// ==/UserScript==

let currentMode = 'redBars'
const modeTransitions = {
  'redBars': undefined,
  undefined: 'redBars'
}
const modes = {
  redBars
}

let dataArray
let isDrawing = false

function init(videoEl) {
  const canvas = document.createElement('canvas')

  if(!videoEl) return;

  const analyser = setupAnalyser(videoEl)

  canvas.style.position = 'absolute'
  canvas.id = 'webgl-visualizer'
  setCanvasSize(canvas, videoEl)
  document.body.append(canvas)
  debugger
  const GlslCanvas = unsafeWindow.GlslCanvas
  const sandbox = new GlslCanvas(canvas)
  setShaders(sandbox, currentMode)

  canvas.addEventListener(() => {
    currentMode = modeTransitions[currentMode]
    setShaders(sandbox, currentMode)
  })
  
  startDrawing(canvas, videoEl, sandbox, analyser)
}

function setupAnalyser(videoEl) {
  let analyser
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const source = audioContext.createMediaElementSource(videoEl)
  analyser = audioContext.createAnalyser()

  analyser.fftSize = 2048
  const bufferLength = analyser.frequencyBinCount
  dataArray = new Uint8Array(bufferLength)
  
  source.connect(analyser)
  analyser.connect(audioContext.destination)

  return analyser
}

function setCanvasSize(canvas, videoEl) {
  const boundingRect = videoEl.getBoundingClientRect()

  canvas.width = boundingRect.width
  canvas.height = 20
  canvas.style.top = `${boundingRect.bottom + window.scrollY}px`
  canvas.style.left = `${boundingRect.left + window.scrollX}px`
}

function setShaders(sandbox, currentMode) {
  const shaderFn = modes[currentMode]
  if(!shaderFn) return;

  const {frag, vert} = shaderFn()
  sandbox.load(frag, vert)
}

function startDrawing(canvas, videoEl, sandbox, analyser) {
  isDrawing = true
  requestAnimationFrame(() => draw(canvas, videoEl, sandbox, analyser))
}

function draw(canvas, videoEl, sandbox, analyser) {
  if(!isDrawing) return;
  setCanvasSize(canvas, videoEl)

  analyser.getByteFrequencyData(dataArray)
  sandbox.setUniform('u_analysis', dataArray)

  requestAnimationFrame(() => draw(canvas, videoEl, sandbox, analyser))
}

function redBars() {
  const frag = `
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
  `
  return {
    frag
  }
}

function loadError(errorEvent) {
  console.log(`Problem loading script: ${errorEvent.target.src}`)
}

function loadScript(url, onloadFunction) {
  const newScript = document.createElement("script")
  newScript.onerror = loadError
  if (onloadFunction) { newScript.onload = onloadFunction; }
  document.head.appendChild(newScript)
  newScript.src = url
}

function waitFor(selector) {
  return new Promise((resolve, reject) => {
    // select thing, if it's not there, try again later.
    function tryAgain(ms)  {
      const el = document.querySelector(selector)
      if(!el) {
        setTimeout(() => {
          tryAgain(ms)
        }, ms)
      } else {
        resolve(el)
      }
    }

    const el = document.querySelector(selector)
    if(!el) {
      setTimeout(() => {
        tryAgain(100)
      }, 100)
    } else {
      resolve(el)
    }
  })
}

loadScript(
  "https://rawgit.com/patriciogonzalezvivo/glslCanvas/master/dist/GlslCanvas.js",
  (event) => {
    console.log(`Script loaded: ${event.target.src}`)
    waitFor('.html5-main-video').then((videoEl) => {
      console.log('Found video element')
      init(videoEl)
    })
  }
)