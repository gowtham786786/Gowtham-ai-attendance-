import LoginForm from '../../components/auth/LoginForm';
import PageWrapper from '../../components/layout/PageWrapper';

const StudentLogin = () => {
  return (
    <PageWrapper className="bg-gray-50 dark:bg-gray-900">
      <LoginForm role="student" title="Student Portal Login" />
    </PageWrapper>
  );
};

export default StudentLogin;
