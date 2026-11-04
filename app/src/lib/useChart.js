// Mounts a reusable D3 chart in a container ref and redraws it when the container is resized
// or when any reactive value read by `update` changes (the shared selection, the data).
import { onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import * as d3 from 'd3'

export function useChart(chart, update) {
  const el = ref(null)
  const size = ref({ width: 0, height: 0 })
  let observer = null

  onMounted(() => {
    observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width !== size.value.width || height !== size.value.height) size.value = { width, height }
    })
    observer.observe(el.value)
  })
  onBeforeUnmount(() => observer?.disconnect())

  watchEffect(() => {
    const { width, height } = size.value
    if (!el.value || width < 50 || height < 50) return
    const datum = update(chart.width(width).height(height))
    d3.select(el.value).datum(datum).call(chart)
  })

  return el
}
