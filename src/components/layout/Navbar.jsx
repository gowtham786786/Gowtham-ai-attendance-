import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';

const Navbar = () => {
  const { currentUser, userRole } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out", error);
    }
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 dark:bg-gray-900/80 dark:border-b dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-primary dark:text-primary-light tracking-wider">SMART ATTENDANCE</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <>
                <span className="text-gray-700 dark:text-gray-200">
                  Welcome, {currentUser.displayName || 'User'}
                </span>
                <Link to={`/${userRole}/dashboard`} className="text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary-light px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="hidden md:flex space-x-4">
                <Link to="/about" className="text-gray-600 hover:text-primary dark:text-gray-300 px-3 py-2 rounded-md text-sm font-medium">About</Link>
                <Link to="/features" className="text-gray-600 hover:text-primary dark:text-gray-300 px-3 py-2 rounded-md text-sm font-medium">Features</Link>
                <Link to="/contact" className="text-gray-600 hover:text-primary dark:text-gray-300 px-3 py-2 rounded-md text-sm font-medium">Contact</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
