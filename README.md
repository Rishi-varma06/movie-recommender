# CineGraph — Movie Recommender

A graph-powered movie recommendation engine built with **Neo4j**, **Express.js**, and vanilla **HTML/CSS/JS**.

> Submitted as part of **CSE4004 — Web Technologies**, VIT-AP University.

## Features

- 🎬 Browse 12 curated movies with ratings, genres, and cast info
- 🔍 Live search powered by Neo4j Cypher queries
- 🎯 Graph-based recommendations (shared genres × 3 + shared actors × 5)
- 📊 Interactive graph visualization (Canvas API)
- 🧬 Real Cypher query display — see the actual database queries

## Tech Stack

| Layer     | Technology               |
|-----------|--------------------------|
| Frontend  | HTML5, CSS3, JavaScript  |
| Backend   | Node.js, Express.js      |
| Database  | Neo4j (Graph Database)   |
| Hosting   | Vercel                   |

## Neo4j Graph Schema

```
(:Movie {title, year, rating, emoji, description})
  -[:HAS_GENRE]-> (:Genre {name})
  -[:FEATURES]->  (:Actor {name, initials})
```

## Setup (Local)

```bash
# Install dependencies
npm install

# Configure Neo4j credentials
cp .env.example .env
# Edit .env with your Neo4j URI, username, password

# Seed the database
npm run seed

# Start the server
npm start
# Open http://localhost:3000
```

## API Endpoints

| Method | Endpoint                        | Description                     |
|--------|----------------------------------|---------------------------------|
| GET    | `/api/genres`                   | All genres                      |
| GET    | `/api/movies`                   | All movies (optional `?genre=`) |
| GET    | `/api/movies/:id`               | Single movie details            |
| GET    | `/api/movies/:id/recommendations` | Graph-traversal recommendations |
| GET    | `/api/search?q=term`            | Search movies by title/genre    |
