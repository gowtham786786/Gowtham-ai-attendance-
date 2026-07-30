import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaUserGraduate, FaChalkboardTeacher, FaCheck, FaTimes, FaSearch } from 'react-icons/fa';

const BASE = import.meta.env.VITE_BACKEND_URL || 'https://gowtham-ai-attendance-backend.onrender.com';

const ApprovalManagement = () => {
  const [activeTab, setActiveTab] = useState('student');
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('Pending');

  const fetchRequests = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const [studentResult, facultyResult] = await Promise.allSettled([
        axios.get(`${BASE}/api/admin/student-requests`),
        axios.get(`${BASE}/api/admin/faculty-requests`)
      ]);

      let hasError = false;
      let errorMessage = 'Failed to fetch approval requests';

      if (studentResult.status === 'fulfilled' && studentResult.value.data.success) {
        setStudents(studentResult.value.data.data || []);
      } else {
        hasError = true;
        errorMessage = studentResult.reason?.response?.data?.error || errorMessage;
      }

      if (facultyResult.status === 'fulfilled' && facultyResult.value.data.success) {
        setFaculty(facultyResult.value.data.data || []);
      } else {
        hasError = true;
        errorMessage = facultyResult.reason?.response?.data?.error || errorMessage;
      }

      if (hasError) {
        setErrorState(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Unexpected fetch requests error:', error);
      setErrorState('An unexpected error occurred while fetching data');
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (uid, type) => {
    if (!window.confirm(`Are you sure you want to approve this ${type}?`)) return;
    try {
      await axios.post(`${BASE}/api/admin/approve-${type}`, { uid });
      toast.success(`${type} approved successfully!`);
      fetchRequests();
    } catch (error) {
      toast.error(`Failed to approve ${type}`);
    }
  };

  const handleReject = async (uid, type) => {
    if (!window.confirm(`Are you sure you want to reject this ${type}?`)) return;
    try {
      await axios.post(`${BASE}/api/admin/reject-${type}`, { uid });
      toast.success(`${type} rejected successfully!`);
      fetchRequests();
    } catch (error) {
      toast.error(`Failed to reject ${type}`);
    }
  };

  const currentData = activeTab === 'student' ? students : faculty;
  const filteredData = currentData.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.studentId && item.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (item.facultyId && item.facultyId.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Normalize status for filtering
    const normalizedStatus = ['pending', 'pending_approval'].includes((item.status || '').toLowerCase()) ? 'Pending' : item.status;
    const matchesFilter = filter === 'All' || normalizedStatus === filter;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Approval Management</h2>
        
        <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('student')}
            className={`pb-3 px-4 flex items-center space-x-2 font-medium transition-colors ${
              activeTab === 'student'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FaUserGraduate />
            <span>Student Approvals</span>
            {students.filter(s => ['pending', 'pending_approval'].includes((s.status || '').toLowerCase())).length > 0 && (
              <span className="ml-2 bg-red-100 text-red-600 text-xs py-0.5 px-2 rounded-full">
                {students.filter(s => ['pending', 'pending_approval'].includes((s.status || '').toLowerCase())).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('faculty')}
            className={`pb-3 px-4 flex items-center space-x-2 font-medium transition-colors ${
              activeTab === 'faculty'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FaChalkboardTeacher />
            <span>Faculty Approvals</span>
            {faculty.filter(f => ['pending', 'pending_approval'].includes((f.status || '').toLowerCase())).length > 0 && (
              <span className="ml-2 bg-red-100 text-red-600 text-xs py-0.5 px-2 rounded-full">
                {faculty.filter(f => ['pending', 'pending_approval'].includes((f.status || '').toLowerCase())).length}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID & Dept</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">Loading requests...</td>
              </tr>
            ) : errorState ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-red-500 dark:text-red-400">
                  <div className="flex flex-col items-center">
                    <FaTimes className="text-3xl mb-2" />
                    <span className="font-semibold">{errorState}</span>
                  </div>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No requests found.</td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                        {item.name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{item.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white font-medium">{item.studentId || item.facultyId}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{item.department} {item.year ? `(${item.year})` : ''}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">{item.phone || 'N/A'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.createdAt 
                        ? new Date(item.createdAt?.seconds ? item.createdAt.seconds * 1000 : item.createdAt).toLocaleDateString() 
                        : 'Unknown Date'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      (item.status === 'Approved' || item.status === 'approved') ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      (item.status === 'Rejected' || item.status === 'rejected') ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {['pending', 'pending_approval'].includes((item.status || '').toLowerCase()) ? 'Pending' : item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                    {['pending', 'pending_approval'].includes((item.status || '').toLowerCase()) && (
                      <>
                        <button
                          onClick={() => handleApprove(item.id, activeTab)}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <FaCheck />
                        </button>
                        <button
                          onClick={() => handleReject(item.id, activeTab)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <FaTimes />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ApprovalManagement;
