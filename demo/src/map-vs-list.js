import { LitElement, html, css } from 'lit'
import { benchLookup, benchInsert, benchIteration, benchGrowth } from './benchmark.js'

// ── Slide manifest ────────────────────────────────────────────────────────

const SLIDES = [
  'intro',
  'uitleg-collection', 'uitleg-list', 'uitleg-map', 'uitleg-when', 'uitleg-impl',
  'demo-0-ask', 'demo-0-reveal',
  'demo-1-ask', 'demo-1-reveal',
  'demo-2-ask', 'demo-2-reveal',
  'bigo',
  'bronnen',
]

const SECTIONS = [
  { id: 'intro',   label: 'Introductie', from: 0,  to: 0  },
  { id: 'uitleg',  label: 'Uitleg',      from: 1,  to: 5  },
  { id: 'demo',    label: 'Demo',        from: 6,  to: 11 },
  { id: 'bigo',    label: 'Big O',       from: 12, to: 12 },
  { id: 'bronnen', label: 'Bronnen',     from: 13, to: 13 },
]

const ASK_SLIDES = new Set([6, 8, 10])

const QUIZ_ROUNDS = [
  {
    hint: 'Lookup op sleutel',
    scenario: 'Je hebt 100.000 gebruikers. Bij het inloggen wil je iemands profiel direct ophalen op gebruikers-ID.',
    bench: benchLookup,
    winner: 'Map',
    explanation: 'Map weet direct waar een waarde staat op basis van de sleutel, dus hij hoeft niet te zoeken. List gaat van voor naar achter totdat hij iets vindt, bij het laatste element is dat natuurlijk worst case.',
    bigO: { Map: 'O(1)', List: 'O(n)' },
  },
  {
    hint: 'Elementen toevoegen',
    scenario: 'Een webshop krijgt nieuwe bestellingen die je in volgorde wil bewaren en snel wil kunnen toevoegen.',
    bench: benchInsert,
    winner: 'List',
    explanation: 'List plakt gewoon achteraan en is daarmee het snelst. Map doet eigenlijk hetzelfde maar moet ook nog een hash berekenen voor elke sleutel, en dat telt flink op als je er een miljoen doet.',
    bigO: { Map: 'O(1)', List: 'O(1)' },
  },
  {
    hint: 'Alle elementen doorlopen',
    scenario: 'Je wil de totaalomzet berekenen door alle bedragen in een collectie op te tellen.',
    bench: benchIteration,
    winner: 'List',
    explanation: 'Een List staat netjes op een rij in het geheugen, dus de CPU kan het snel doorlopen. Een Map heeft elk element verspreid liggen met een extra verwijzing ertussen, en dat maakt itereren een stuk trager.',
    bigO: { Map: 'O(n)', List: 'O(n)' },
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtMs(ms) {
  const us = ms * 1000
  if (us < 0.5) return '<1 µs'
  if (us < 100) return `${us.toFixed(1)} µs`
  return `${Math.round(us)} µs`
}

function fmtSize(n) {
  return n >= 1000 ? `${n / 1000}K` : `${n}`
}

function fmtX(x) {
  return x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(0) : x.toFixed(1)
}

function sectionOf(slideIndex) {
  return SECTIONS.find(s => slideIndex >= s.from && slideIndex <= s.to)
}

// ── Big O SVG chart ───────────────────────────────────────────────────────

function fmtMsAxis(ms) {
  if (ms === 0) return '0 µs'
  const us = ms * 1000
  if (us < 10)  return `${us.toFixed(1)} µs`
  return `${Math.round(us)} µs`
}

function bigoChart(data) {
  const n   = data.length
  const SVG_W = 440, SVG_H = 220
  const mr  = 52   // right room for O(n)/O(1) labels inside viewBox
  const mt  = 18   // top room for dot value labels
  const pw  = SVG_W - mr
  const ph  = SVG_H - mt

  const maxMs = Math.max(...data.map(d => d.listMs)) * 1.12
  const xp    = i  => (i / (n - 1)) * pw
  const yp    = ms => mt + ph - Math.max(0, (ms / maxMs)) * ph

  const mapAvg = data.reduce((s, d) => s + d.mapMs, 0) / n
  const mapY   = yp(mapAvg)
  const listPts = data.map((d, i) => `${xp(i).toFixed(1)},${yp(d.listMs).toFixed(1)}`).join(' ')
  const area    = listPts
  const areaClose = ` ${xp(n-1).toFixed(1)},${(mt+ph).toFixed(1)} 0,${(mt+ph).toFixed(1)}`

  // Nice round Y ticks
  const rawStep   = maxMs / 4
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const niceStep  = [0.1,0.2,0.25,0.5,1,2,2.5,5,10].map(m=>m*magnitude).find(s=>s>=rawStep) || rawStep
  const yTicks    = Array.from({length: Math.ceil(maxMs/niceStep)+1}, (_,i) => i*niceStep).filter(v => v <= maxMs*1.01)

  // Y label top position as % of SVG_H (so HTML label aligns with SVG gridline)
  const yLabelPct = ms => ((yp(ms) / SVG_H) * 100).toFixed(2)

  return html`
    <div class="chart-outer">
      <div class="chart-ytitle">Tijd (µs)</div>
      <div class="chart-main">

        <!-- SVG row: ylabels and chart share the same flex height -->
        <div class="chart-svg-row">
          <div class="chart-ylabels">
            ${yTicks.map(ms => html`
              <span class="chart-ylabel" style="top:${yLabelPct(ms)}%">${fmtMsAxis(ms)}</span>
            `)}
          </div>
          <svg class="chart-svg" viewBox="0 0 ${SVG_W} ${SVG_H}"
               font-family="system-ui,sans-serif">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stop-color="#f87171" stop-opacity="0.15"/>
                <stop offset="100%" stop-color="#f87171" stop-opacity="0.01"/>
              </linearGradient>
            </defs>
            ${yTicks.map(ms => html`
              <line x1="0" y1="${yp(ms).toFixed(1)}" x2="${pw}" y2="${yp(ms).toFixed(1)}"
                    stroke="#1e1e1e" stroke-width="1" stroke-dasharray="4 3"/>
            `)}
            <line x1="0" y1="${mt}" x2="0" y2="${mt+ph}" stroke="#2e2e2e" stroke-width="1.5"/>
            <line x1="0" y1="${mt+ph}" x2="${pw}" y2="${mt+ph}" stroke="#2e2e2e" stroke-width="1.5"/>
            <polygon points="${area+areaClose}" fill="url(#lg)"/>
            <polyline points="${listPts}" fill="none" stroke="#f87171"
                      stroke-width="1.8" stroke-opacity="0.9" stroke-linejoin="round"/>
            ${data.map((d, i) => html`
              <circle cx="${xp(i).toFixed(1)}" cy="${yp(d.listMs).toFixed(1)}" r="5"
                      fill="#f87171" style="animation:popIn .25s ${(i*.07).toFixed(2)}s both"/>
              <text x="${xp(i).toFixed(1)}" y="${(yp(d.listMs)-10).toFixed(1)}"
                    text-anchor="middle" font-size="9.5" fill="#f87171">${fmtMs(d.listMs)}</text>
            `)}
            <line x1="0" y1="${mapY.toFixed(1)}" x2="${pw}" y2="${mapY.toFixed(1)}"
                  stroke="#4ade80" stroke-width="1.8" stroke-opacity="0.9"/>
            ${data.map((d, i) => html`
              <circle cx="${xp(i).toFixed(1)}" cy="${yp(d.mapMs).toFixed(1)}" r="4.5"
                      fill="#4ade80" style="animation:popIn .25s ${(i*.07+.04).toFixed(2)}s both"/>
            `)}
            <text x="${(pw+10).toFixed(1)}" y="${(yp(data[n-1].listMs)+4).toFixed(1)}"
                  font-size="11" font-weight="700" fill="#f87171">O(n)</text>
            <text x="${(pw+10).toFixed(1)}" y="${(mapY > mt+ph-20 ? mapY-8 : mapY+14).toFixed(1)}"
                  font-size="11" font-weight="700" fill="#4ade80">O(1)</text>
          </svg>
        </div>

        <!-- X-axis labels aligned under SVG only (not under ylabels) -->
        <div class="chart-xrow">
          <div class="chart-xspacer"></div>
          <div class="chart-xlabels">
            ${data.map(d => html`<span>${fmtSize(d.size)}</span>`)}
          </div>
        </div>
        <div class="chart-xtitle">n (elementen)</div>

      </div>
    </div>
  `
}

// ── Component ─────────────────────────────────────────────────────────────

class MapVsList extends LitElement {
  static properties = {
    _slide:        { state: true },
    _results:      { state: true },
    _chartData:    { state: true },
    _chartLoading: { state: true },
  }

  constructor() {
    super()
    this._slide        = 0
    this._results      = {}   // roundIndex → { map, list }
    this._chartData    = null
    this._chartLoading = false
  }

  updated() {
    if (SLIDES[this._slide] === 'bigo' && !this._chartData && !this._chartLoading) {
      this._loadChart()
    }
  }

  async _loadChart() {
    this._chartLoading = true
    await new Promise(r => setTimeout(r, 60))
    this._chartData    = benchGrowth()
    this._chartLoading = false
  }

  _prev() { if (this._slide > 0) this._slide-- }
  _next() { if (this._slide < SLIDES.length - 1) this._slide++ }
  _goToSection(s) { this._slide = s.from }

  _answer(roundIndex, choice) {
    const result = QUIZ_ROUNDS[roundIndex].bench()
    this._results = { ...this._results, [roundIndex]: { ...result, choice } }
    this._slide++   // jump to reveal slide
  }

  // ── Render ───────────────────────────────────────────────────────────────

  render() {
    const section = sectionOf(this._slide)
    const isFirst = this._slide === 0
    const isLast  = this._slide === SLIDES.length - 1
    const isAsk   = ASK_SLIDES.has(this._slide)

    return html`
      <nav class="topnav">
        <span class="logo">Map <span class="vs">vs</span> List</span>
        <div class="sections">
          ${SECTIONS.map(s => html`
            <button
              class="sec-btn ${s.id === section?.id ? 'active' : ''}"
              @click=${() => this._goToSection(s)}
            >${s.label}</button>
          `)}
        </div>
        <span class="team">Team 418</span>
      </nav>

      <div class="stage">
        <div class="card ${['bigo','uitleg-when','uitleg-impl','uitleg-collection'].includes(SLIDES[this._slide]) ? 'card-bigo' : ''}">
          <div class="slide">${this._renderSlide()}</div>

          ${!isAsk ? html`
            <div class="slide-footer">
              <button class="nav-btn" @click=${this._prev} ?disabled=${isFirst}>← Vorige</button>
              <span class="slide-pos">${this._slidePos(section)}</span>
              ${isLast
                ? html`<span></span>`
                : html`<button class="nav-btn primary" @click=${this._next}>Volgende →</button>`}
            </div>
          ` : html`<div class="slide-footer ask-footer">
            <span class="ask-hint">Kies een antwoord om verder te gaan</span>
          </div>`}
        </div>
      </div>
    `
  }

  _slidePos(section) {
    if (!section) return ''
    const total = section.to - section.from + 1
    const cur   = this._slide - section.from + 1
    if (total <= 1) return ''
    return html`${Array.from({ length: total }, (_, i) => html`
      <span class="pos-dot ${i + 1 === cur ? 'cur' : i + 1 < cur ? 'past' : ''}"></span>
    `)}`
  }

  _renderSlide() {
    const id = SLIDES[this._slide]
    if (id === 'intro')             return this._intro()
    if (id === 'uitleg-collection') return this._uitlegCollection()
    if (id === 'uitleg-list')   return this._uitlegList()
    if (id === 'uitleg-map')    return this._uitlegMap()
    if (id === 'uitleg-when')   return this._uitlegWhen()
    if (id === 'uitleg-impl')   return this._uitlegImpl()
    if (id === 'demo-0-ask')    return this._demoAsk(0)
    if (id === 'demo-0-reveal') return this._demoReveal(0)
    if (id === 'demo-1-ask')    return this._demoAsk(1)
    if (id === 'demo-1-reveal') return this._demoReveal(1)
    if (id === 'demo-2-ask')    return this._demoAsk(2)
    if (id === 'demo-2-reveal') return this._demoReveal(2)
    if (id === 'bigo')          return this._bigo()
    if (id === 'bronnen')       return this._bronnen()
  }

  // ── Intro ─────────────────────────────────────────────────────────────────

  _intro() {
    return html`
      <div class="center fade">
        <div class="intro-pre">Team 418</div>
        <h1>Map <span class="vs">vs</span> List</h1>
        <p class="intro-sub">Twee datastructuren met een hoop verschil.<br>
          Wanneer kies je welke, en hoeveel maakt het eigenlijk uit?</p>
        <div class="team-row">
          <span class="name">Camil</span>
          <span class="sep">·</span>
          <span class="name">Pjotr</span>
          <span class="sep">·</span>
          <span class="name">Merlijn</span>
        </div>
      </div>
    `
  }

  // ── Uitleg ────────────────────────────────────────────────────────────────

  _uitlegCollection() {
    return html`
      <div class="cf-slide fade">
        <div class="slide-tag">Uitleg</div>
        <h2>Het Collections Framework</h2>
        <p class="cf-intro">Java groepeert datastructuren in het <strong>Collections Framework</strong>. Een collection is een object wat meerdere objecten opslaat. We gaan het hebben over deze interfaces: <code>List</code> en <code>Map</code>.</p>
        <div class="cf-tree">
          <div class="cf-root-node">Collections Framework</div>
          <div class="cf-connectors">
            <div class="cf-connector-line"></div>
            <div class="cf-connector-h"></div>
          </div>
          <div class="cf-branches">
            <div class="cf-branch">
              <span class="cf-iface-tag">interface</span>
              <div class="cf-branch-node list-branch">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                  <line x1="4" y1="7" x2="18" y2="7"/>
                  <line x1="4" y1="11" x2="18" y2="11"/>
                  <line x1="4" y1="15" x2="18" y2="15"/>
                </svg>
                List
              </div>
              <div class="cf-props">
                <span class="cf-prop">Gericht op volgorde</span>
              </div>
            </div>
            <div class="cf-branch">
              <span class="cf-iface-tag">interface</span>
              <div class="cf-branch-node map-branch">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="2" width="8" height="8" rx="1.5"/>
                  <rect x="12" y="2" width="8" height="8" rx="1.5"/>
                  <rect x="2" y="12" width="8" height="8" rx="1.5"/>
                  <rect x="12" y="12" width="8" height="8" rx="1.5"/>
                </svg>
                Map
              </div>
              <div class="cf-props">
                <span class="cf-prop">Gericht op key en value koppeling</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  _uitlegList() {
    return html`
      <div class="uitleg-slide fade">
        <div class="uitleg-text">
          <div class="slide-tag">Uitleg</div>
          <h2>Wat is een <em class="hl-blue">List</em>?</h2>
          <p>Een geordende rij van elementen. Je spreekt elk element aan op zijn <strong>positie (index)</strong>.</p>
          <ul class="props">
            <li><span class="badge green">O(1)</span> Ophalen op index</li>
            <li><span class="badge green">O(1)</span> Toevoegen achteraan</li>
            <li><span class="badge red">O(n)</span> Zoeken op waarde</li>
            <li><span class="badge blue">✓</span> Volgorde gegarandeerd</li>
            <li><span class="badge blue">✓</span> Duplicaten toegestaan</li>
          </ul>
        </div>
        <div class="code-block">
          <div class="code-label">Java</div>
          <pre>List&lt;String&gt; namen =
    new ArrayList&lt;&gt;();

namen.add(<span class="s">"Anna"</span>);  <span class="cm">// index 0</span>
namen.add(<span class="s">"Tom"</span>);   <span class="cm">// index 1</span>
namen.add(<span class="s">"Anna"</span>);  <span class="cm">// duplicaat ok</span>

namen.get(<span class="n">0</span>);          <span class="cm">// → "Anna"</span>
namen.contains(<span class="s">"Tom"</span>); <span class="cm">// O(n) scan</span>

System.out.println(
    String.join(<span class="s">","</span>, namen));
<span class="cm">// Output: Anna,Tom,Anna</span></pre>
        </div>
      </div>
    `
  }

  _uitlegMap() {
    return html`
      <div class="uitleg-slide fade">
        <div class="uitleg-text">
          <div class="slide-tag">Uitleg</div>
          <h2>Wat is een <em class="hl-purple">Map</em>?</h2>
          <p>Een verzameling van <strong>sleutel waarde paren</strong>. Je koppelt een waarde aan een unieke sleutel en haalt hem daar direct op.</p>
          <ul class="props">
            <li><span class="badge green">O(1)</span> Ophalen op sleutel</li>
            <li><span class="badge green">O(1)</span> Toevoegen / updaten</li>
            <li><span class="badge green">O(1)</span> Controleren of sleutel bestaat</li>
            <li><span class="badge yellow">—</span> Geen gegarandeerde volgorde</li>
            <li><span class="badge yellow">—</span> Sleutels altijd uniek</li>
          </ul>
        </div>
        <div class="code-block">
          <div class="code-label">Java</div>
          <pre>Map&lt;String, Integer&gt; scores =
    new HashMap&lt;&gt;();

scores.put(<span class="s">"Anna"</span>, <span class="n">95</span>);
scores.put(<span class="s">"Tom"</span>,  <span class="n">87</span>);
scores.put(<span class="s">"Anna"</span>, <span class="n">98</span>); <span class="cm">// overschrijft</span>

scores.get(<span class="s">"Anna"</span>);        <span class="cm">// → 98, O(1)</span>
scores.containsKey(<span class="s">"Tom"</span>); <span class="cm">// → true, O(1)</span></pre>
        </div>
      </div>
    `
  }

  _uitlegWhen() {
    const mapCases = [
      'Snel opzoeken op ID (gebruiker, product)',
      'Snel controleren of iets al bestaat',
      'Voorkomen van dubbele sleutels',
      'Groeperen / tellen per categorie',
    ]
    const listCases = [
      'Volgorde bewaren (tijdlijn, wachtrij)',
      'Sequentieel verwerken (for-each)',
      'Duplicaten zijn toegestaan',
      'Toegang via index nodig',
    ]
    const mapExamples = ['Woordenboek (woord → betekenis)', 'Contacten (naam → telefoonnummer)', 'Rapportcijfers (naam → cijfer)']
    const listExamples = ['Playlist van muziek', 'Chatberichten', 'Wachtrij']
    return html`
      <div class="when-slide fade">
        <div class="slide-tag">Uitleg</div>
        <h2>Wanneer gebruik je wat?</h2>
        <div class="when-grid">
          <div class="when-col">
            <div class="when-head map-head">Map</div>
            ${mapCases.map(c => html`<div class="when-item"><span class="wi-dot map-dot"></span>${c}</div>`)}
          </div>
          <div class="when-col">
            <div class="when-head list-head">List</div>
            ${listCases.map(c => html`<div class="when-item"><span class="wi-dot list-dot"></span>${c}</div>`)}
          </div>
        </div>
        <div class="when-examples">
          <div class="when-example-group">
            <div class="when-example-label">Voorbeelden</div>
            ${mapExamples.map(e => html`<div class="when-example-item">${e}</div>`)}
          </div>
          <div class="when-example-group">
            <div class="when-example-label">Voorbeelden</div>
            ${listExamples.map(e => html`<div class="when-example-item">${e}</div>`)}
          </div>
        </div>
      </div>
    `
  }

  _uitlegImpl() {
    const listImpls = [
      { name: 'ArrayList',   tag: 'Standaard',  color: 'green',  desc: 'Snel lezen via index. Meest gebruikt in de praktijk.' },
      { name: 'LinkedList',  tag: 'Speciaal',   color: 'blue',   desc: 'Snel toevoegen of verwijderen aan het begin.' },
    ]
    const mapImpls = [
      { name: 'HashMap',       tag: 'Standaard',  color: 'green',  desc: 'Snelste lookup. Geen gegarandeerde volgorde.' },
      { name: 'LinkedHashMap', tag: 'Volgorde',   color: 'blue',   desc: 'Bewaart de invoegvolgorde.' },
      { name: 'TreeMap',       tag: 'Gesorteerd', color: 'yellow', desc: 'Sorteert automatisch op sleutel. Iets trager: O(log n).' },
    ]
    return html`
      <div class="impl-slide fade">
        <div class="slide-tag">Uitleg</div>
        <h2>Implementaties</h2>
        <div class="impl-grid">
          <div class="impl-col">
            <div class="when-head list-head">List</div>
            ${listImpls.map(i => html`
              <div class="impl-card">
                <div class="impl-top">
                  <code class="impl-name">${i.name}</code>
                  <span class="badge ${i.color}">${i.tag}</span>
                </div>
                <p class="impl-desc">${i.desc}</p>
              </div>
            `)}
          </div>
          <div class="impl-col">
            <div class="when-head map-head">Map</div>
            ${mapImpls.map(i => html`
              <div class="impl-card">
                <div class="impl-top">
                  <code class="impl-name">${i.name}</code>
                  <span class="badge ${i.color}">${i.tag}</span>
                </div>
                <p class="impl-desc">${i.desc}</p>
              </div>
            `)}
          </div>
        </div>
      </div>
    `
  }

  // ── Demo ──────────────────────────────────────────────────────────────────

  _demoAsk(i) {
    const r = QUIZ_ROUNDS[i]
    return html`
      <div class="demo-ask fade">
        <div class="demo-meta">
          <span class="slide-tag">Demo ${i + 1} / ${QUIZ_ROUNDS.length}</span>
          <span class="demo-hint">${r.hint}</span>
        </div>
        <p class="demo-scenario">${r.scenario}</p>
        <p class="demo-cta">Wat denk jij dat sneller is?</p>
        <div class="choices">
          <button class="choice map-choice" @click=${() => this._answer(i, 'Map')}>
            <span class="choice-icon">
              <svg width="28" height="28" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="8" height="8" rx="1.5"/>
                <rect x="12" y="2" width="8" height="8" rx="1.5"/>
                <rect x="2" y="12" width="8" height="8" rx="1.5"/>
                <rect x="12" y="12" width="8" height="8" rx="1.5"/>
              </svg>
            </span>
            Map
          </button>
          <button class="choice list-choice" @click=${() => this._answer(i, 'List')}>
            <span class="choice-icon">
              <svg width="28" height="28" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
                <line x1="4" y1="7" x2="18" y2="7"/>
                <line x1="4" y1="11" x2="18" y2="11"/>
                <line x1="4" y1="15" x2="18" y2="15"/>
              </svg>
            </span>
            List
          </button>
        </div>
      </div>
    `
  }

  _demoReveal(i) {
    const r      = QUIZ_ROUNDS[i]
    const res    = this._results[i]
    if (!res) return html`<div class="center">Geen resultaat</div>`

    const maxMs  = Math.max(res.map, res.list)
    const minMs  = Math.min(res.map, res.list)
    const speedup = maxMs / minMs

    return html`
      <div class="demo-reveal fade">
        <div class="reveal-top">
          <div class="reveal-left">
            <div class="demo-meta">
              <span class="slide-tag">Demo ${i + 1} / ${QUIZ_ROUNDS.length}</span>
              <span class="demo-hint">${r.hint}</span>
            </div>
            <div class="winner-line">
              <strong>${r.winner}</strong> is <strong>${fmtX(speedup)}× sneller</strong>
            </div>
            <div class="bars">
              ${this._bar('Map',  res.map,  res.map  < res.list, maxMs)}
              ${this._bar('List', res.list, res.list < res.map,  maxMs)}
            </div>
            <div class="bigo-chips">
              <span class="bigo-chip map-chip">Map ${r.bigO.Map}</span>
              <span class="bigo-chip list-chip">List ${r.bigO.List}</span>
            </div>
          </div>
          <div class="reveal-right">
            <p class="explanation">${r.explanation}</p>
          </div>
        </div>
      </div>
    `
  }

  _bar(label, ms, isWinner, maxMs) {
    const pct = (ms / maxMs) * 100
    return html`
      <div class="bar-row">
        <span class="bar-label">${label}</span>
        <div class="bar-track">
          <div class="bar-fill ${isWinner ? 'bar-win' : 'bar-lose'}" style="--pct:${pct}%"></div>
        </div>
        <span class="bar-ms ${isWinner ? 'ms-win' : ''}">${fmtMs(ms)}</span>
      </div>
    `
  }

  // ── Big O ─────────────────────────────────────────────────────────────────

  _bigo() {
    if (this._chartLoading || !this._chartData) {
      return html`
        <div class="center fade">
          <span class="spinner"></span>
          <p style="color:#888;font-size:.9rem;margin-top:16px">Benchmarking bij meerdere groottes…</p>
        </div>
      `
    }

    return html`
      <div class="bigo-slide fade">
        <div class="bigo-header">
          <div>
            <div class="slide-tag">Big O</div>
            <h2>Hoe groeit de lookup-tijd met meer data?</h2>
            <p class="bigo-sub">Map.get() vs List lineaire scan, meting bij 6 groottes (0 t/m 100K)</p>
          </div>
          <div class="bigo-legend">
            <span class="leg-dot" style="background:var(--green)"></span>Map: O(1)
            <span class="leg-dot" style="background:var(--red);margin-left:16px"></span>List: O(n)
          </div>
        </div>
        <div class="chart-wrap">${bigoChart(this._chartData)}</div>
        <table class="bigo-table">
          <thead>
            <tr>
              <th></th>
              <th>Big O</th>
              <th>Gemeten 20K</th>
              <th>Voorspeld 100K</th>
              <th>Gemeten 100K</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="bt-name map-name">Map</td>
              <td class="bt-bigo"><span class="bigo-chip map-chip">O(1)</span></td>
              <td class="bt-val">${fmtMs(this._chartData[1].mapMs)}</td>
              <td class="bt-val bt-predicted">${fmtMs(this._chartData[1].mapMs)} <span class="bt-why">(×1)</span></td>
              <td class="bt-val">${fmtMs(this._chartData.at(-1).mapMs)}</td>
            </tr>
            <tr>
              <td class="bt-name list-name">List</td>
              <td class="bt-bigo"><span class="bigo-chip list-chip">O(n)</span></td>
              <td class="bt-val">${fmtMs(this._chartData[1].listMs)}</td>
              <td class="bt-val bt-predicted">${fmtMs(this._chartData[1].listMs * 5)} <span class="bt-why">(×5)</span></td>
              <td class="bt-val">${fmtMs(this._chartData.at(-1).listMs)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `
  }

  // ── Bronnen ───────────────────────────────────────────────────────────────

  _bronnen() {
    const refs = [
      {
        title: 'Java SE 21 — Class HashMap',
        meta: 'Officiële Oracle documentatie voor HashMap: complexiteitsgaranties, interne werking en alle methodes.',
        url: 'https://docs.oracle.com/en/java/se/21/docs/api/java.base/java/util/HashMap.html',
      },
      {
        title: 'Java SE 21 — Class ArrayList',
        meta: 'Officiële Oracle documentatie voor ArrayList: wanneer O(1) vs O(n) van toepassing is en resizing-gedrag.',
        url: 'https://docs.oracle.com/en/java/se/21/docs/api/java.base/java/util/ArrayList.html',
      },
      {
        title: 'Hash table — Wikipedia',
        meta: 'Legt uit hoe een hash-functie en bucket-array zorgen dat HashMap O(1) lookup bereikt.',
        url: 'https://en.wikipedia.org/wiki/Hash_table',
      },
      {
        title: 'Big-O Cheat Sheet',
        meta: 'Overzicht van tijdcomplexiteiten voor alle gangbare datastructuren en algoritmen.',
        url: 'https://www.bigocheatsheet.com/',
      },
    ]
    return html`
      <div class="bronnen-slide fade">
        <div class="slide-tag">Bronnen</div>
        <h2>Referenties</h2>
        <ul class="ref-list">
          ${refs.map(r => html`
            <li class="ref-item">
              <a class="ref-link" href="${r.url}" target="_blank" rel="noopener">
                <span class="ref-title">${r.title}</span>
                <span class="ref-meta">${r.meta}</span>
              </a>
            </li>
          `)}
        </ul>
      </div>
    `
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  static styles = css`
    :host { display: contents; }

    @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
    @keyframes popIn  { from { opacity:0; transform:scale(.3) }      to { opacity:1; transform:scale(1) } }
    @keyframes spin   { to { transform:rotate(360deg) } }
    @keyframes grow   { to { width:var(--pct) } }
    @keyframes drawLine { from { stroke-dashoffset: 1000 } to { stroke-dashoffset: 0 } }
    .fade { animation: fadeIn .3s ease both; }

    /* ── Top nav ── */
    .topnav {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 28px;
      height: 52px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .logo {
      font-size: .95rem;
      font-weight: 800;
      letter-spacing: -.02em;
      white-space: nowrap;
      margin-right: 8px;
    }
    .vs { color: var(--muted2); font-weight: 300; }
    .sections { display: flex; gap: 2px; flex: 1; justify-content: center; }
    .sec-btn {
      padding: 6px 14px;
      background: none;
      border: none;
      border-radius: 7px;
      color: var(--muted2);
      font-size: .8rem;
      font-weight: 600;
      cursor: pointer;
      transition: color .15s, background .15s;
      white-space: nowrap;
    }
    .sec-btn:hover  { color: var(--text); background: var(--s2); }
    .sec-btn.active { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
    .team { font-size: .75rem; color: var(--muted2); font-weight: 600; white-space: nowrap; margin-left: 8px; }

    /* ── Stage & Card ── */
    .stage {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px 20px;
      overflow: hidden;
    }
    .card {
      width: 100%;
      max-width: 960px;
      height: 100%;
      max-height: 680px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .card-bigo { height: auto; max-height: calc(100dvh - 100px); }
    .slide { flex: 1; padding: 40px 52px; overflow-y: auto; display: flex; flex-direction: column; }
    .slide-footer {
      padding: 16px 52px;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-shrink: 0;
    }
    .ask-footer { justify-content: center; }
    .ask-hint { font-size: .8rem; color: var(--muted2); }

    .pos-dot {
      display: inline-block;
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--muted);
      transition: background .2s;
    }
    .pos-dot.cur  { background: var(--accent); }
    .pos-dot.past { background: var(--muted2); }
    .slide-pos { display: flex; gap: 6px; align-items: center; }

    /* ── Nav buttons ── */
    .nav-btn {
      padding: 8px 20px;
      background: var(--s2);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--muted3);
      font-size: .82rem;
      font-weight: 600;
      cursor: pointer;
      transition: color .15s, background .15s, opacity .15s;
    }
    .nav-btn:hover:not(:disabled) { color: var(--text); background: var(--s3); }
    .nav-btn:disabled { opacity: .3; cursor: default; }
    .nav-btn.primary { background: var(--accent2); border-color: var(--accent2); color: #fff; }
    .nav-btn.primary:hover { opacity: .88; }
    .nav-btn.restart { color: var(--muted3); }

    /* ── Shared ── */
    .center {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 20px; text-align: center;
    }
    .slide-tag {
      display: inline-block;
      font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .12em;
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 10%, transparent);
      padding: 3px 10px; border-radius: 99px; margin-bottom: 10px;
    }

    /* ── Intro ── */
    .intro-pre { font-size: .8rem; color: var(--muted2); letter-spacing: .06em; text-transform: uppercase; }
    h1 {
      font-size: clamp(3rem, 7vw, 4.5rem); font-weight: 800;
      letter-spacing: -.03em; line-height: 1.05; color: var(--text);
      font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    }
    .intro-sub { color: var(--muted3); font-size: .95rem; line-height: 1.65; max-width: 440px; }
    .team-row {
      display: flex; align-items: center; gap: 10px;
      font-size: .9rem; color: var(--muted3); margin-top: 8px;
    }
    .avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--s3); border: 1px solid var(--border);
      display: inline-flex; align-items: center; justify-content: center;
      font-size: .78rem; font-weight: 700; color: var(--accent);
    }
    .name { font-weight: 600; color: var(--muted3); }
    .sep { color: var(--muted); }

    /* ── Uitleg ── */
    .uitleg-slide {
      flex: 1; display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px; align-items: start;
    }
    .uitleg-text h2 {
      font-size: 1.8rem; font-weight: 800; letter-spacing: -.02em; margin-bottom: 14px;
      color: var(--text); font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    }
    .uitleg-text h2 em { font-style: normal; }
    .hl-blue   { color: var(--blue); }
    .hl-purple { color: var(--accent); }
    .uitleg-text p { color: var(--muted3); font-size: 1.05rem; line-height: 1.6; margin-bottom: 20px; }

    .props { list-style: none; display: flex; flex-direction: column; gap: 11px; }
    .props li { display: flex; align-items: center; gap: 10px; font-size: .98rem; color: var(--muted3); }
    .badge {
      display: inline-block; padding: 2px 8px; border-radius: 5px;
      font-size: .7rem; font-weight: 700; font-family: monospace; white-space: nowrap;
    }
    .badge.green  { background: color-mix(in srgb,var(--green) 12%,transparent);  color: var(--green); }
    .badge.red    { background: color-mix(in srgb,var(--red)   12%,transparent);   color: var(--red);   }
    .badge.blue   { background: color-mix(in srgb,var(--blue)  12%,transparent);   color: var(--blue);  }
    .badge.yellow { background: color-mix(in srgb,var(--yellow)12%,transparent);  color: var(--yellow);}

    .code-block {
      background: #0a0a0a; border: 1px solid var(--border);
      border-radius: 12px; overflow: hidden;
    }
    .code-label {
      padding: 8px 16px; font-size: .7rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: .1em;
      color: var(--muted2); border-bottom: 1px solid var(--border);
    }
    pre {
      padding: 20px; font-family: 'Fira Code', 'Cascadia Code', monospace;
      font-size: .92rem; line-height: 1.8; color: #ccc; overflow-x: auto;
    }
    pre .s  { color: #a5d6ff; }
    pre .n  { color: #f78c6c; }
    pre .cm { color: #666; }

    /* ── Collection Framework ── */
    .cf-slide { flex: 1; display: flex; flex-direction: column; gap: 20px; }
    .cf-slide h2 { font-size: 1.7rem; font-weight: 800; letter-spacing: -.02em; font-family: 'Bricolage Grotesque', system-ui, sans-serif; }
    .cf-intro { font-size: 1rem; color: var(--muted3); line-height: 1.6; }
    .cf-tree { display: flex; flex-direction: column; align-items: center; gap: 0; }
    .cf-root-node {
      padding: 10px 28px; background: var(--s3); border: 1px solid var(--border);
      border-radius: 10px; font-size: .9rem; font-weight: 700; color: var(--muted3);
      letter-spacing: .03em;
    }
    .cf-connectors { display: flex; flex-direction: column; align-items: center; width: 100%; }
    .cf-connector-line { width: 1px; height: 20px; background: var(--border); }
    .cf-connector-h { width: 55%; height: 1px; background: var(--border); }
    .cf-branches { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%; }
    .cf-branch {
      display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px;
      padding: 24px 20px; border: 1px solid var(--border); border-radius: 14px;
      background: var(--s2);
    }
    .cf-branch-node {
      display: flex; align-items: center; gap: 8px;
      font-size: 1.2rem; font-weight: 800; letter-spacing: -.01em;
    }
    .list-branch { color: var(--blue); }
    .map-branch  { color: var(--accent); }
    .cf-iface-tag {
      font-size: .7rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
      color: var(--muted2); background: var(--s3); border: 1px solid var(--border);
      padding: 2px 8px; border-radius: 4px; font-family: monospace;
    }
    .cf-props { display: flex; flex-direction: column; gap: 8px; width: 100%; }
    .cf-prop {
      font-size: .88rem; color: var(--muted3); padding: 7px 14px;
      background: var(--s3); border-radius: 7px; text-align: center;
    }

    /* ── Wanneer ── */
    .when-slide { flex: 1; display: flex; flex-direction: column; gap: 20px; }
    .when-slide h2 { font-size: 1.7rem; font-weight: 800; letter-spacing: -.02em; font-family: 'Bricolage Grotesque', system-ui, sans-serif; }
    .when-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1; }
    .when-col { background: var(--s2); border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
    .when-head { font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
    .map-head  { color: var(--accent); }
    .list-head { color: var(--blue); }
    .when-item { display: flex; align-items: flex-start; gap: 10px; font-size: .875rem; color: var(--muted3); line-height: 1.5; }
    .wi-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
    .map-dot  { background: var(--accent); }
    .list-dot { background: var(--blue); }
    .when-rule {
      font-size: .83rem; color: var(--muted2); line-height: 1.6;
      background: var(--s2); border: 1px solid var(--border); border-radius: 8px;
      padding: 12px 16px;
    }
    .when-rule code { color: var(--yellow); font-family: monospace; }
    .when-examples { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .when-example-group { display: flex; flex-direction: column; gap: 6px; }
    .when-example-label { font-size: .73rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--muted2); margin-bottom: 2px; }
    .when-example-item {
      font-size: .82rem; color: var(--muted3); padding: 7px 12px;
      background: var(--s2); border: 1px solid var(--border); border-radius: 7px;
    }

    /* ── Impl slide ── */
    .impl-slide { flex: 1; display: flex; flex-direction: column; gap: 16px; }
    .impl-slide h2 { font-size: 1.7rem; font-weight: 800; letter-spacing: -.02em; font-family: 'Bricolage Grotesque', system-ui, sans-serif; }
    .impl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .impl-col { display: flex; flex-direction: column; gap: 10px; }
    .impl-card {
      padding: 12px 14px; background: var(--s2); border: 1px solid var(--border);
      border-radius: 10px; display: flex; flex-direction: column; gap: 6px;
    }
    .impl-top { display: flex; align-items: center; justify-content: space-between; }
    .impl-name { font-size: .88rem; font-weight: 700; color: var(--text); font-family: monospace; }
    .impl-desc { font-size: .8rem; color: var(--muted3); line-height: 1.5; }

    /* ── Demo ask ── */
    .demo-ask { flex: 1; display: flex; flex-direction: column; }
    .demo-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .demo-hint { font-size: .9rem; color: var(--muted2); }
    .demo-scenario { font-size: 1.55rem; font-weight: 500; line-height: 1.55; color: var(--text); flex: 1; }
    .demo-cta { font-size: 1rem; color: var(--muted2); margin-top: 16px; margin-bottom: 24px; }
    .choices { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .choice {
      padding: 32px 24px; border: 1px solid var(--border); border-radius: 16px;
      font-size: 1.6rem; font-weight: 700; cursor: pointer;
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      transition: transform .12s, border-color .12s, background .12s;
    }
    .choice-icon { display: flex; }
    .map-choice  { background: color-mix(in srgb,var(--accent) 5%,var(--s2)); color: var(--text); }
    .list-choice { background: color-mix(in srgb,var(--blue)   5%,var(--s2)); color: var(--text); }
    .map-choice:hover  { border-color: var(--accent); transform: translateY(-3px); background: color-mix(in srgb,var(--accent) 10%,var(--s2)); }
    .list-choice:hover { border-color: var(--blue);   transform: translateY(-3px); background: color-mix(in srgb,var(--blue)   10%,var(--s2)); }

    /* ── Demo reveal ── */
    .demo-reveal { flex: 1; display: flex; flex-direction: column; }
    .reveal-top { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 36px; align-items: start; }
    .winner-line { font-size: 1.1rem; color: var(--muted2); margin-bottom: 16px; }
    .winner-line strong { color: var(--text); font-weight: 800; font-size: 1.25rem; }
    .bars { display: flex; flex-direction: column; gap: 9px; margin-bottom: 14px; }
    .bar-row { display: grid; grid-template-columns: 44px 1fr 78px; align-items: center; gap: 12px; }
    .bar-label { font-size: .93rem; font-weight: 600; color: var(--muted2); }
    .bar-track { height: 30px; background: var(--s2); border-radius: 7px; overflow: hidden; }
    .bar-fill { height:100%; width:0; border-radius:7px; animation: grow .7s cubic-bezier(.4,0,.2,1) .05s both; }
    .bar-win  { background: var(--green); }
    .bar-lose { background: var(--red); opacity: .5; }
    .bar-ms { font-size: .9rem; font-variant-numeric: tabular-nums; color: var(--muted2); text-align: right; }
    .ms-win { color: var(--green); font-weight: 600; }
    .bigo-chips { display: flex; gap: 8px; }
    .bigo-chip { font-size: .83rem; font-family: monospace; padding: 3px 9px; border-radius: 5px; }
    .map-chip  { background: color-mix(in srgb,var(--accent) 12%,transparent); color: var(--accent); }
    .list-chip { background: color-mix(in srgb,var(--blue)   12%,transparent); color: var(--blue);   }
    .reveal-right { display: flex; flex-direction: column; justify-content: center; }
    .explanation { font-size: 1rem; color: var(--muted3); line-height: 1.7; }

    /* ── Big O ── */
    .bigo-slide { flex: 1; display: flex; flex-direction: column; gap: 12px; }
    .bigo-header { display: flex; align-items: flex-start; justify-content: space-between; }
    .bigo-header h2 { font-size: 1.5rem; font-weight: 800; letter-spacing: -.02em; margin: 6px 0 4px; font-family: 'Bricolage Grotesque', system-ui, sans-serif; }
    .bigo-sub { font-size: .83rem; color: var(--muted2); }
    .bigo-legend { display: flex; align-items: center; gap: 6px; font-size: .8rem; color: var(--muted2); white-space: nowrap; padding-top: 12px; }
    .leg-dot  { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
    .leg-dash { color: #f87171; opacity: .5; font-size: .75rem; letter-spacing: .08em; margin: 0 6px 0 14px; }
    .chart-wrap { flex: 1; min-height: 0; }
    .chart-outer { display: flex; height: 100%; }
    .chart-ytitle {
      writing-mode: vertical-rl; transform: rotate(180deg);
      font-size: .73rem; color: #888; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      width: 16px;
    }
    .chart-main { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
    .chart-svg-row { display: flex; align-items: stretch; }
    .chart-ylabels { position: relative; width: 50px; flex-shrink: 0; }
    .chart-ylabel {
      position: absolute; right: 6px; transform: translateY(-50%);
      font-size: .72rem; font-weight: 600; color: #ccc;
      white-space: nowrap; font-family: system-ui, sans-serif; line-height: 1;
    }
    .chart-svg { flex: 1; min-width: 0; height: auto; display: block; }
    .chart-xrow { display: flex; padding-top: 5px; flex-shrink: 0; }
    .chart-xspacer { width: 50px; flex-shrink: 0; }
    .chart-xlabels { flex: 1; display: flex; justify-content: space-between; padding-right: 11.8%; }
    .chart-xlabels span {
      font-size: .72rem; font-weight: 600; color: #ccc;
      font-family: system-ui, sans-serif; text-align: center;
    }
    .chart-xtitle { text-align: center; font-size: .73rem; color: #888; margin-top: 3px; padding-right: 11.8%; flex-shrink: 0; }
    .bigo-table {
      width: 100%; border-collapse: collapse;
      background: var(--s2); border: 1px solid var(--border); border-radius: 12px;
      overflow: hidden; font-size: .88rem;
    }
    .bigo-table thead tr { border-bottom: 1px solid var(--border); }
    .bigo-table th {
      padding: 10px 16px; text-align: left;
      font-size: .75rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .07em; color: var(--muted2);
    }
    .bigo-table td { padding: 12px 16px; border-top: 1px solid var(--border); }
    .bigo-table tbody tr:first-child td { border-top: none; }
    .bt-name { font-weight: 800; font-size: 1rem; }
    .map-name  { color: var(--accent); }
    .list-name { color: var(--blue); }
    .bt-val { font-family: monospace; color: var(--muted3); font-variant-numeric: tabular-nums; }
    .bt-predicted { color: var(--muted2); }
    .bt-why { font-size: .75rem; color: var(--muted2); }

    /* ── Bronnen ── */
    .bronnen-slide { flex: 1; display: flex; flex-direction: column; gap: 20px; }
    .bronnen-slide h2 { font-size: 1.7rem; font-weight: 800; letter-spacing: -.02em; margin-top: 6px; font-family: 'Bricolage Grotesque', system-ui, sans-serif; }
    .ref-list { list-style: none; display: flex; flex-direction: column; flex: 1; justify-content: space-evenly; gap: 10px; }
    .ref-item {
      padding: 14px 18px; background: var(--s2); border: 1px solid var(--border);
      border-radius: 10px; transition: border-color .15s, background .15s;
    }
    .ref-item:hover { border-color: var(--accent); background: var(--s3); }
    .ref-link {
      display: flex; flex-direction: column; gap: 3px;
      text-decoration: none;
    }
    .ref-title { font-size: .88rem; font-weight: 600; color: var(--text); }
    .ref-meta  { font-size: .78rem; color: var(--muted2); }
    .closing {
      margin-top: auto; text-align: center;
      padding: 20px; background: var(--s2); border: 1px solid var(--border);
      border-radius: 12px;
    }
    .closing-team  { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; color: var(--accent); margin-bottom: 6px; }
    .closing-names { font-size: 1.1rem; font-weight: 700; color: var(--text); }
    .closing-sub   { font-size: .82rem; color: var(--muted2); margin-top: 6px; }

    /* ── Spinner ── */
    .spinner {
      width: 36px; height: 36px;
      border: 3px solid var(--s3); border-top-color: var(--accent);
      border-radius: 50%; animation: spin .8s linear infinite;
    }
  `
}

customElements.define('map-vs-list', MapVsList)
