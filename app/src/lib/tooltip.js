// One floating tooltip for all charts. Lines are set with textContent (message texts are data, not HTML).
let tip = null

function node() {
  if (!tip || !tip.isConnected) {
    tip = document.createElement('div')
    tip.className = 'tooltip'
    tip.style.display = 'none'
    document.body.appendChild(tip)
  }
  return tip
}

export const clip = (s, n = 160) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s)

// lines: array of strings; the first one is shown in bold
export function showTip(event, lines) {
  const t = node()
  t.replaceChildren(
    ...lines.filter(Boolean).map((line, i) => {
      const div = document.createElement('div')
      div.textContent = line
      if (i === 0) div.style.fontWeight = '600'
      return div
    }),
  )
  t.style.display = 'block'
  const x = Math.min(event.clientX + 12, window.innerWidth - 330)
  t.style.left = `${x}px`
  t.style.top = `${event.clientY + 12}px`
}

export function hideTip() {
  if (tip) tip.style.display = 'none'
}
