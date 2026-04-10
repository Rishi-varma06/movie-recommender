// ─────────────────────────────────────────────────────────────────────────────
// CineGraph — Neo4j Database Seeder
// Populates the database with movies, genres, actors and relationships
// Run: npm run seed
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// ─── Seed Data ────────────────────────────────────────────────────────────────
const genres = [
  'Sci-Fi', 'Action', 'Thriller', 'Drama', 'Music', 'Romance', 'Horror'
];

const actors = [
  { name: 'Leonardo DiCaprio', initials: 'LD' },
  { name: 'Joseph Gordon-Levitt', initials: 'JG' },
  { name: 'Elliot Page', initials: 'EP' },
  { name: 'Heath Ledger', initials: 'HL' },
  { name: 'Aaron Eckhart', initials: 'AE' },
  { name: 'Anne Hathaway', initials: 'AH' },
  { name: 'Jessica Chastain', initials: 'JC' },
  { name: 'Keanu Reeves', initials: 'KR' },
  { name: 'Carrie-Anne Moss', initials: 'CM' },
  { name: 'Song Kang-ho', initials: 'SK' },
  { name: 'Lee Sun-kyun', initials: 'LS' },
  { name: 'John Travolta', initials: 'JT' },
  { name: 'Samuel L. Jackson', initials: 'SJ' },
  { name: 'Uma Thurman', initials: 'UT' },
  { name: 'Tim Robbins', initials: 'TR' },
  { name: 'Morgan Freeman', initials: 'MF' },
  { name: 'Miles Teller', initials: 'MT' },
  { name: 'J.K. Simmons', initials: 'JS' },
  { name: 'Ryan Gosling', initials: 'RG' },
  { name: 'Emma Stone', initials: 'ES' },
  { name: 'Daniel Kaluuya', initials: 'DK' },
  { name: 'Tom Hardy', initials: 'TH' },
  { name: 'Charlize Theron', initials: 'CT' },
];

const movies = [
  {
    title: 'Inception', year: 2010, rating: 8.8, emoji: '🌀',
    description: "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into a target's mind.",
    genres: ['Sci-Fi', 'Thriller'],
    actors: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page']
  },
  {
    title: 'The Dark Knight', year: 2008, rating: 9.0, emoji: '🦇',
    description: 'When the menace known as the Joker wreaks havoc on Gotham City, Batman must accept one of the greatest psychological and physical tests.',
    genres: ['Action', 'Thriller'],
    actors: ['Leonardo DiCaprio', 'Heath Ledger', 'Aaron Eckhart']
  },
  {
    title: 'Interstellar', year: 2014, rating: 8.6, emoji: '🌌',
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival across an interstellar journey.",
    genres: ['Sci-Fi', 'Thriller'],
    actors: ['Leonardo DiCaprio', 'Anne Hathaway', 'Jessica Chastain']
  },
  {
    title: 'The Matrix', year: 1999, rating: 8.7, emoji: '💊',
    description: 'When a beautiful stranger leads a computer hacker to the underground world, he discovers the shocking truth about reality.',
    genres: ['Sci-Fi', 'Action', 'Thriller'],
    actors: ['Keanu Reeves', 'Carrie-Anne Moss']
  },
  {
    title: 'Parasite', year: 2019, rating: 8.5, emoji: '🏚️',
    description: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
    genres: ['Drama', 'Thriller'],
    actors: ['Song Kang-ho', 'Lee Sun-kyun']
  },
  {
    title: 'Pulp Fiction', year: 1994, rating: 8.9, emoji: '💼',
    description: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
    genres: ['Drama', 'Action'],
    actors: ['John Travolta', 'Samuel L. Jackson', 'Uma Thurman']
  },
  {
    title: 'The Shawshank Redemption', year: 1994, rating: 9.3, emoji: '🔑',
    description: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    genres: ['Drama'],
    actors: ['Tim Robbins', 'Morgan Freeman']
  },
  {
    title: 'Whiplash', year: 2014, rating: 8.5, emoji: '🥁',
    description: "A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are challenged by an abusive instructor.",
    genres: ['Drama', 'Music'],
    actors: ['Miles Teller', 'J.K. Simmons']
  },
  {
    title: 'Blade Runner 2049', year: 2017, rating: 8.0, emoji: '🤖',
    description: "A young blade runner's discovery of a long-buried secret leads him to track down former blade runner Rick Deckard.",
    genres: ['Sci-Fi', 'Thriller'],
    actors: ['Ryan Gosling', 'Anne Hathaway']
  },
  {
    title: 'La La Land', year: 2016, rating: 8.0, emoji: '🎵',
    description: 'While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations.',
    genres: ['Music', 'Romance'],
    actors: ['Ryan Gosling', 'Emma Stone']
  },
  {
    title: 'Get Out', year: 2017, rating: 7.7, emoji: '👁️',
    description: "A young African-American visits his white girlfriend's parents for the weekend, where his simmering uneasiness escalates to a dread-filled discovery.",
    genres: ['Horror', 'Thriller'],
    actors: ['Daniel Kaluuya']
  },
  {
    title: 'Mad Max: Fury Road', year: 2015, rating: 8.1, emoji: '🔥',
    description: 'In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search of her homeland with the aid of a group of female prisoners.',
    genres: ['Action', 'Sci-Fi'],
    actors: ['Tom Hardy', 'Charlize Theron']
  },
];

// ─── Seed Function ────────────────────────────────────────────────────────────
async function seed() {
  const session = driver.session();

  try {
    console.log('\n  ✦ CineGraph Database Seeder');
    console.log('  ──────────────────────────\n');

    // Step 1: Clear existing data
    console.log('  ◈ Clearing existing data...');
    await session.run('MATCH (n) DETACH DELETE n');

    // Step 2: Create genre nodes
    console.log('  ◈ Creating Genre nodes...');
    for (const name of genres) {
      await session.run('CREATE (:Genre {name: $name})', { name });
    }
    console.log(`    ✔ ${genres.length} genres created`);

    // Step 3: Create actor nodes
    console.log('  ◈ Creating Actor nodes...');
    for (const actor of actors) {
      await session.run(
        'CREATE (:Actor {name: $name, initials: $initials})',
        { name: actor.name, initials: actor.initials }
      );
    }
    console.log(`    ✔ ${actors.length} actors created`);

    // Step 4: Create movie nodes with relationships
    console.log('  ◈ Creating Movie nodes + relationships...');
    for (const movie of movies) {
      // Create the movie node
      const result = await session.run(`
        CREATE (m:Movie {
          title: $title,
          year: $year,
          rating: $rating,
          emoji: $emoji,
          description: $description
        })
        RETURN id(m) AS movieId
      `, {
        title: movie.title,
        year: neo4j.int(movie.year),
        rating: movie.rating,
        emoji: movie.emoji,
        description: movie.description
      });

      // Link to genres
      for (const genreName of movie.genres) {
        await session.run(`
          MATCH (m:Movie {title: $title})
          MATCH (g:Genre {name: $genre})
          CREATE (m)-[:HAS_GENRE]->(g)
        `, { title: movie.title, genre: genreName });
      }

      // Link to actors
      for (const actorName of movie.actors) {
        await session.run(`
          MATCH (m:Movie {title: $title})
          MATCH (a:Actor {name: $actor})
          CREATE (m)-[:FEATURES]->(a)
        `, { title: movie.title, actor: actorName });
      }
    }
    console.log(`    ✔ ${movies.length} movies created with relationships`);

    // Step 5: Verify
    const countResult = await session.run(`
      MATCH (m:Movie) WITH count(m) AS movies
      MATCH (g:Genre) WITH movies, count(g) AS genres
      MATCH (a:Actor) WITH movies, genres, count(a) AS actors
      RETURN movies, genres, actors
    `);
    const counts = countResult.records[0];
    console.log(`\n  ────────────────────────────`);
    console.log(`  ✔ Database seeded successfully!`);
    console.log(`    Movies: ${counts.get('movies')}`);
    console.log(`    Genres: ${counts.get('genres')}`);
    console.log(`    Actors: ${counts.get('actors')}`);

    // Show a sample Cypher query
    console.log(`\n  ◈ Sample query — try in Neo4j Browser:`);
    console.log(`    MATCH (m:Movie)-[:HAS_GENRE]->(g:Genre)`);
    console.log(`    RETURN m.title, collect(g.name) AS genres`);
    console.log(`    ORDER BY m.rating DESC\n`);

  } catch (err) {
    console.error('  ✘ Seed failed:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

seed();
