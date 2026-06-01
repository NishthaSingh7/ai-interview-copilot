import { useEffect } from "react";
import { BrowserRouter, Navigate, Routes, Route, useNavigate } from "react-router-dom";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import { AuthProvider } from "./context/AuthContext";
import Feedback from "./pages/Feedback";
import Home from "./pages/Home";
import Interview from "./pages/Interview";
import Rules from "./pages/Rules";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import { setUnauthorizedHandler } from "./services/api";

function UnauthorizedRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    setUnauthorizedHandler(() => {
      localStorage.removeItem("access_token");
      navigate("/login", { replace: true });
    });
  }, [navigate]);
  return null;
}

function AppRoutes() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        <main className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route
              path="/interview"
              element={
                <ProtectedRoute requireVerified>
                  <Interview />
                </ProtectedRoute>
              }
            />
            <Route path="/rules" element={<Rules />} />
            <Route
              path="/feedback"
              element={
                <ProtectedRoute requireVerified>
                  <Feedback />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UnauthorizedRedirect />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
