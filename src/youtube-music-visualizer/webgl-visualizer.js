// ==UserScript==
// @name     Youtube WebGL Music Visualizer
// @version  0.3
// @grant    none
// ==/UserScript==

const analysisCanvas = document.createElement('canvas')
const analysisContext = analysisCanvas.getContext('2d')
let analysisImageData
let currentMode = 'redBars'
const modeTransitions = {
  'redBars': 'redBars2',
  'redBars2': undefined,
  undefined: 'redBars'
}
const modes = {
  redBars,
  redBars2
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
  const GlslCanvas = unsafeWindow.GlslCanvas
  const sandbox = new GlslCanvas(canvas)
  setShaders(sandbox, currentMode)

  canvas.addEventListener('click', () => {
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
  analysisCanvas.width = dataArray.length
  analysisCanvas.height = 1
  analysisImageData = new Uint8ClampedArray(bufferLength * 4)
  
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
  analysisImageData = analysisContext.getImageData(0, 0, dataArray.length, 1)
  for(let i = 0; i < dataArray.length; i++) {
    analysisImageData.data[i*4 + 0] = dataArray[i]
    analysisImageData.data[i*4 + 1] = dataArray[i]
    analysisImageData.data[i*4 + 2] = dataArray[i]
    analysisImageData.data[i*4 + 3] = dataArray[i]
  }
  analysisContext.putImageData(analysisImageData, 0, 0)
  sandbox.loadTexture('u_analysis', analysisCanvas)

  requestAnimationFrame(() => draw(canvas, videoEl, sandbox, analyser))
}

function redBars() {
  const frag = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  uniform vec2 u_resolution;
  uniform sampler2D u_tex0;

  void main() {
    vec2 pos = gl_FragCoord.xy/u_resolution.xy;
    vec4 textureColor = texture2D(u_tex0, vec2(pos.x, 0.0));
    gl_FragColor = vec4(textureColor.r, 0.0, 0.0, 1.0);
  }
  `
  return {
    frag
  }
}

function redBars2() {
  const frag = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  uniform vec2 u_resolution;
  uniform sampler2D u_tex0;

  float lessThan(float a, float b) {
    return floor((sign(b - a) + 1.0) / 2.0);
  }

  void main() {
    vec2 pos = gl_FragCoord.xy/u_resolution.xy;
    vec4 textureColor = texture2D(u_tex0, vec2(pos.x, 0.0));
    float val = textureColor.r;
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0) * sign(val) * lessThan(1.0 - pos.y, val);
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