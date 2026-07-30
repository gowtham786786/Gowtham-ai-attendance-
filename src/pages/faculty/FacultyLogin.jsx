import LoginForm from '../../components/auth/LoginForm';
import PageWrapper from '../../components/layout/PageWrapper';

const FacultyLogin = () => {
  return (
    <PageWrapper className="bg-gray-50 dark:bg-gray-900">
      <LoginForm role="faculty" title="Faculty Portal Login" />
    </PageWrapper>
  );
};

export default FacultyLogin;
