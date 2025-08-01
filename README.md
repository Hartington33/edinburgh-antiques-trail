# Edinburgh Antiques Trail Digital Guide

A comprehensive Next.js application for managing and exploring antique-related establishments throughout Edinburgh, from the historic Old Town to the City Bypass area.

## Features

- **Interactive Map**: Explore all locations with Google Maps integration
- **Comprehensive Database**: Store details for antique shops, auction houses, book shops, record shops, vintage clothing, and antique fairs
- **Filtering & Search**: Filter establishments by category, neighborhood, or search by keywords
- **Full CRUD Operations**: Create, read, update, and delete all entities
- **Mobile Responsive**: Clean, responsive design that works on desktop and mobile devices
- **Dashboard**: Statistics and quick actions

## Tech Stack

- **Framework**: Next.js 13+ with App Router
- **Language**: TypeScript
- **Database**: SQLite with better-sqlite3
- **Styling**: Tailwind CSS
- **Maps**: Google Maps API (@react-google-maps/api)
- **Forms**: React Hook Form for form management

## Setup Instructions

### Prerequisites

- Node.js (v16+)
- npm or yarn package manager
- Windows 11 OS

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd edinburgh-antiques-trail
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create the data directory for SQLite database:
   ```
   mkdir data
   ```

4. Initialize and seed the database:
   ```
   npm run seed
   ```

5. Start the development server:
   ```
   npm run dev
   ```

6. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Google Maps API Key

The application uses the Google Maps API for map integration. The API key is already included in the code for demonstration purposes:

```
AIzaSyAQ0N-wuHgiYSgdufORprdn2H1GoGJ-vdY
```

In a production environment, you would want to store this in an environment variable.

## Application Structure

- `/src/app`: Next.js 13 App Router pages and API routes
- `/src/components`: Reusable React components
- `/src/lib`: Database utilities and helper functions
- `/public`: Static assets
- `/data`: Directory for SQLite database (created at runtime)

## Database Schema

### Tables

- **neighborhoods**: Edinburgh areas (Old Town, New Town, etc.)
- **place_types**: Categories of establishments (Antique Shop, Auction House, etc.)
- **places**: Main table for all establishments with foreign keys to the above tables

### Schema Details

```sql
-- Neighborhoods Table
CREATE TABLE neighborhoods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Place Types Table
CREATE TABLE place_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Places Table
CREATE TABLE places (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  website TEXT,
  description TEXT,
  specialties TEXT,
  opening_hours TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  type_id INTEGER NOT NULL,
  neighborhood_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (type_id) REFERENCES place_types(id),
  FOREIGN KEY (neighborhood_id) REFERENCES neighborhoods(id)
);
```

## API Endpoints

### Places

- GET `/api/places`: List all places
- GET `/api/places?id=1`: Get a specific place
- POST `/api/places`: Create a new place
- PUT `/api/places?id=1`: Update a place
- DELETE `/api/places?id=1`: Delete a place

### Neighborhoods

- GET `/api/neighborhoods`: List all neighborhoods
- GET `/api/neighborhoods?id=1`: Get a specific neighborhood
- POST `/api/neighborhoods`: Create a new neighborhood
- PUT `/api/neighborhoods?id=1`: Update a neighborhood
- DELETE `/api/neighborhoods?id=1`: Delete a neighborhood

### Place Types

- GET `/api/place-types`: List all place types
- GET `/api/place-types?id=1`: Get a specific place type
- POST `/api/place-types`: Create a new place type
- PUT `/api/place-types?id=1`: Update a place type
- DELETE `/api/place-types?id=1`: Delete a place type

## Sample Data

The application comes pre-loaded with sample data including:

- 10 Edinburgh neighborhoods (Old Town, New Town, Stockbridge, etc.)
- 6 place types (Antique Shop, Auction House, Book Shop, etc.)
- 12+ sample establishments across Edinburgh

## Additional Information

This application is designed to be easily set up and used by individuals with limited technical experience. The SQLite database ensures no complex database setup is required, while still providing robust data storage.

## Development

For development purposes:

- Run `npm run dev` for hot-reload development
- Run `npm run build` to create a production build
- Run `npm run start` to start the production server

## License

This project is licensed under the MIT License.

---

Created for the Edinburgh Antiques Trail Digital Guide project.
