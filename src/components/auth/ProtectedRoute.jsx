import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <Skeleton height={40} width={300} />
        <Skeleton height={200} width={500} />
      </div>
    );
  }

  // BYPASS AUTH FOR PREVIEW
  // if (!currentUser) {
  //   return <Navigate to="/" state={{ from: location }} replace />;
  // }
  // to sign the user out if they fail OTP.

  // BYPASS ROLE CHECK FOR PREVIEW
  // if (allowedRoles && !allowedRoles.includes(userRole)) {
  //   return <Navigate to={`/${userRole}/dashboard`} replace />;
  // }

  return children;
};

export default ProtectedRoute;
