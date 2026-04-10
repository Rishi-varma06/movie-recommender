// ═══════════════════════════════════════════════════════════════════════════
// CineGraph — Graph Canvas Visualization
// ═══════════════════════════════════════════════════════════════════════════

const GraphView = (() => {
  let canvas, ctx;
  let nodes = [], edges = [], animFrame;

  function init() {
    canvas = document.getElementById('graphCanvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', () => resize());
  }

  function resize() {
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
  }

  // Draw the graph for a focused movie, or all movies if null
  function draw(focusMovie, allMovies, allGenres) {
    cancelAnimationFrame(animFrame);
    nodes = []; edges = [];
    const W = canvas.width, H = canvas.height;

    if (!focusMovie) {
      // Show all movies in a radial layout
      const count = allMovies.length;
      allMovies.forEach((m, i) => {
        const angle = (i / count) * Math.PI * 2;
        const r = Math.min(W, H) * 0.35;
        nodes.push({
          label: m.title.slice(0, 14),
          x: W/2 + Math.cos(angle) * r,
          y: H/2 + Math.sin(angle) * r,
          color: '#c9a84c', r: 22, type: 'movie'
        });
      });

      // Genre nodes in center ring
      const uniqueGenres = allGenres.length ? allGenres : [...new Set(allMovies.flatMap(m => m.genres))];
      uniqueGenres.forEach((g, i) => {
        const gName = typeof g === 'string' ? g : g.name;
        const angle = (i / uniqueGenres.length) * Math.PI * 2 + 0.3;
        const r = Math.min(W, H) * 0.15;
        const genreIdx = nodes.length;
        nodes.push({
          label: gName,
          x: W/2 + Math.cos(angle) * r,
          y: H/2 + Math.sin(angle) * r,
          color: '#1d9e75', r: 16, type: 'genre'
        });
        // Connect movies that have this genre
        allMovies.forEach((m, mi) => {
          if (m.genres.includes(gName)) {
            edges.push({ from: mi, to: genreIdx });
          }
        });
      });
    } else {
      // Focus on selected movie and its connections
      const cx = W / 2, cy = H / 2;
      nodes.push({
        label: focusMovie.title.slice(0, 14),
        x: cx, y: cy,
        color: '#c9a84c', r: 30, type: 'movie'
      });

      // Genre connections
      focusMovie.genres.forEach((gName, i) => {
        const angle = (i / focusMovie.genres.length) * Math.PI * 2 - Math.PI / 2;
        const rx = 160, ry = 100;
        nodes.push({
          label: gName,
          x: cx + Math.cos(angle) * rx,
          y: cy + Math.sin(angle) * ry,
          color: '#1d9e75', r: 20, type: 'genre'
        });
        edges.push({ from: 0, to: nodes.length - 1, label: 'HAS_GENRE' });
      });

      // Actor connections
      const actorList = focusMovie.actors || [];
      actorList.slice(0, 5).forEach((actor, i) => {
        const name = typeof actor === 'string' ? actor : actor.name;
        const shortName = name.split(' ').pop() || name;
        const angle = (i / 5) * Math.PI + Math.PI / 2;
        const rx = 200, ry = 130;
        nodes.push({
          label: shortName,
          x: cx + Math.cos(angle) * rx,
          y: cy + Math.sin(angle) * ry,
          color: '#378add', r: 18, type: 'actor'
        });
        edges.push({ from: 0, to: nodes.length - 1, label: 'FEATURES' });
      });

      // Similar movie connections (if recs are stored on the movie)
      if (focusMovie._recs) {
        focusMovie._recs.slice(0, 4).forEach((rec, i) => {
          const angle = (i / focusMovie._recs.length) * Math.PI * 2 + Math.PI / 4;
          const r = Math.min(W, H) * 0.38;
          nodes.push({
            label: rec.title.slice(0, 12),
            x: cx + Math.cos(angle) * r,
            y: cy + Math.sin(angle) * r,
            color: 'rgba(201,168,76,0.5)', r: 18, type: 'rec'
          });
          edges.push({ from: 0, to: nodes.length - 1, label: 'SIMILAR' });
        });
      }
    }

    // Animation loop
    let t = 0;
    function render() {
      ctx.clearRect(0, 0, W, H);
      t += 0.01;

      // Draw edges
      edges.forEach(e => {
        const a = nodes[e.from], b = nodes[e.to];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (e.label) {
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          ctx.fillStyle = 'rgba(201,168,76,0.5)';
          ctx.font = '9px DM Sans';
          ctx.textAlign = 'center';
          ctx.fillText(e.label, mx, my);
        }
      });

      // Draw nodes
      nodes.forEach((n, i) => {
        const pulse = n.type === 'movie' ? Math.sin(t + i) * 2 : 0;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + pulse, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = `${n.type === 'movie' ? '10' : '9'}px DM Sans`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label, n.x, n.y);
      });

      animFrame = requestAnimationFrame(render);
    }
    render();
  }

  return { init, draw, resize };
})();
