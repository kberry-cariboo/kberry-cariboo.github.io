window.Recharts = (function() {
  const h = React.createElement;
  const { useState, useRef, useEffect, useLayoutEffect, useMemo, Children } = React;

  // ── Descriptor components ─────────────────────────────────────────────────
  function Bar(p)          { return null; }
  function Line(p)         { return null; }
  function Area(p)         { return null; }
  function Pie(p)          { return null; }
  function Cell(p)         { return null; }
  function XAxis(p)        { return null; }
  function YAxis(p)        { return null; }
  function CartesianGrid(p){ return null; }
  function Tooltip(p)      { return null; }
  function Legend(p)       { return null; }
  function ReferenceLine(p){ return null; }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function ys(val, yLo, yHi, innerH) {
    if (yHi === yLo) return innerH / 2;
    return innerH - ((val - yLo) / (yHi - yLo)) * innerH;
  }
  // "Nice" axis scale: pick a 1/2/2.5/5×10^n step, snap the domain outward to
  // step multiples, so gridlines land on round values ($5k, $10k) instead of
  // arbitrary equal divisions of the padded extent.
  function niceScale(dataMin, dataMax, maxTicks = 6) {
    let lo = Math.min(dataMin, 0);
    let hi = Math.max(dataMax, 0);
    if (lo === hi) { hi = lo + 1; }
    const rawStep = (hi - lo) / Math.max(maxTicks - 1, 1);
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const norm = rawStep / mag;
    // steps limited to 1/2/5×10^n — the $k axis formatter rounds to whole
    // thousands, so a 2.5k step would label as misleading "$3k, $5k, $8k"
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
    const niceLo = Math.floor(lo / step) * step;
    const niceHi = Math.ceil(hi / step) * step;
    const ticks = [];
    // epsilon guards float drift so the last tick is included
    for (let t = niceLo; t <= niceHi + step * 1e-6; t += step) ticks.push(Math.abs(t) < step * 1e-9 ? 0 : t);
    return { lo: niceLo, hi: niceHi, ticks };
  }
  function getExtent(data, keys) {
    let lo = Infinity, hi = -Infinity;
    data.forEach(d => keys.forEach(k => {
      const v = Number(d[k]);
      if (!isNaN(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    }));
    return [lo === Infinity ? 0 : lo, hi === -Infinity ? 0 : hi];
  }
  function mkTicks(lo, hi, n) {
    const step = (hi - lo) / n;
    return Array.from({length: n + 1}, (_, i) => lo + i * step);
  }
  function defaultFmt(v) {
    if (typeof v !== 'number') return String(v);
    const a = Math.abs(v);
    if (a >= 1e6)  return '$' + (v/1e6).toFixed(1) + 'M';
    if (a >= 1000) return '$' + (v/1000).toFixed(0) + 'k';
    return v.toFixed(0);
  }

  // ── ResponsiveContainer ───────────────────────────────────────────────────
  // Measures actual container width synchronously (useLayoutEffect) so the
  // first paint is already at the correct size — no overflow flash.
  function ResponsiveContainer({ height, children, style }) {
    const ref  = useRef(null);
    const [w, setW] = useState(300);
    // useLayoutEffect fires synchronously after DOM mutation, before paint
    useLayoutEffect(() => {
      if (!ref.current) return;
      const measure = () => {
        const rect = ref.current.getBoundingClientRect();
        if (rect.width > 0) setW(Math.floor(rect.width));
      };
      measure();
      const ro = window.ResizeObserver
        ? new ResizeObserver(measure)
        : null;
      if (ro) ro.observe(ref.current);
      return () => ro && ro.disconnect();
    }, []);
    const ch = typeof height === 'number' ? height : 200;
    return h('div', { ref, style: Object.assign({ width:'100%', height: ch, overflow:'visible', position:'relative' }, style) },
      React.cloneElement(Children.only(children), { width: w, height: ch })
    );
  }

  // ── CartesianChart core ───────────────────────────────────────────────────
  // Uses viewBox so the SVG is always 100% wide regardless of pixel size.
  function CartesianChart({ data=[], children, width=300, height=250,
                            margin: mg={}, barCategoryGap='20%' }) {
    const arr = Children.toArray(children);
    const xDesc     = arr.find(c=>c.type===XAxis);
    const yDesc     = arr.find(c=>c.type===YAxis);
    // Axis title labels — reserve extra margin space when present
    const xAxisLabel = xDesc?.props?.label;
    const yAxisLabel = yDesc?.props?.label;
    const xLabelText = xAxisLabel ? (typeof xAxisLabel==='string'?xAxisLabel:xAxisLabel.value) : null;
    const yLabelText = yAxisLabel ? (typeof yAxisLabel==='string'?yAxisLabel:yAxisLabel.value) : null;
    // Y-axis labels get a real left gutter (YAxis `width` prop, default 40) so
    // they never collide with the first data column.
    const yGutter = yDesc ? (yDesc.props?.width || 40) : 0;
    const M  = { top:14, right:16,
                 bottom: xLabelText ? 54 : 34,
                 left:   16, ...mg };
    M.left += yGutter;
    // Read CSS variables for dark mode support
    const root=typeof document!=='undefined'?document.documentElement:null;
    const cs=root?getComputedStyle(root):null;
    const cssGrid  = cs?.getPropertyValue('--border')?.trim() || '#e5e7eb';
    const cssTick  = cs?.getPropertyValue('--textMid')?.trim() || '#888';
    const cssSurface = cs?.getPropertyValue('--bgCard')?.trim() || '#fff';
    const iW = Math.max(width  - M.left - M.right, 10);
    const iH = Math.max(height - M.top  - M.bottom, 10);
    const [tip, setTip] = useState(null);

    const barDescs  = arr.filter(c=>c.type===Bar);
    const lineDescs = arr.filter(c=>c.type===Line);
    const areaDescs = arr.filter(c=>c.type===Area);
    const gridDesc  = arr.find(c=>c.type===CartesianGrid);
    const tipDesc   = arr.find(c=>c.type===Tooltip);
    const legDesc   = arr.find(c=>c.type===Legend);
    const refLines  = arr.filter(c=>c.type===ReferenceLine);

    const xKey = xDesc?.props?.dataKey || 'month';
    const allKeys = [
      ...barDescs.map(b=>b.props.dataKey),
      ...lineDescs.map(l=>l.props.dataKey),
      ...areaDescs.map(a=>a.props.dataKey),
    ].filter(Boolean);

    const [rawLo, rawHi] = getExtent(data, allKeys);
    const scale          = niceScale(rawLo, rawHi);
    const yLo = scale.lo, yHi = scale.hi;
    const ytValues       = scale.ticks;
    const yFmt           = yDesc?.props?.tickFormatter || defaultFmt;

    const bw   = data.length > 0 ? iW / data.length : iW;
    const xMid = i => i * bw + bw / 2;
    const yv   = v => ys(v, yLo, yHi, iH);
    const y0   = yv(0);

    // X label density
    const maxXL  = Math.max(1, Math.floor(iW / 32));
    const xStep  = Math.ceil(data.length / maxXL);

    // ── Bars ────────────────────────────────────────────────────────────────
    const ungrouped = barDescs.filter(b=>!b.props.stackId);
    const stacked   = barDescs.filter(b=> b.props.stackId);
    const uCount    = Math.max(ungrouped.length, 1);
    const gapPct    = parseFloat(barCategoryGap) / 100 || 0.2;
    const totalBW   = bw * (1 - gapPct);

    function renderBar(desc, gi, groupSize) {
      const { dataKey, fill, radius, label } = desc.props;
      const cells = Children.toArray(desc.props.children).filter(c=>c.type===Cell);
      const bwi   = totalBW / groupSize;
      const r     = Array.isArray(radius) ? radius[0] : (radius || 0);
      const lblFmt = label ? (typeof label==='function' ? label : (label.formatter || (v=>v))) : null;
      return data.map((d, i) => {
        const v     = Number(d[dataKey]) || 0;
        const x     = xMid(i) - totalBW / 2 + gi * bwi;
        const barH  = Math.abs(yv(v) - y0);
        const barY  = v >= 0 ? y0 - barH : y0;
        const cf    = cells[i]?.props?.fill || fill || '#8884d8';
        return h(React.Fragment, { key: i },
          h('rect', { x, y: barY, width: bwi, height: Math.max(barH, 1),
            fill: cf, rx: r, ry: r,
            onMouseMove: e => {
              const svg = e.currentTarget.ownerSVGElement.getBoundingClientRect();
              setTip({ x: e.clientX-svg.left, y: e.clientY-svg.top, idx: i, d });
            },
            onTouchStart: e => {
              const t=e.touches&&e.touches[0]; if(!t) return;
              const svg = e.currentTarget.ownerSVGElement.getBoundingClientRect();
              setTip({ x: t.clientX-svg.left, y: t.clientY-svg.top, idx: i, d });
            },
            onTouchMove: e => {
              const t=e.touches&&e.touches[0]; if(!t) return;
              const svg = e.currentTarget.ownerSVGElement.getBoundingClientRect();
              setTip({ x: t.clientX-svg.left, y: t.clientY-svg.top, idx: i, d });
            },
            onMouseLeave: () => setTip(null)
          }),
          lblFmt && v !== 0 && h('text', {
            x: x + bwi/2,
            y: v >= 0 ? barY - 4 : barY + barH + 11,
            textAnchor:'middle', fontSize:9, fontFamily:'Inter,sans-serif',
            fill:cssTick, pointerEvents:'none'
          }, lblFmt(v))
        );
      });
    }

    // ── Lines / Areas ────────────────────────────────────────────────────────
    function renderLine(desc, filled) {
      const { dataKey, stroke='#8884d8', fill='rgba(136,132,216,0.15)', fillOpacity=1,
              strokeWidth=2, dot, label, strokeDasharray, endLabel, name } = desc.props;
      const pts = data.map((d, i) => [xMid(i), yv(Number(d[dataKey]) || 0)]);
      if (pts.length < 1) return null;
      const lblFmt = label ? (typeof label==='function' ? label : (label.formatter || (v=>v))) : null;
      if (pts.length === 1) {
        // single point: render dot only
        return h('circle', { key:dataKey, cx:pts[0][0], cy:pts[0][1], r:4, fill:stroke, stroke:'none' });
      }
      const linePath  = pts.map((p,i) => (i?'L':'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
      const areaPath  = linePath
        + ' L' + pts[pts.length-1][0].toFixed(1) + ',' + y0.toFixed(1)
        + ' L' + pts[0][0].toFixed(1) + ',' + y0.toFixed(1) + ' Z';
      const dr = (typeof dot === 'object' && dot?.r) ? dot.r : 3;
      const last = pts[pts.length - 1];
      return h(React.Fragment, { key: dataKey },
        filled && h('path', { d: areaPath, fill, fillOpacity, stroke:'none' }),
        h('path', { d: linePath, fill:'none', stroke, strokeWidth, strokeDasharray }),
        // Direct series label at the line's end — identity survives without the
        // legend (colorblind/print case). Halo keeps it readable over the grid.
        endLabel && h('text', {
          x: last[0], y: last[1] - 9, textAnchor: 'end',
          fontSize: 11, fontWeight: 600, fontFamily: 'Inter,sans-serif',
          fill: stroke, stroke: cssSurface, strokeWidth: 3,
          style: { paintOrder: 'stroke', pointerEvents: 'none' }
        }, name || dataKey),
        pts.map(([cx,cy], i) => h('circle', {
          key: i, cx, cy, r: dr, fill: stroke, stroke:'none',
          onMouseMove: e => {
            const svg = e.currentTarget.ownerSVGElement.getBoundingClientRect();
            setTip({ x: e.clientX-svg.left, y: e.clientY-svg.top, idx: i, d: data[i] });
          },
          onTouchStart: e => {
            const t=e.touches&&e.touches[0]; if(!t) return;
            const svg = e.currentTarget.ownerSVGElement.getBoundingClientRect();
            setTip({ x: t.clientX-svg.left, y: t.clientY-svg.top, idx: i, d: data[i] });
          },
          onTouchMove: e => {
            const t=e.touches&&e.touches[0]; if(!t) return;
            const svg = e.currentTarget.ownerSVGElement.getBoundingClientRect();
            setTip({ x: t.clientX-svg.left, y: t.clientY-svg.top, idx: i, d: data[i] });
          },
          onMouseLeave: () => setTip(null)
        })),
        lblFmt && pts.map(([cx,cy], i) => h('text', {
          key: 'lbl'+i, x:cx, y:cy-8, textAnchor:'middle', fontSize:9,
          fontFamily:'Inter,sans-serif', fill:cssTick, pointerEvents:'none'
        }, lblFmt(Number(data[i][dataKey]) || 0)))
      );
    }

    // ── Legend items ─────────────────────────────────────────────────────────
    const legItems = [
      ...barDescs.map(d=>({ name:d.props.name||d.props.dataKey, color:d.props.fill||'#8884d8' })),
      ...lineDescs.map(d=>({ name:d.props.name||d.props.dataKey, color:d.props.stroke||'#8884d8' })),
      ...areaDescs.map(d=>({ name:d.props.name||d.props.dataKey, color:d.props.stroke||'#8884d8' })),
    ];

    // ── Tooltip ──────────────────────────────────────────────────────────────
    // Combined series list used by renderTip to look up display names
    const seriesDescs = [...barDescs, ...lineDescs, ...areaDescs];
    function renderTip() {
      if (!tip || !tipDesc) return null;
      const custom = tipDesc.props.content;
      const fmt2   = tipDesc.props.formatter;
      const cStyle = tipDesc.props.contentStyle || {};
      const base   = {
        position:'absolute', pointerEvents:'none', zIndex:20,
        left: Math.min(tip.x + 8, width - 130), top: Math.max(2, tip.y - 40),
        background:'var(--bgCard, #fff)', border:'1px solid var(--border, #ddd)', color:'var(--text, #222)', borderRadius:6,
        padding:'8px 12px', fontSize:12, fontFamily:'Inter,sans-serif',
        boxShadow:'0 2px 8px rgba(0,0,0,0.12)'
      };
      if (custom) {
        const payload = allKeys.map(k => {
          // Find the matching series descriptor to get its display name
          const desc = seriesDescs.find(d => d.props.dataKey === k);
          const displayName = desc?.props?.name || k;
          return { name: displayName, dataKey: k, value: tip.d[k] };
        });
        const el = typeof custom === 'function'
          ? h(custom, { active:true, payload, label:tip.d[xKey] })
          : React.cloneElement(custom, { active:true, payload, label:tip.d[xKey] });
        return h('div', { style:{ position:'absolute', left:Math.min(tip.x+8,width-130),
          top:Math.max(2,tip.y-40), pointerEvents:'none', zIndex:20 } }, el);
      }
      return h('div', { style: Object.assign(base, cStyle) },
        h('div', { style:{ fontWeight:600, marginBottom:4 } }, tip.d[xKey]),
        allKeys.map(k => {
          const v = tip.d[k];
          if (v === undefined) return null;
          const fv = fmt2 ? fmt2(v) : (typeof v==='number' ? v.toFixed(2) : v);
          return h('div', { key:k, style:{ color:'var(--textMid)' } }, k + ': ' + fv);
        })
      );
    }

    return h('div', { style:{ position:'relative', width:'100%', height } },
      h('svg', {
        // Use viewBox so the SVG scales with CSS — eliminates overflow
        viewBox: `0 0 ${width} ${height}`,
        width: '100%', height,
        style:{ display:'block', overflow:'visible' }
      },
        h('g', { transform: `translate(${M.left},${M.top})` },
          // Grid
          gridDesc && ytValues.map((t, i) =>
            h('line', { key:i, x1:0, y1:yv(t), x2:iW, y2:yv(t),
              stroke:cssGrid, strokeDasharray:gridDesc.props.strokeDasharray||'3 3', strokeWidth:1 })
          ),
          // Reference lines
          refLines.map((rl, i) =>
            h('line', { key:i, x1:0, y1:yv(rl.props.y||0), x2:iW, y2:yv(rl.props.y||0),
              stroke:rl.props.stroke||'#999',
              strokeDasharray:rl.props.strokeDasharray||'none', strokeWidth:1 })
          ),
          // Areas (behind bars/lines)
          areaDescs.map(d => renderLine(d, true)),
          // Bars
          ungrouped.map((d, gi) => renderBar(d, gi, uCount)),
          stacked.map((d, gi)   => renderBar(d, 0,  1)),
          // Lines
          lineDescs.map(d => renderLine(d, false)),
          // Full-height invisible hover columns: line/area dots are tiny targets,
          // so each x-index gets a plot-height hit area instead (bars keep their own).
          barDescs.length === 0 && (lineDescs.length > 0 || areaDescs.length > 0) && tipDesc &&
            data.map((d, i) => h('rect', {
              key: 'hz' + i, x: i * bw, y: 0, width: bw, height: iH,
              fill: 'transparent',
              onMouseMove: e => {
                const svg = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                setTip({ x: e.clientX-svg.left, y: e.clientY-svg.top, idx: i, d });
              },
              onTouchStart: e => {
                const t=e.touches&&e.touches[0]; if(!t) return;
                const svg = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                setTip({ x: t.clientX-svg.left, y: t.clientY-svg.top, idx: i, d });
              },
              onTouchMove: e => {
                const t=e.touches&&e.touches[0]; if(!t) return;
                const svg = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                setTip({ x: t.clientX-svg.left, y: t.clientY-svg.top, idx: i, d });
              },
              onMouseLeave: () => setTip(null)
            })),
          // X axis line + labels
          h('line', { x1:0, y1:iH, x2:iW, y2:iH, stroke:cssGrid, strokeWidth:1 }),
          data.map((d, i) => {
            if (i % xStep !== 0) return null;
            const t = xDesc?.props?.tick || {};
            return h('text', { key:i, x:xMid(i), y:iH+18, textAnchor:'middle',
              fontSize: t.fontSize || 11,
              fontFamily: t.fontFamily || 'Inter,sans-serif',
              fill: t.fill || cssTick
            }, d[xKey]);
          }),
          // Y axis labels — right-aligned in the reserved left gutter
          ytValues.map((t, i) =>
            h('text', { key:i, x:-8, y:yv(t)+3, textAnchor:'end',
              fontSize: yDesc?.props?.tick?.fontSize || 10,
              fontFamily: yDesc?.props?.tick?.fontFamily || 'IBM Plex Mono,monospace',
              fill: yDesc?.props?.tick?.fill || cssTick,
              style:{ pointerEvents:'none' }
            }, yFmt(t))
          ),
          // X axis title
          xLabelText && h('text', {
            key:'xlabel', x:iW/2, y:iH+40, textAnchor:'middle',
            fontSize:11, fontWeight:600, fontFamily:'Inter,sans-serif', fill:cssTick
          }, xLabelText)
        )
      ),
      // Tooltip overlay
      tip && tipDesc && renderTip(),
      // Legend
      legDesc && legItems.length > 0 && h('div', {
        style: Object.assign({
          display:'flex', gap:14, justifyContent:'center',
          padding:'4px 0', flexWrap:'wrap'
        }, legDesc.props.wrapperStyle)
      }, legItems.map((item, i) =>
        h('div', { key:i, style:{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontFamily:'Inter,sans-serif' } },
          h('div', { style:{ width:12, height:12, borderRadius:2, background:item.color, flexShrink:0 } }),
          h('span', null, item.name)
        )
      ))
    );
  }

  function BarChart(p)  { return h(CartesianChart, p); }
  function LineChart(p) { return h(CartesianChart, p); }
  function AreaChart(p) { return h(CartesianChart, p); }

  // ── PieChart ──────────────────────────────────────────────────────────────
  function PieChart({ width=300, height=250, children }) {
    const [tip, setTip] = useState(null);
    // SVG presentation attributes can't resolve var(); read computed theme colors
    const pcs = typeof document!=='undefined' ? getComputedStyle(document.documentElement) : null;
    const pieSurface = pcs?.getPropertyValue('--bgCard')?.trim() || '#fff';
    const pieText    = pcs?.getPropertyValue('--textMid')?.trim() || '#555';
    const arr      = Children.toArray(children);
    const pieDescs = arr.filter(c=>c.type===Pie);
    const tipDesc  = arr.find(c=>c.type===Tooltip);

    const slices = pieDescs.flatMap(desc => {
      const { data=[], dataKey, nameKey='name',
              cx='50%', cy='50%', outerRadius=80, label: lbl } = desc.props;
      const cells = Children.toArray(desc.props.children).filter(c=>c.type===Cell);
      const total = data.reduce((s,d) => s + Math.max(Number(d[dataKey])||0, 0), 0);
      if (total === 0) return [];
      const cxPx = typeof cx==='string' ? width  * parseFloat(cx)/100 : cx;
      const cyPx = typeof cy==='string' ? height * parseFloat(cy)/100 : cy;
      let angle = -Math.PI / 2;
      return data.map((d, i) => {
        const v     = Math.max(Number(d[dataKey])||0, 0);
        const sweep = (v / total) * 2 * Math.PI;
        const mid   = angle + sweep / 2;
        const x1 = cxPx + outerRadius * Math.cos(angle);
        const y1 = cyPx + outerRadius * Math.sin(angle);
        angle += sweep;
        const x2 = cxPx + outerRadius * Math.cos(angle);
        const y2 = cyPx + outerRadius * Math.sin(angle);
        const large = sweep > Math.PI ? 1 : 0;
        const path = `M${cxPx},${cyPx} L${x1.toFixed(2)},${y1.toFixed(2)} A${outerRadius},${outerRadius} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
        const fill = cells[i]?.props?.fill || '#8884d8';
        const lx = cxPx + (outerRadius + 20) * Math.cos(mid);
        const ly = cyPx + (outerRadius + 20) * Math.sin(mid);
        const pct = ((v / total) * 100).toFixed(0);
        const labelText = typeof lbl === 'function'
          ? lbl({ name:d[nameKey], percent:v/total, value:v })
          : (lbl !== false && sweep > 0.25 ? d[nameKey] + ' ' + pct + '%' : '');
        return { path, fill, name:d[nameKey], value:v, lx, ly, labelText };
      });
    });

    function renderTip() {
      if (!tip || !tipDesc) return null;
      const fmt2   = tipDesc.props.formatter;
      const cStyle = tipDesc.props.contentStyle || {};
      const fv = fmt2 ? fmt2(tip.value) : (typeof tip.value==='number' ? tip.value.toFixed(2) : tip.value);
      return h('div', { style: Object.assign({
        position:'absolute', pointerEvents:'none', zIndex:20,
        left: Math.min(tip.x+8, width-110), top: Math.max(0, tip.y-36),
        background:'var(--bgCard, #fff)', border:'1px solid var(--border, #ddd)', color:'var(--text, #222)', borderRadius:6,
        padding:'8px 12px', fontSize:12, fontFamily:'Inter,sans-serif',
        boxShadow:'0 2px 8px rgba(0,0,0,0.12)'
      }, cStyle) },
        h('div', { style:{ fontWeight:600, marginBottom:2 } }, tip.name),
        h('div', { style:{ color:'var(--textMid)' } }, fv)
      );
    }

    return h('div', { style:{ position:'relative', width:'100%', height } },
      h('svg', {
        viewBox: `0 0 ${width} ${height}`,
        width:'100%', height,
        style:{ display:'block' }
      },
        slices.map((s, i) => h(React.Fragment, { key:i },
          h('path', { d:s.path, fill:s.fill, stroke:pieSurface, strokeWidth:1.5,
            onMouseMove: e => {
              const r = e.currentTarget.ownerSVGElement.getBoundingClientRect();
              setTip({ x:e.clientX-r.left, y:e.clientY-r.top, name:s.name, value:s.value });
            },
            onTouchStart: e => {
              const t=e.touches&&e.touches[0]; if(!t) return;
              const r = e.currentTarget.ownerSVGElement.getBoundingClientRect();
              setTip({ x:t.clientX-r.left, y:t.clientY-r.top, name:s.name, value:s.value });
            },
            onTouchMove: e => {
              const t=e.touches&&e.touches[0]; if(!t) return;
              const r = e.currentTarget.ownerSVGElement.getBoundingClientRect();
              setTip({ x:t.clientX-r.left, y:t.clientY-r.top, name:s.name, value:s.value });
            },
            onMouseLeave: () => setTip(null)
          }),
          s.labelText && h('text', {
            x:s.lx, y:s.ly,
            textAnchor: s.lx > width/2 ? 'start' : 'end',
            fontSize:11, fontFamily:'Inter,sans-serif', fill:pieText,
            dominantBaseline:'middle', pointerEvents:'none'
          }, s.labelText)
        ))
      ),
      tip && tipDesc && renderTip()
    );
  }

  return {
    ResponsiveContainer, BarChart, LineChart, AreaChart, PieChart,
    Bar, Line, Area, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
  };
})();
