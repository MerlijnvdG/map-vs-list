// Time-based measurement — loopt exact ~durationMs per call
// Geeft ms per operatie terug. Veel stabieler dan vaste iteraties.
function benchTime(fn, durationMs = 120) {
  fn(); fn(); fn(); fn(); fn() // warmup
  let count = 0
  const t0 = performance.now()
  while (performance.now() - t0 < durationMs) { fn(); count++ }
  return (performance.now() - t0) / count
}

// ── Single-round benchmarks ────────────────────────────────────────────────

export function benchLookup() {
  const N = 100_000, target = N - 1
  const map = new Map(), list = []
  for (let i = 0; i < N; i++) { map.set(i, `v${i}`); list.push(`v${i}`) }
  let sink
  return {
    map:  benchTime(() => { sink = map.get(target) }),
    list: benchTime(() => { for (let i = 0; i < list.length; i++) if (list[i] === `v${target}`) { sink = list[i]; break } }),
  }
}

export function benchInsert() {
  const N = 100_000
  return {
    map:  benchTime(() => { const m = new Map(); for (let i = 0; i < N; i++) m.set(i, `v${i}`) }, 200),
    list: benchTime(() => { const l = []; for (let i = 0; i < N; i++) l.push(`v${i}`) }, 200),
  }
}

export function benchIteration() {
  const N = 100_000
  const map = new Map(), list = []
  for (let i = 0; i < N; i++) { map.set(i, i); list.push(i) }
  let s = 0
  return {
    map:  benchTime(() => { let x = 0; for (const v of map.values()) x += v; s = x }, 200),
    list: benchTime(() => { let x = 0; for (let i = 0; i < list.length; i++) x += list[i]; s = x }, 200),
  }
}

// ── Big O growth benchmark — gelijkmatig verdeelde groottes ───────────────
// Gelijkmatig verdeeld zodat O(n) als rechte lijn verschijnt

export function benchGrowth() {
  // 7 gelijkmatig verdeelde punten → O(n) verschijnt als rechte lijn
  const sizes = [0, 20_000, 40_000, 60_000, 80_000, 100_000]
  return sizes.map(size => {
    const map = new Map(), list = []
    for (let i = 0; i < size; i++) { map.set(i, i); list.push(i) }
    const target = size - 1
    let sink
    const mapMs  = benchTime(() => { sink = map.get(target) })
    const listMs = benchTime(() => { for (let i = 0; i < list.length; i++) if (list[i] === target) { sink = list[i]; break } })
    void sink
    return { size, mapMs, listMs }
  })
}
