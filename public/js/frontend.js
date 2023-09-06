const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
const socket = io()
const scoreEl = document.querySelector('#scoreEl')
const devicePixelRatio = window.devicePixelRatio || 1

canvas.width = 1024
canvas.height = 576
const x = canvas.width / 2
const y = canvas.height / 2 

// c.scale(devicePixelRatio, devicePixelRatio)

const frontEndPlayers = {}
const frontEndProjectiles = {}

socket.on('updateProjectiles', (backEndProjectiles) => {
  for (const id in backEndProjectiles) {
    const backEndProjectile = backEndProjectiles[id]

    if (!frontEndProjectiles[id]) {
      frontEndProjectiles[id] = new Projectile({
        x: backEndProjectile.x,
        y: backEndProjectile.y,
        radius: 5,
        color: frontEndPlayers[backEndProjectile.playerId]?.color,
        velocity: backEndProjectile.velocity
      })
      
    } else {
      frontEndProjectiles[id].x += backEndProjectiles[id].velocity.x
      frontEndProjectiles[id].y += backEndProjectiles[id].velocity.y
    }
  }

  for (const id in frontEndProjectiles) {
    if (!backEndProjectiles[id]) {
      delete frontEndProjectiles[id]
    }
  }
})

socket.on('updatePlayers', (backEndPlayers) => {
  for (const id in backEndPlayers) {
    const backEndPlayer = backEndPlayers[id]

    if (!frontEndPlayers[id]) {
      frontEndPlayers[id] = new Player({
        x: backEndPlayer.x,
        y: backEndPlayer.y,
        radius: 10,
        color: backEndPlayer.color,
        username: backEndPlayer.username
      })

      document.querySelector('#playerLabels').innerHTML += `<div data-id="${id}" data-score="${backEndPlayer.score}">${backEndPlayer.username}: ${backEndPlayer.score}</div>`
    } else {
      // sort leaderboard
      document.querySelector(`div[data-id="${id}"]`).innerHTML = `${backEndPlayer.username}: ${backEndPlayer.score}`
      document.querySelector(`div[data-id="${id}"]`).setAttribute('data-score', backEndPlayer.score)

      const parentDiv = document.querySelector('#playerLabels')
      const childDivs = Array.from(parentDiv.querySelectorAll('div'))

      childDivs.sort((a, b) => {
        const scoreA = Number(a.getAttribute('data-score'))
        const scoreB = Number(b.getAttribute('data-score'))
        return scoreB - scoreA
      })
      childDivs.forEach(div => {
        div.remove()
      })
      childDivs.forEach(div => {
        parentDiv.append(div)
      })

      frontEndPlayers[id].target = {
        x: backEndPlayer.x,
        y: backEndPlayer.y
      }

      if (id === socket.id) {
        const lastBackEndInputIndex = playerInputs.findIndex(input => {
          return backEndPlayer.sequenceNumber === input.sequenceNumber
        })

        if (lastBackEndInputIndex > -1) playerInputs.splice(0, lastBackEndInputIndex + 1)

        playerInputs.forEach(input => {
          frontEndPlayers[id].target.x += input.dx
          frontEndPlayers[id].target.y += input.dy
        })
      }
    }
  }

  // delete frontEnd players
  for (const id in frontEndPlayers) {
    if (!backEndPlayers[id]) {
      //remove player score label
      document.querySelector(`div[data-id="${id}"]`).remove()
      if (id === socket.id) {
        document.querySelector('form').style.display = 'block';
      }
      delete frontEndPlayers[id]
    }
  }
})

let animationId
let score = 0
function animate() {
  animationId = requestAnimationFrame(animate)
  c.clearRect(0, 0, canvas.width, canvas.height)

  for (const id in frontEndPlayers) {
    const frontEndPlayer = frontEndPlayers[id]

    //linear interpolation
    if (frontEndPlayer.target) {
      frontEndPlayers[id].x += (frontEndPlayers[id].target.x - frontEndPlayers[id].x) * 0.5
      frontEndPlayers[id].y += (frontEndPlayers[id].target.y - frontEndPlayers[id].y) * 0.5
    }
    frontEndPlayer.draw()
  }

  for (const id in frontEndProjectiles) {
    const frontEndProjectile = frontEndProjectiles[id]
    frontEndProjectile.draw()
  }
}
animate()

const keys = {
  w: {pressed: false},
  a: {pressed: false},
  s: {pressed: false},
  d: {pressed: false},
}
const SPEED = 5
const playerInputs = []
let sequenceNumber = 0
setInterval(() => {
  if (keys.w.pressed) {
    sequenceNumber++
    playerInputs.push({sequenceNumber: sequenceNumber, dx: 0, dy: -SPEED})
    frontEndPlayers[socket.id].y -= SPEED
    socket.emit('keydown', {keycode: 'KeyW', sequenceNumber})
  }

  if (keys.a.pressed) {
    sequenceNumber++
    playerInputs.push({sequenceNumber: sequenceNumber, dx: -SPEED, dy: 0})
    frontEndPlayers[socket.id].x -= SPEED
    socket.emit('keydown', {keycode: 'KeyA', sequenceNumber})
  }

  if (keys.s.pressed) {
    sequenceNumber++
    playerInputs.push({sequenceNumber: sequenceNumber, dx: 0, dy: SPEED})
    frontEndPlayers[socket.id].y += SPEED
    socket.emit('keydown', {keycode: 'KeyS', sequenceNumber})
  }

  if (keys.d.pressed) {
    sequenceNumber++
    playerInputs.push({sequenceNumber: sequenceNumber, dx: SPEED, dy: 0})
    frontEndPlayers[socket.id].x += SPEED
    socket.emit('keydown', {keycode: 'KeyD', sequenceNumber})
  }
  
}, 15)
window.addEventListener('keydown', (e) => {
  if (!frontEndPlayers[socket.id]) return
  switch (e.code) {
    case 'KeyW':
      keys.w.pressed = true
      break
    case 'KeyA':
      keys.a.pressed = true
      break
    case 'KeyS':
      keys.s.pressed = true
      break
    case 'KeyD':
      keys.d.pressed = true
      break
  }
})
window.addEventListener('keyup', (e) => {
  if (!frontEndPlayers[socket.id]) return
  switch (e.code) {
    case 'KeyW':
      keys.w.pressed = false
      break
    case 'KeyA':
      keys.a.pressed = false
      break
    case 'KeyS':
      keys.s.pressed = false
      break
    case 'KeyD':
      keys.d.pressed = false
      break
  }
})

document.querySelector('form').addEventListener('submit', (e) => {
  e.preventDefault()
  document.querySelector('form').style.display = 'none'
  socket.emit('initGame', {
    username: e.target.querySelector('input').value,
    width: canvas.width,
    height: canvas.height,
    devicePixelRatio
})
})