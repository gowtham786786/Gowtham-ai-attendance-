import LoginForm from '../../components/auth/LoginForm';
import PageWrapper from '../../components/layout/PageWrapper';

const AdminLogin = () => {
  return (
    <PageWrapper className="bg-gray-50 dark:bg-gray-900">
      <LoginForm role="admin" title="Super Admin Login" />
    </PageWrapper>
  );
};

export default AdminLogin;
