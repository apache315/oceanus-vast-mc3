// Project palette (design-rules.md): colour = group, shape = actor type, reversed magma = quantity.
import * as d3 from 'd3'

export const GROUP_COLORS = {
  'Operazione Nemo Reef': '#D55E00',
  'Controllo e istituzioni': '#009E73',
  Alias: '#CC79A7',
  Investigatori: '#0072B2',
  Altri: '#cfcfcf',
}
export const GROUPS = Object.keys(GROUP_COLORS)

export const ACCENT = '#51127c' // dark end of magma: single-colour quantity bars
export const MUTED = '#d9d9d9' // context, never a quantity
export const DIM = 0.15 // opacity of non-selected marks

export const groupColor = (name) => GROUP_COLORS[name] ?? GROUP_COLORS.Altri
// the group colour for small text: darker, so every group reaches a contrast of at least 4.5:1 on white
export const groupText = (name) => d3.color(groupColor(name)).darker(0.8).formatHex()

const SYMBOLS = {
  Person: d3.symbolCircle,
  Vessel: d3.symbolTriangle,
  Organization: d3.symbolSquare,
  Location: d3.symbolDiamond,
  Group: d3.symbolCross,
}
export const typeSymbol = (type) => SYMBOLS[type] ?? d3.symbolCircle

// light = few, dark = many
export const seq = (t) => d3.interpolateMagma(1 - 0.92 * Math.max(0, Math.min(1, t)))
