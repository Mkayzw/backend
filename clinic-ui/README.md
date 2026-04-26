# Clinic UI Prototype

A React-based medical dashboard interface for viewing patient monitoring data. This prototype integrates with a FastAPI backend to display real-time statistics, patient risk levels, trend analysis, and clinical data visualizations.

## Features

- **Authentication**: JWT-based login system
- **Dashboard**: Real-time patient statistics and metrics
- **Patient Monitoring**: Prioritized patient list with risk levels and trends
- **Data Visualization**: Interactive charts using Recharts
- **Medical Theme**: Clean, professional healthcare aesthetic

## Technology Stack

- **React 18+**: Functional components with hooks
- **Vite**: Fast development build tool
- **Recharts**: Data visualization library
- **Plain CSS**: No frameworks, just standard CSS files
- **Fetch API**: Native browser HTTP client

## Prerequisites

Before running this application, ensure you have:

1. **Node.js** (version 16 or higher)
2. **npm** (comes with Node.js)
3. **Backend API** running on `http://localhost:8000`

### Backend Requirements

This UI requires the FastAPI backend to be running. The backend provides:

- Authentication endpoints (`/auth/login`, `/auth/me`)
- Dashboard data endpoints (`/api/dashboard/stats`, `/api/dashboard/prioritized-patients`)
- Patient trend data endpoints (`/api/dashboard/patient/{id}/trend`)

**To start the backend:**

```bash
# Navigate to the backend directory
cd ..

# Activate virtual environment (if using one)
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Run the FastAPI server
uvicorn main:app --reload
```

The backend should be accessible at `http://localhost:8000`. You can verify it's running by visiting `http://localhost:8000/docs` in your browser.

## Setup Instructions

1. **Clone or navigate to the project directory**

   ```bash
   cd clinic-ui
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the `.env.example` file to `.env`:

   ```bash
   # On Windows (PowerShell):
   Copy-Item .env.example .env

   # On macOS/Linux:
   cp .env.example .env
   ```

   The default configuration points to `http://localhost:8000`. If your backend runs on a different URL, update the `.env` file:

   ```
   VITE_API_URL=http://your-backend-url:port
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

   The application will open at `http://localhost:5173` (or another port if 5173 is in use).

## Development

### Project Structure

```
clinic-ui/
├── public/              # Static assets
├── src/
│   ├── api/            # API client and backend integration
│   ├── components/     # React components
│   ├── styles/         # CSS files
│   ├── App.jsx         # Main application component
│   └── main.jsx        # Application entry point
├── .env                # Environment configuration (not in git)
├── .env.example        # Environment template
└── package.json        # Dependencies and scripts
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Create production build
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality

### Test Credentials

Use these credentials to log in (assuming default seed data in backend):

- **Clinician Account**:
  - Email: `clinician@example.com`
  - Password: `password123`

- **Admin Account**:
  - Email: `admin@example.com`
  - Password: `password123`

## Troubleshooting

### Backend Connection Issues

If you see "Unable to connect to server" errors:

1. Verify the backend is running: `http://localhost:8000/docs`
2. Check the `.env` file has the correct `VITE_API_URL`
3. Ensure no firewall is blocking port 8000
4. Check browser console for CORS errors

### CORS Errors

If you encounter CORS errors, ensure the backend's CORS configuration allows `http://localhost:5173`:

```python
# In backend main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Port Already in Use

If port 5173 is already in use, Vite will automatically try the next available port. Check the terminal output for the actual URL.

## Building for Production

To create a production build:

```bash
npm run build
```

The optimized files will be in the `dist/` folder. You can serve them with any static file server.

To preview the production build locally:

```bash
npm run preview
```

## Design Philosophy

This prototype prioritizes:

- **Simplicity**: Plain CSS, functional components, minimal dependencies
- **Readability**: Clear code structure, descriptive names, helpful comments
- **Real Integration**: Actual backend data, not mock data
- **Visual Polish**: Professional medical aesthetic suitable for demonstrations

## Future Enhancements

Potential improvements for future iterations:

- React Router for proper routing
- Token refresh mechanism
- Comprehensive error boundaries
- Loading skeletons for better UX
- Accessibility features (ARIA labels, keyboard navigation)
- Mobile-responsive design
- Dark mode toggle
- Real-time updates with WebSockets
- Unit and E2E tests

## License

This is a prototype project for demonstration purposes.
