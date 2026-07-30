import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useFaculty } from '../../../context/FacultyContext';
import { toast } from 'react-toastify';
import DashboardCard from '../../../components/ui/DashboardCard';
import StudentDetails from './StudentDetails';
import { FaUserGraduate, FaExclamationTriangle, FaSearch } from 'react-icons/fa';

const StudentList = () => {
  const { facultyData } = useFaculty();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!facultyData || !facultyData.department || !facultyData.sectionsHandled || facultyData.sectionsHandled.length === 0) {
        setLoading(false);
        return;
      }

      try {
        // Firebase 'in' query supports up to 10 items.
        // We assume a faculty handles less than 10 sections.
        const q = query(
          collection(db, 'students'),
          where('department', '==', facultyData.department),
          where('section', 'in', facultyData.sectionsHandled)
        );
        
        const snap = await getDocs(q);
        const st = [];
        snap.forEach(doc => {
          st.push({ id: doc.id, ...doc.data() });
        });
        
        // Mocking attendance % since we don't have a cloud function calculating it dynamically yet
        const enriched = st.map(s => ({
          ...s,
          attendancePct: Math.floor(Math.random() * 40) + 60 // Random between 60-100 for UI demo
        }));
        
        setStudents(enriched);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load students.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [facultyData]);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedStudent) {
    return <StudentDetails student={selectedStudent} onBack={() => setSelectedStudent(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <FaUserGraduate className="mr-2 text-primary" /> My Students
          </h2>
          <p className="text-sm text-gray-500">Students in your assigned sections ({facultyData?.sectionsHandled?.join(', ') || 'None'})</p>
        </div>
        <div className="relative w-full md:w-64">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search student..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
          />
        </div>
      </div>

      <DashboardCard>
        {loading ? (
          <div className="animate-pulse space-y-4">
             {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl"></div>)}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center">
             <FaUserGraduate size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
             <p className="text-lg font-medium">No students found.</p>
             <p className="text-sm">You might not be assigned to any sections yet, or no students match your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Student</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">ID / Roll No</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Section</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Attendance %</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{student.name}</p>
                          <p className="text-xs text-gray-500">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">{student.studentId || 'N/A'}</td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{student.section}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold ${student.attendancePct < 75 ? 'text-red-600' : 'text-green-600'}`}>
                          {student.attendancePct}%
                        </span>
                        {student.attendancePct < 75 && <FaExclamationTriangle className="text-red-500 text-xs" title="Low Attendance" />}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedStudent(student)}
                        className="text-primary hover:text-primary-dark font-medium text-sm border border-primary/20 hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>
    </div>
  );
};

export default StudentList;
