import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from "react";

import LandingPage from './pages/LandingPage';
import MeetingRoom from './pages/MeetingRoom';
import CalendarPage from './pages/CalendarPage';
import CallsPage from './pages/CallsPage';
import LeftMeetingPage from './pages/LeftMeetingPage';
import LobbyPage from './pages/LobbyPage';
import LoginPage from "./pages/LoginPage";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user"))
  );

  useEffect(() => {
  const checkUser = () => {
    setUser(JSON.parse(localStorage.getItem("user")));
  };

  checkUser();

  window.addEventListener("storage", checkUser);

  return () => window.removeEventListener("storage", checkUser);
}, []);

  console.log("User:", user);

  return (
    <Router>
      <div style={{ minHeight: "100vh", color: "white" }}>

        <Routes>

          <Route
            path="/login"
            element={
              !user ? <LoginPage /> : <Navigate to="/" />
            }
          />

          <Route
            path="/"
            element={
              user ? <LandingPage /> : <Navigate to="/login" />
            }
          />



          <Route
            path="/room/:id"
            element={
              <ProtectedRoute>
                <LobbyPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/meeting/:id"
            element={
              <ProtectedRoute>
                <MeetingRoom />
              </ProtectedRoute>
            }
          />

          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/calls"
            element={
              <ProtectedRoute>
                <CallsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/left-meeting/:id"
            element={
              <ProtectedRoute>
                <LeftMeetingPage />
              </ProtectedRoute>
            }
          />

        </Routes>
      </div>
    </Router>
  );
}

export default App;