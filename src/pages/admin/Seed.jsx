import { useState } from 'react';
import { registerUserAccount, logoutUser } from '../../services/authService';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-toastify';

const SeedAdmin = () => {
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    setLoading(true);
    try {
      await registerUserAccount('reddygowtham397@gmail.com', '123456789', 'admin');
      toast.success('Admin account created! (reddygowtham397@gmail.com / 123456789)');
      await logoutUser();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedFaculty = async () => {
    setLoading(true);
    try {
      const user = await registerUserAccount('faculty@test.com', 'faculty123', 'faculty');
      
      const facultyData = {
        id: user.uid,
        name: 'Test Faculty',
        email: 'faculty@test.com',
        phone: '1234567890',
        department: 'CSE',
        designation: 'Professor',
        assignedSubjects: ['Java', 'Python'],
        sectionsHandled: ['A', 'B'],
        status: 'Active',
        role: 'faculty',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'faculty', user.uid), facultyData);
      // Update users collection status for faculty approval
      await setDoc(doc(db, 'users', user.uid), { status: 'approved' }, { merge: true });

      toast.success('Faculty account created! (faculty@test.com / faculty123)');
      await logoutUser();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="glass-card p-8 rounded-2xl text-center space-y-4 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Seed Database</h2>
        <p className="text-gray-500 text-sm">Quickly generate test accounts to avoid manual creation.</p>
        
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <button 
              onClick={handleSeed}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Creating...' : 'Seed Admin (reddygowtham397@gmail.com)'}
            </button>
            <p className="text-xs text-gray-400 mt-1">Pass: 123456789</p>
          </div>

          <div>
            <button 
              onClick={handleSeedFaculty}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Creating...' : 'Seed Faculty (faculty@test.com)'}
            </button>
            <p className="text-xs text-gray-400 mt-1">Pass: faculty123 (Assigned to CSE, Sections A & B)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeedAdmin;
