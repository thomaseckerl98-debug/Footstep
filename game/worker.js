// Zeichnet die große Landschaft im Hintergrund, damit die Seite nicht ruckelt.
import { renderWorld } from './world.js?v=4';
self.onmessage = (e) => {
  const { time, season, id } = e.data;
  try {
    const t0 = performance.now();
    const res = renderWorld(time, season);
    const bufs = [res.back.buffer, res.mid.buffer, res.roads.buffer, res.front.buffer];
    self.postMessage({ id, ok: true, ms: Math.round(performance.now() - t0), pal: res.pal, back: res.back, mid: res.mid, roads: res.roads, front: res.front }, bufs);
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.stack || err) });
  }
};
