import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import { FacultyProvider } from './context/FacultyContext';
import { StudentProvider } from './context/StudentContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';

// Login Pages
import StudentLogin from './pages/student/StudentLogin';
import FacultyLogin from './pages/faculty/FacultyLogin';
import AdminLogin from './pages/admin/Login';
import SeedAdmin from './pages/admin/Seed';

// Registration Pages
import StudentRegister from './pages/student/StudentRegister';
import FacultyRegister from './pages/faculty/FacultyRegister';
import ForgotPassword from './pages/shared/ForgotPassword';

// Dashboards
import StudentDashboard from './pages/student/Dashboard';
import FaceRegistrationPage from './pages/student/FaceRegistrationPage';
import FacultyDashboard from './pages/faculty/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';

// Placeholder components for routing
const Placeholder = ({ title }) => (
  <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <h1 className="text-3xl text-gray-800 dark:text-gray-200">{title} (Under Construction)</h1>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<Home />} />
              
              {/* Student Routes */}
              <Route path="/student/login" element={<StudentLogin />} />
              <Route path="/student/register" element={<StudentRegister />} />
              <Route path="/student/face-registration" element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentProvider>
                    <FaceRegistrationPage />
                  </StudentProvider>
                </ProtectedRoute>
              } />
              <Route path="/student/dashboard" element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentProvider>
                    <StudentDashboard />
                  </StudentProvider>
                </ProtectedRoute>
              } />
              
              {/* Faculty Routes */}
              <Route path="/faculty/login" element={<FacultyLogin />} />
              <Route path="/faculty/register" element={<FacultyRegister />} />
              <Route path="/faculty/dashboard" element={
                <ProtectedRoute allowedRoles={['faculty']}>
                  <FacultyProvider>
                    <FacultyDashboard />
                  </FacultyProvider>
                </ProtectedRoute>
              } />
              
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/seed-admin" element={<SeedAdmin />} />
              <Route path="/admin/dashboard" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />

              {/* Shared Routes */}
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Other Pages */}
              <Route path="/about" element={<Placeholder title="About Us" />} />
              <Route path="/features" element={<Placeholder title="Features" />} />
              <Route path="/contact" element={<Placeholder title="Contact" />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
      <ToastContainer position="top-right" autoClose={3000} />
    </AuthProvider>
  );
}

export default App;
