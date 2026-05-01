# React Basics & Project Flow

This document explains the fundamental concepts of React and maps out exactly how the frontend files in your project are connected and data flows between them.

## 1. How React Works (The Basics)

React is a JavaScript library for building user interfaces. Its core principles are:

*   **Components**: React applications are built from isolated pieces of UI called components (e.g., `Sidebar.jsx`, `AlertCard.jsx`). Components can contain their own logic and styling.
*   **Virtual DOM**: Instead of directly manipulating the browser's Document Object Model (DOM) which is slow, React keeps a lightweight representation of the UI in memory (the Virtual DOM). When data changes, React compares the old Virtual DOM with the new one and efficiently updates only the parts of the real DOM that actually changed.
*   **State & Props**:
    *   **State**: Internal memory of a component (e.g., whether a modal is open).
    *   **Props**: Data passed down from a parent component to a child component.
*   **Reactivity**: When a component's state or props change, React automatically re-renders that component to reflect the new data.

---

## 2. Your Application's Flow

Based on your project structure (Vite + React), here is the step-by-step flow from the moment a user accesses your app:

### Step 1: The Entry Point (`frontend/index.html`)
This is the only actual HTML file the browser loads. Look inside, and you'll find a single empty div: `<div id="root"></div>`. It also has a `<script>` tag pointing to `main.jsx`.

### Step 2: The Mounter (`frontend/src/main.jsx`)
This file is the bridge between the HTML and your React code.
*   It grabs the `<div id="root"></div>` from the HTML.
*   It injects the top-level React component (`<App />`) into that div using `ReactDOM.createRoot`.

### Step 3: The Application Shell (`frontend/src/App.jsx`)
This is the overarching container for your app. It typically handles:
*   **Routing**: Deciding which page to show based on the URL (e.g., `/login` shows `LoginPage`, `/dashboard` shows a specific dashboard).
*   **Providers/ContextWrappers**: Wrapping the app in global state providers like your `AuthContext`.

### Step 4: Authentication & Global State (`frontend/src/context/AuthContext.jsx`)
Context allows you to share data across the entire app without passing it down manually through every component.
*   `AuthContext.jsx` likely tracks who is logged in and their role.
*   Special wrapping components like `ProtectedRoute.jsx` check this context. If a user isn't logged in, they are redirected to `LoginPage.jsx` instead of a protected page.

### Step 5: Pages (`frontend/src/pages/`)
These act as the main "views" for different routes.
*   Depending on the user's role, they are shown specialized features (`admin/`, `clinician/`, `patient/`).
*   Pages act as conductors: They fetch data and pass it down to smaller presentation components.

### Step 6: Presentation Components (`frontend/src/components/`)
These are reusable UI building blocks like `Sidebar.jsx`, `TopBar.jsx`, `StatCard.jsx`, or `Modal.jsx`. 
*   They receive data from the Pages (via *props*) and display it.
*   Example: A `clinician` dashboard page fetches alerts and passes them to `AlertCard.jsx` to render nicely.

### Step 7: Talking to the Backend (`frontend/src/api/`)
When a component or page needs data or needs to send data (like submitting a symptom report), it calls functions in the `api/` folder.
*   `client.js` likely contains the central configuration (e.g., Axios setup, attaching authorization tokens).
*   Specific files like `alerts.js` or `patients.js` contain the exact functions that hit your backend Python APIs (e.g., `/routes/alerts.py` -> `AlertService`).

---

## 3. Summary of the Complete Cycle

1. **User opens app** ➡️ `index.html` loads script ➡️ `main.jsx` starts React ➡️ `App.jsx` evaluates the URL and Auth state.
2. **Checks Auth** ➡️ `AuthContext` checks if user is logged in. If not, renders `LoginPage`.
3. **User logs in** ➡️ Calls `api/auth.js` ➡️ hits your Python Backend (`routes/auth.py`).
4. **Backend responds** ➡️ React saves token in `AuthContext` ➡️ `App.jsx` redirects to the correct Dashboard.
5. **Dashboard loads** ➡️ Calls `api/dashboard.js` ➡️ Backend fetches dashboard metrics.
6. **Data arrives** ➡️ Dashboard passes data down via **props** to `TopBar`, `Sidebar`, `StatCard`, and `AlertCard` to render the screen.
