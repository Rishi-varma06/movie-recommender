// ─────────────────────────────────────────────────────────────────────────────
// CineGraph — Express + Neo4j Backend
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend
app.use(express.static(path.join(__dirname, '../public')));

// ─── Neo4j Connection ─────────────────────────────────────────────────────────
let driver;
try {
  driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || '')
  );
  
  // Verify connectivity on startup
  driver.verifyConnectivity()
    .then(() => console.log('✔  Connected to Neo4j'))
    .catch(err => {
      console.error('✘  Neo4j connection failed:', err.message);
    });
} catch (e) {
  console.error("Failed to initialize Neo4j driver. Check environment variables.", e);
}

// Helper: run a Cypher query and return records
async function runQuery(cypher, params = {}) {
  const session = driver.session();
  try {
    const result = await session.run(cypher, params);
    return result.records;
  } finally {
    await session.close();
  }
}

// Helper: convert Neo4j Integer to JS number
function toNum(val) {
  if (neo4j.isInt(val)) return val.toNumber();
  return val;
}

// ─── API: GET /api/genres ─────────────────────────────────────────────────────
app.get('/api/genres', async (req, res) => {
  try {
    const records = await runQuery(`
      MATCH (g:Genre)
      RETURN g.name AS name, id(g) AS id
      ORDER BY g.name
    `);
    const genres = records.map(r => ({
      id: toNum(r.get('id')),
      name: r.get('name')
    }));
    res.json(genres);
  } catch (err) {
    console.error('GET /api/genres error:', err.message);
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
});

// ─── API: GET /api/movies ─────────────────────────────────────────────────────
// Optional query param: ?genre=Sci-Fi
app.get('/api/movies', async (req, res) => {
  try {
    const genreFilter = req.query.genre;
    let cypher, params = {};

    if (genreFilter) {
      cypher = `
        MATCH (m:Movie)-[:HAS_GENRE]->(g:Genre {name: $genre})
        WITH m
        MATCH (m)-[:HAS_GENRE]->(allG:Genre)
        OPTIONAL MATCH (m)-[:FEATURES]->(a:Actor)
        RETURN id(m) AS id, m.title AS title, m.year AS year, m.rating AS rating,
               m.emoji AS emoji, m.description AS description,
               collect(DISTINCT allG.name) AS genres,
               collect(DISTINCT {name: a.name, initials: a.initials, id: id(a)}) AS actors
        ORDER BY m.rating DESC
      `;
      params = { genre: genreFilter };
    } else {
      cypher = `
        MATCH (m:Movie)
        OPTIONAL MATCH (m)-[:HAS_GENRE]->(g:Genre)
        OPTIONAL MATCH (m)-[:FEATURES]->(a:Actor)
        RETURN id(m) AS id, m.title AS title, m.year AS year, m.rating AS rating,
               m.emoji AS emoji, m.description AS description,
               collect(DISTINCT g.name) AS genres,
               collect(DISTINCT {name: a.name, initials: a.initials, id: id(a)}) AS actors
        ORDER BY m.rating DESC
      `;
    }

    const records = await runQuery(cypher, params);
    const movies = records.map(r => ({
      id: toNum(r.get('id')),
      title: r.get('title'),
      year: toNum(r.get('year')),
      rating: r.get('rating'),
      emoji: r.get('emoji'),
      description: r.get('description'),
      genres: r.get('genres'),
      actors: r.get('actors').filter(a => a.name !== null).map(a => ({
        ...a,
        id: toNum(a.id)
      }))
    }));
    res.json(movies);
  } catch (err) {
    console.error('GET /api/movies error:', err.message);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// ─── API: GET /api/movies/:id ─────────────────────────────────────────────────
app.get('/api/movies/:id', async (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    const records = await runQuery(`
      MATCH (m:Movie) WHERE id(m) = $id
      OPTIONAL MATCH (m)-[:HAS_GENRE]->(g:Genre)
      OPTIONAL MATCH (m)-[:FEATURES]->(a:Actor)
      RETURN id(m) AS id, m.title AS title, m.year AS year, m.rating AS rating,
             m.emoji AS emoji, m.description AS description,
             collect(DISTINCT g.name) AS genres,
             collect(DISTINCT {name: a.name, initials: a.initials, id: id(a)}) AS actors
    `, { id: neo4j.int(movieId) });

    if (records.length === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const r = records[0];
    res.json({
      id: toNum(r.get('id')),
      title: r.get('title'),
      year: toNum(r.get('year')),
      rating: r.get('rating'),
      emoji: r.get('emoji'),
      description: r.get('description'),
      genres: r.get('genres'),
      actors: r.get('actors').filter(a => a.name !== null).map(a => ({
        ...a,
        id: toNum(a.id)
      }))
    });
  } catch (err) {
    console.error('GET /api/movies/:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch movie' });
  }
});

// ─── API: GET /api/movies/:id/recommendations ─────────────────────────────────
app.get('/api/movies/:id/recommendations', async (req, res) => {
  try {
    const movieId = parseInt(req.params.id);

    // Graph traversal: find movies that share genres or actors
    const records = await runQuery(`
      MATCH (m:Movie) WHERE id(m) = $id

      // Find movies sharing genres
      OPTIONAL MATCH (m)-[:HAS_GENRE]->(g:Genre)<-[:HAS_GENRE]-(rec:Movie)
      WHERE rec <> m
      WITH m, rec, collect(DISTINCT g.name) AS sharedGenres

      // Find movies sharing actors
      OPTIONAL MATCH (m)-[:FEATURES]->(a:Actor)<-[:FEATURES]-(rec)
      WITH rec, sharedGenres, collect(DISTINCT a.name) AS sharedActors

      // Calculate recommendation score
      WITH rec,
           sharedGenres,
           sharedActors,
           size(sharedGenres) * 3 + size(sharedActors) * 5 AS score

      WHERE score > 0

      // Get full details of recommended movie
      OPTIONAL MATCH (rec)-[:HAS_GENRE]->(rg:Genre)
      RETURN id(rec) AS id, rec.title AS title, rec.year AS year,
             rec.rating AS rating, rec.emoji AS emoji,
             collect(DISTINCT rg.name) AS genres,
             sharedGenres, sharedActors, score,
             CASE
               WHEN size(sharedActors) > 0 THEN 'Same actor'
               ELSE apoc.text.join(sharedGenres, ' · ')
             END AS reason
      ORDER BY score DESC
      LIMIT 6
    `, { id: neo4j.int(movieId) });

    const recommendations = records.map(r => ({
      id: toNum(r.get('id')),
      title: r.get('title'),
      year: toNum(r.get('year')),
      rating: r.get('rating'),
      emoji: r.get('emoji'),
      genres: r.get('genres'),
      score: toNum(r.get('score')),
      reason: r.get('reason'),
      sharedGenres: r.get('sharedGenres'),
      sharedActors: r.get('sharedActors')
    }));

    res.json(recommendations);
  } catch (err) {
    // Fallback: if apoc is not available, use a simpler query
    if (err.message.includes('apoc')) {
      try {
        const movieId = parseInt(req.params.id);
        const records = await runQuery(`
          MATCH (m:Movie) WHERE id(m) = $id
          OPTIONAL MATCH (m)-[:HAS_GENRE]->(g:Genre)<-[:HAS_GENRE]-(rec:Movie)
          WHERE rec <> m
          WITH m, rec, collect(DISTINCT g.name) AS sharedGenres
          OPTIONAL MATCH (m)-[:FEATURES]->(a:Actor)<-[:FEATURES]-(rec)
          WITH rec, sharedGenres, collect(DISTINCT a.name) AS sharedActors
          WITH rec, sharedGenres, sharedActors,
               size(sharedGenres) * 3 + size(sharedActors) * 5 AS score
          WHERE score > 0
          OPTIONAL MATCH (rec)-[:HAS_GENRE]->(rg:Genre)
          RETURN id(rec) AS id, rec.title AS title, rec.year AS year,
                 rec.rating AS rating, rec.emoji AS emoji,
                 collect(DISTINCT rg.name) AS genres,
                 sharedGenres, sharedActors, score
          ORDER BY score DESC
          LIMIT 6
        `, { id: neo4j.int(movieId) });

        const recommendations = records.map(r => {
          const sharedActors = r.get('sharedActors');
          const sharedGenres = r.get('sharedGenres');
          return {
            id: toNum(r.get('id')),
            title: r.get('title'),
            year: toNum(r.get('year')),
            rating: r.get('rating'),
            emoji: r.get('emoji'),
            genres: r.get('genres'),
            score: toNum(r.get('score')),
            reason: sharedActors.length > 0 ? 'Same actor' : sharedGenres.join(' · '),
            sharedGenres,
            sharedActors
          };
        });

        res.json(recommendations);
      } catch (fallbackErr) {
        console.error('GET /api/movies/:id/recommendations fallback error:', fallbackErr.message);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
      }
    } else {
      console.error('GET /api/movies/:id/recommendations error:', err.message);
      res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  }
});

// ─── API: GET /api/search?q=term ──────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query.trim()) return res.json([]);

    const records = await runQuery(`
      MATCH (m:Movie)
      OPTIONAL MATCH (m)-[:HAS_GENRE]->(g:Genre)
      WITH m, collect(g.name) AS genres
      WHERE toLower(m.title) CONTAINS toLower($query)
         OR ANY(genre IN genres WHERE toLower(genre) CONTAINS toLower($query))
      RETURN id(m) AS id, m.title AS title, m.year AS year,
             m.rating AS rating, m.emoji AS emoji, genres
      ORDER BY m.rating DESC
      LIMIT 10
    `, { query });

    const results = records.map(r => ({
      id: toNum(r.get('id')),
      title: r.get('title'),
      year: toNum(r.get('year')),
      rating: r.get('rating'),
      emoji: r.get('emoji'),
      genres: r.get('genres')
    }));
    res.json(results);
  } catch (err) {
    console.error('GET /api/search error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ─── Fallback: serve index.html for all other routes ──────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// ─── Start Server (Local only) or Export (Vercel) ───────────────────────────
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n  ✦ CineGraph server running at http://localhost:${PORT}\n`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await driver.close();
  process.exit(0);
});

module.exports = app;
