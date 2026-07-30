import { useState, useEffect, useMemo } from 'react';
import { collection, doc, updateDoc, deleteDoc, onSnapshot, query, limit } from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import { toast } from 'react-toastify';
import { FaTrash, FaEdit, FaSearch, FaChevronLeft, FaChevronRight, FaFileCsv, FaChevronDown, FaChevronRight as FaArrowRight, FaPlus, FaEye, FaTimes } from 'react-icons/fa';
import DashboardCard from '../../../components/ui/DashboardCard';

const ITEMS_PER_PAGE = 20;

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '', studentId: '', email: '', department: '', year: '', section: '', phone: '', password: ''
  });
  
  // Filtering & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Tree Selection State
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [expandedBranches, setExpandedBranches] = useState({});
  const [expandedYears, setExpandedYears] = useState({});

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(query(collection(db, 'students'), limit(200)),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStudents(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Students Listener Error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Build the tree dynamically from available data
  const treeData = useMemo(() => {
    const tree = {};
    students.forEach(student => {
      const branch = student.department || 'Unassigned';
      const year = student.year ? `${student.year} Year` : 'Unknown Year';
      const section = student.section ? `Section ${student.section}` : 'Unassigned Section';

      if (!tree[branch]) tree[branch] = {};
      if (!tree[branch][year]) tree[branch][year] = new Set();
      tree[branch][year].add(section);
    });

    // Convert Sets to sorted arrays
    Object.keys(tree).forEach(branch => {
      Object.keys(tree[branch]).forEach(year => {
        tree[branch][year] = Array.from(tree[branch][year]).sort();
      });
    });

    return tree;
  }, [students]);

  // Filter students based on tree selection and search
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Tree Filter
      const branch = student.department || 'Unassigned';
      const year = student.year ? `${student.year} Year` : 'Unknown Year';
      const section = student.section ? `Section ${student.section}` : 'Unassigned Section';

      if (selectedBranch && branch !== selectedBranch) return false;
      if (selectedYear && year !== selectedYear) return false;
      if (selectedSection && section !== selectedSection) return false;

      // Search Filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          (student.name?.toLowerCase() || '').includes(searchLower) ||
          (student.email?.toLowerCase() || '').includes(searchLower) ||
          (student.studentId?.toLowerCase() || '').includes(searchLower);
        if (!matchesSearch) return false;
      }

      return true;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [students, selectedBranch, selectedYear, selectedSection, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranch, selectedYear, selectedSection, searchTerm]);

  const toggleBranch = (branch) => {
    setExpandedBranches(prev => ({ ...prev, [branch]: !prev[branch] }));
  };

  const toggleYear = (branch, year) => {
    const key = `${branch}-${year}`;
    setExpandedYears(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectNode = (branch, year = null, section = null) => {
    setSelectedBranch(branch);
    setSelectedYear(year);
    setSelectedSection(section);
  };

  const handleStatusChange = async (studentId, newStatus) => {
    try {
      await updateDoc(doc(db, 'students', studentId), { status: newStatus });
      toast.success('Status updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status. Check permissions.');
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm("Are you sure you want to permanently delete this student?")) return;
    try {
      const adminUid = auth.currentUser?.uid;
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'https://gowtham-ai-attendance-backend.onrender.com';
      const response = await fetch(`${baseUrl}/api/admin/delete-user/${studentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUid, role: 'student' })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete student');
      
      toast.success('Student deleted successfully');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to delete student.');
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'https://gowtham-ai-attendance-backend.onrender.com';
      const response = await fetch(`${baseUrl}/api/admin/add-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newStudent.email,
          password: newStudent.password,
          role: 'student',
          userData: {
            name: newStudent.name,
            studentId: newStudent.studentId,
            department: newStudent.department,
            year: newStudent.year,
            section: newStudent.section,
            phone: newStudent.phone
          }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add student');

      toast.success('Student added successfully. Welcome email sent!');
      setIsAddModalOpen(false);
      setNewStudent({ name: '', studentId: '', email: '', department: '', year: '', section: '', phone: '', password: '' });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to add student.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'students', editingStudent.id), { 
        name: editingStudent.name, 
        status: editingStudent.status,
        email: editingStudent.email,
        phone: editingStudent.phone
      });
      toast.success('Student updated successfully');
      setEditingStudent(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save changes.');
    }
  };

  const exportToCSV = () => {
    if (filteredStudents.length === 0) {
      toast.info("No data to export.");
      return;
    }
    const headers = ["Student ID", "Name", "Email", "Phone", "Branch", "Year", "Section", "Gender", "Status"];
    const csvRows = [headers.join(',')];

    filteredStudents.forEach(s => {
      const row = [
        s.studentId || 'N/A',
        `"${s.name || ''}"`,
        s.email || '',
        s.phone || '',
        `"${s.department || ''}"`,
        s.year || '',
        s.section || '',
        s.gender || '',
        s.status || ''
      ];
      csvRows.push(row.join(','));
    });

    const csvData = csvRows.join('\n');
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'students_export.csv');
    a.click();
  };

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-xl border border-red-200">
        <h3 className="text-red-800 font-bold mb-2">Firebase Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-12rem)] min-h-[600px]">
      
      {/* LEFT SIDEBAR - TREE VIEW */}
      <div className="w-full lg:w-72 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full overflow-hidden shrink-0">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-primary/5">
          <h3 className="font-bold text-gray-800 dark:text-white flex items-center space-x-2">
            <span>University Hierarchy</span>
          </h3>
          <button 
            onClick={() => selectNode(null)} 
            className="mt-2 w-full text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Clear Selection (View All)
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          {Object.keys(treeData).sort().map(branch => (
            <div key={branch} className="mb-1">
              {/* Branch Node */}
              <div 
                className={`flex items-center px-2 py-1.5 rounded cursor-pointer ${selectedBranch === branch && !selectedYear ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              >
                <span onClick={() => toggleBranch(branch)} className="mr-1 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                  {expandedBranches[branch] ? <FaChevronDown size={10} /> : <FaArrowRight size={10} />}
                </span>
                <span className="flex-1 text-sm truncate" onClick={() => selectNode(branch)}>
                  {branch}
                </span>
              </div>

              {/* Year Nodes */}
              {expandedBranches[branch] && (
                <div className="ml-4 pl-2 border-l border-gray-200 dark:border-gray-700">
                  {Object.keys(treeData[branch]).sort().map(year => {
                    const yearKey = `${branch}-${year}`;
                    return (
                      <div key={yearKey}>
                        <div 
                          className={`flex items-center px-2 py-1.5 rounded cursor-pointer ${selectedBranch === branch && selectedYear === year && !selectedSection ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                        >
                          <span onClick={() => toggleYear(branch, year)} className="mr-1 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                            {expandedYears[yearKey] ? <FaChevronDown size={10} /> : <FaArrowRight size={10} />}
                          </span>
                          <span className="flex-1 text-sm" onClick={() => selectNode(branch, year)}>
                            {year}
                          </span>
                        </div>

                        {/* Section Nodes */}
                        {expandedYears[yearKey] && (
                          <div className="ml-4 pl-2 border-l border-gray-200 dark:border-gray-700">
                            {treeData[branch][year].map(section => (
                              <div 
                                key={section}
                                onClick={() => selectNode(branch, year, section)}
                                className={`px-4 py-1.5 rounded cursor-pointer text-sm ${selectedBranch === branch && selectedYear === year && selectedSection === section ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
                              >
                                {section}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {Object.keys(treeData).length === 0 && !loading && (
            <p className="text-sm text-gray-500 text-center mt-4">No departments found.</p>
          )}
        </div>
      </div>

      {/* RIGHT SIDE - DATA TABLE */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full overflow-hidden">
        
        {/* Header & Controls */}
        <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                {selectedSection ? `${selectedBranch} > ${selectedYear} > ${selectedSection}` :
                 selectedYear ? `${selectedBranch} > ${selectedYear}` :
                 selectedBranch ? selectedBranch : 'All Students'}
              </h2>
              <p className="text-sm text-gray-500">{filteredStudents.length} students found</p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
              >
                <FaPlus size={14} />
                <span>Add Student</span>
              </button>
              <button 
                onClick={exportToCSV}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
              >
              <FaFileCsv size={16} />
              <span>Export CSV</span>
            </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <FaSearch />
            </div>
            <input
              type="text"
              placeholder="Search by Name, Email, or Student ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 input-field bg-gray-50 dark:bg-gray-900"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name & Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Academics</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading && students.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-12 text-gray-500">
                   <div className="flex justify-center items-center space-x-2">
                     <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                     <span>Loading real-time student data...</span>
                   </div>
                </td></tr>
              ) : paginatedStudents.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-12 text-gray-500">No students found matching your criteria.</td></tr>
              ) : (
                paginatedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-300">
                      {student.studentId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{student.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{student.email}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{student.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{student.department || 'N/A'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {student.year ? `${student.year} Year` : ''} {student.section ? `• Sec ${student.section}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap space-y-1">
                      <div>
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full ${
                          (student.status === 'Approved' || student.status === 'approved' || student.status === 'active') ? 'bg-green-100 text-green-800' :
                          (student.status === 'Pending' || student.status === 'pending' || student.status === 'pending_approval') ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {student.status || 'unknown'}
                        </span>
                      </div>
                      <div>
                         <span className={`text-[10px] px-2 py-0.5 rounded-full ${student.faceRegistered ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                           {student.faceRegistered ? 'Face Registered' : 'No Face Data'}
                         </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="space-x-2 flex justify-end items-center">
                        {student.status !== 'Approved' && student.status !== 'approved' && student.status !== 'active' && (
                          <button onClick={() => handleStatusChange(student.id, 'Approved')} className="text-green-600 hover:text-green-900 font-bold border border-green-200 px-2 py-1 rounded hover:bg-green-50 text-xs">Approve</button>
                        )}
                        <button onClick={() => setViewingStudent(student)} className="text-purple-600 hover:text-purple-900 bg-purple-50 p-2 rounded-full hover:bg-purple-100" title="View Full Details"><FaEye size={12} /></button>
                        <button onClick={() => setEditingStudent(student)} className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-full hover:bg-blue-100" title="Edit"><FaEdit size={12} /></button>
                        <button onClick={() => handleDeleteStudent(student.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full hover:bg-red-100" title="Delete"><FaTrash size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)}</span> of <span className="font-medium">{filteredStudents.length}</span> students
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-300 dark:border-gray-600 rounded text-gray-500 disabled:opacity-50 bg-white dark:bg-gray-700 hover:bg-gray-50"
              >
                <FaChevronLeft size={12} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-gray-300 dark:border-gray-600 rounded text-gray-500 disabled:opacity-50 bg-white dark:bg-gray-700 hover:bg-gray-50"
              >
                <FaChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveEdit} className="bg-white dark:bg-gray-800 p-8 rounded-xl max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Edit Student</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input 
                  type="text" 
                  value={editingStudent.name || ''} 
                  onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input 
                  type="email" 
                  value={editingStudent.email || ''} 
                  onChange={(e) => setEditingStudent({...editingStudent, email: e.target.value})}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input 
                  type="text" 
                  value={editingStudent.phone || ''} 
                  onChange={(e) => setEditingStudent({...editingStudent, phone: e.target.value})}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select 
                  value={editingStudent.status || 'Approved'}
                  onChange={(e) => setEditingStudent({...editingStudent, status: e.target.value})}
                  className="input-field cursor-pointer"
                >
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button type="button" onClick={() => setEditingStudent(null)} className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium">
                Cancel
              </button>
              <button type="submit" className="flex-1 py-2 btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddStudent} className="bg-white dark:bg-gray-800 p-8 rounded-xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Add New Student</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input type="text" value={newStudent.name} onChange={(e) => setNewStudent({...newStudent, name: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Roll Number</label>
                <input type="text" value={newStudent.studentId} onChange={(e) => setNewStudent({...newStudent, studentId: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input type="email" value={newStudent.email} onChange={(e) => setNewStudent({...newStudent, email: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temporary Password</label>
                <input type="text" value={newStudent.password} onChange={(e) => setNewStudent({...newStudent, password: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Branch/Department</label>
                <input type="text" value={newStudent.department} onChange={(e) => setNewStudent({...newStudent, department: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                <select value={newStudent.year} onChange={(e) => setNewStudent({...newStudent, year: e.target.value})} className="input-field" required>
                  <option value="">Select Year</option>
                  <option value="1st">1st Year</option>
                  <option value="2nd">2nd Year</option>
                  <option value="3rd">3rd Year</option>
                  <option value="4th">4th Year</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Section</label>
                <input type="text" value={newStudent.section} onChange={(e) => setNewStudent({...newStudent, section: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input type="text" value={newStudent.phone} onChange={(e) => setNewStudent({...newStudent, phone: e.target.value})} className="input-field" />
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50" disabled={isAdding}>
                Cancel
              </button>
              <button type="submit" className="flex-1 py-2 btn-primary flex justify-center items-center" disabled={isAdding}>
                {isAdding ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Add Student'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Student Full Detail Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setViewingStudent(null)} 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white"
            >
              <FaTimes size={20} />
            </button>
            <h3 className="text-2xl font-bold mb-6 dark:text-white border-b pb-2 dark:border-gray-700">Student Profile Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg">{viewingStudent.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Roll Number</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg">{viewingStudent.studentId || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email Address</p>
                <p className="font-bold text-gray-900 dark:text-white">{viewingStudent.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Phone Number</p>
                <p className="font-bold text-gray-900 dark:text-white">{viewingStudent.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Branch / Department</p>
                <p className="font-bold text-gray-900 dark:text-white">{viewingStudent.department || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Year</p>
                <p className="font-bold text-gray-900 dark:text-white">{viewingStudent.year || 'N/A'} Year</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Section</p>
                <p className="font-bold text-gray-900 dark:text-white">{viewingStudent.section || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Face Registration Status</p>
                <p className={`font-bold ${viewingStudent.faceRegistered ? 'text-green-600' : 'text-red-500'}`}>
                  {viewingStudent.faceRegistered ? 'Registered' : 'Not Registered'}
                </p>
              </div>
              <div className="col-span-1 md:col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Overall Attendance %</p>
                <div className="flex items-center mt-1">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mr-4">
                    <div className="bg-primary h-4 rounded-full" style={{ width: `${viewingStudent.attendancePercentage || 0}%` }}></div>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">{viewingStudent.attendancePercentage || 0}%</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t dark:border-gray-700 flex justify-end">
              <button 
                onClick={() => setViewingStudent(null)} 
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
