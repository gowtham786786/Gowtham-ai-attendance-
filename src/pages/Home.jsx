import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUserGraduate, FaChalkboardTeacher, FaUserShield } from 'react-icons/fa';
import PageWrapper from '../components/layout/PageWrapper';

const Home = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <PageWrapper className="bg-gray-50 dark:bg-gray-900 pt-16 pb-20 px-4 sm:px-6 lg:pt-24 lg:pb-28 lg:px-8">
      <div className="relative max-w-7xl mx-auto">
        <div className="text-center">
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl"
          >
            <span className="block xl:inline">Smart</span>{' '}
            <span className="block text-primary xl:inline">Smart Attendance</span>
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl"
          >
            Enterprise-grade face recognition attendance system for modern institutions. Eliminate proxy attendance with AI.
          </motion.p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-16 max-w-lg mx-auto grid gap-8 lg:grid-cols-3 lg:max-w-none"
        >
          {/* Student Card */}
          <motion.div variants={itemVariants} className="flex flex-col rounded-2xl shadow-lg overflow-hidden glass-card hover:-translate-y-2 transition-transform duration-300">
            <div className="flex-1 bg-white dark:bg-gray-800 p-6 flex flex-col justify-between">
              <div className="flex-1">
                <div className="flex justify-center mt-4">
                  <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                    <FaUserGraduate size={40} />
                  </div>
                </div>
                <div className="block mt-6 text-center">
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">Student Portal</p>
                  <p className="mt-3 text-base text-gray-500 dark:text-gray-400">
                    Register your face data, view attendance reports, and track your academic progress.
                  </p>
                </div>
              </div>
              <div className="mt-8 flex flex-col space-y-3">
                <Link to="/student/login" className="btn-primary text-center">Student Login</Link>
                <Link to="/student/register" className="text-center text-sm text-primary hover:text-primary-dark dark:text-primary-light">New Student? Register here</Link>
              </div>
            </div>
          </motion.div>

          {/* Faculty Card */}
          <motion.div variants={itemVariants} className="flex flex-col rounded-2xl shadow-lg overflow-hidden glass-card hover:-translate-y-2 transition-transform duration-300">
            <div className="flex-1 bg-white dark:bg-gray-800 p-6 flex flex-col justify-between">
              <div className="flex-1">
                <div className="flex justify-center mt-4">
                  <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                    <FaChalkboardTeacher size={40} />
                  </div>
                </div>
                <div className="block mt-6 text-center">
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">Faculty Portal</p>
                  <p className="mt-3 text-base text-gray-500 dark:text-gray-400">
                    Manage classes, start AI attendance sessions, and generate comprehensive reports.
                  </p>
                </div>
              </div>
              <div className="mt-8 flex flex-col space-y-3">
                <Link to="/faculty/login" className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-center transition-colors">Faculty Login</Link>
                <Link to="/faculty/register" className="text-center text-sm text-green-600 hover:text-green-700 dark:text-green-400">New Faculty? Register here</Link>
              </div>
            </div>
          </motion.div>

          {/* Admin Card */}
          <motion.div variants={itemVariants} className="flex flex-col rounded-2xl shadow-lg overflow-hidden glass-card hover:-translate-y-2 transition-transform duration-300">
            <div className="flex-1 bg-white dark:bg-gray-800 p-6 flex flex-col justify-between">
              <div className="flex-1">
                <div className="flex justify-center mt-4">
                  <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400">
                    <FaUserShield size={40} />
                  </div>
                </div>
                <div className="block mt-6 text-center">
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">Admin Portal</p>
                  <p className="mt-3 text-base text-gray-500 dark:text-gray-400">
                    Full Smart Attendance management. Approve users, manage timetables, and monitor system health.
                  </p>
                </div>
              </div>
              <div className="mt-8 flex flex-col space-y-3">
                <Link to="/admin/login" className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-lg text-center transition-colors">Admin Login</Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </PageWrapper>
  );
};

export default Home;
