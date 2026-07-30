import { useState, useEffect, useMemo } from 'react';
import { collection, doc, updateDoc, deleteDoc, onSnapshot, query, limit } from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import { toast } from 'react-toastify';
import { FaTrash, FaEdit, FaSearch, FaChevronLeft, FaChevronRight, FaFileCsv, FaChevronDown, FaChevronRight as FaArrowRight, FaPlus, FaEye, FaTimes } from 'react-icons/fa';

const ITEMS_PER_PAGE = 20;

const FacultyManagement = () => {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [viewingFaculty, setViewingFaculty] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newFaculty, setNewFaculty] = useState({
    name: '', facultyId: '', email: '', department: '', phone: '', password: ''
  });
  
  // Filtering & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Tree Selection State
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [expandedDepts, setExpandedDepts] = useState({});

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(query(collection(db, 'faculty'), limit(200)),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFaculty(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Faculty Listener Error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Build the tree dynamically from available data
  const treeData = useMemo(() => {
    const tree = {};
    faculty.forEach(f => {
      const dept = f.department || 'Unassigned Department';
      if (!tree[dept]) tree[dept] = new Set();
      
      if (f.assignedSubjects && Array.isArray(f.assignedSubjects)) {
        f.assignedSubjects.forEach(sub => tree[dept].add(sub));
      } else {
        tree[dept].add('Unassigned Subject');
      }
    });

    // Convert Sets to sorted arrays
    Object.keys(tree).forEach(dept => {
      tree[dept] = Array.from(tree[dept]).sort();
    });

    return tree;
  }, [faculty]);

  // Filter faculty based on tree selection and search
  const filteredFaculty = useMemo(() => {
    return faculty.filter(f => {
      // Tree Filter
      const dept = f.department || 'Unassigned Department';
      
      if (selectedDept && dept !== selectedDept) return false;
      if (selectedSubject) {
        if (!f.assignedSubjects || !f.assignedSubjects.includes(selectedSubject)) {
           // check if selected subject is 'Unassigned Subject'
           if (selectedSubject === 'Unassigned Subject' && (!f.assignedSubjects || f.assignedSubjects.length === 0)) {
               // passes
           } else {
               return false;
           }
        }
      }

      // Search Filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          (f.name?.toLowerCase() || '').includes(searchLower) ||
          (f.email?.toLowerCase() || '').includes(searchLower) ||
          (f.facultyId?.toLowerCase() || '').includes(searchLower);
        if (!matchesSearch) return false;
      }

      return true;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [faculty, selectedDept, selectedSubject, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredFaculty.length / ITEMS_PER_PAGE);
  const paginatedFaculty = filteredFaculty.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDept, selectedSubject, searchTerm]);

  const toggleDept = (dept) => {
    setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  };

  const selectNode = (dept, subject = null) => {
    setSelectedDept(dept);
    setSelectedSubject(subject);
  };

  const handleStatusChange = async (facultyId, newStatus) => {
    try {
      await updateDoc(doc(db, 'faculty', facultyId), { status: newStatus });
      toast.success('Status updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status. Check permissions.');
    }
  };

  const handleDeleteFaculty = async (facultyId) => {
    if (!window.confirm("Are you sure you want to permanently delete this faculty member?")) return;
    try {
      const adminUid = auth.currentUser?.uid;
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'https://gowtham-ai-attendance-backend.onrender.com';
      const response = await fetch(`${baseUrl}/api/admin/delete-user/${facultyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUid, role: 'faculty' })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete faculty');
      
      toast.success('Faculty deleted successfully');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to delete faculty.');
    }
  };

  const handleAddFaculty = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'https://gowtham-ai-attendance-backend.onrender.com';
      const response = await fetch(`${baseUrl}/api/admin/add-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newFaculty.email,
          password: newFaculty.password,
          role: 'faculty',
          userData: {
            name: newFaculty.name,
            facultyId: newFaculty.facultyId,
            department: newFaculty.department,
            phone: newFaculty.phone,
            assignedSubjects: []
          }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add faculty');

      toast.success('Faculty added successfully. Welcome email sent!');
      setIsAddModalOpen(false);
      setNewFaculty({ name: '', facultyId: '', email: '', department: '', phone: '', password: '' });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to add faculty.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'faculty', editingFaculty.id), { 
        name: editingFaculty.name, 
        status: editingFaculty.status,
        email: editingFaculty.email,
        phone: editingFaculty.phone,
        assignedSubjects: editingFaculty.assignedSubjects || [],
        sectionsHandled: editingFaculty.sectionsHandled || []
      });
      toast.success('Faculty updated successfully');
      setEditingFaculty(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save changes.');
    }
  };

  const exportToCSV = () => {
    if (filteredFaculty.length === 0) {
      toast.info("No data to export.");
      return;
    }
    const headers = ["Faculty ID", "Name", "Email", "Phone", "Department", "Subjects Teaching", "Status"];
    const csvRows = [headers.join(',')];

    filteredFaculty.forEach(f => {
      const row = [
        f.facultyId || 'N/A',
        `"${f.name || ''}"`,
        f.email || '',
        f.phone || '',
        `"${f.department || ''}"`,
        `"${(f.assignedSubjects || []).join('; ')}"`,
        f.status || ''
      ];
      csvRows.push(row.join(','));
    });

    const csvData = csvRows.join('\n');
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'faculty_export.csv');
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
            <span>Departments</span>
          </h3>
          <button 
            onClick={() => selectNode(null)} 
            className="mt-2 w-full text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Clear Selection (View All)
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          {Object.keys(treeData).sort().map(dept => (
            <div key={dept} className="mb-1">
              {/* Dept Node */}
              <div 
                className={`flex items-center px-2 py-1.5 rounded cursor-pointer ${selectedDept === dept && !selectedSubject ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              >
                <span onClick={() => toggleDept(dept)} className="mr-1 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                  {expandedDepts[dept] ? <FaChevronDown size={10} /> : <FaArrowRight size={10} />}
                </span>
                <span className="flex-1 text-sm truncate" onClick={() => selectNode(dept)}>
                  {dept}
                </span>
              </div>

              {/* Subject Nodes */}
              {expandedDepts[dept] && (
                <div className="ml-4 pl-2 border-l border-gray-200 dark:border-gray-700">
                  {treeData[dept].map(subject => (
                    <div 
                      key={subject}
                      onClick={() => selectNode(dept, subject)}
                      className={`px-4 py-1.5 rounded cursor-pointer text-sm ${selectedDept === dept && selectedSubject === subject ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
                    >
                      {subject}
                    </div>
                  ))}
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
                {selectedSubject ? `${selectedDept} > ${selectedSubject}` :
                 selectedDept ? selectedDept : 'All Faculty'}
              </h2>
              <p className="text-sm text-gray-500">{filteredFaculty.length} faculty found</p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
              >
                <FaPlus size={14} />
                <span>Add Faculty</span>
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
              placeholder="Search by Name, Email, or Faculty ID..."
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
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Faculty ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name & Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Department & Subjects</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading && faculty.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-12 text-gray-500">
                   <div className="flex justify-center items-center space-x-2">
                     <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                     <span>Loading real-time faculty data...</span>
                   </div>
                </td></tr>
              ) : paginatedFaculty.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-12 text-gray-500">No faculty found matching your criteria.</td></tr>
              ) : (
                paginatedFaculty.map((fac) => (
                  <tr key={fac.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-300">
                      {fac.facultyId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{fac.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{fac.email}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{fac.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{fac.department || 'N/A'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {(fac.assignedSubjects || []).join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                        (fac.status === 'Approved' || fac.status === 'approved' || fac.status === 'active') ? 'bg-green-100 text-green-800' :
                        (fac.status === 'Pending' || fac.status === 'pending' || fac.status === 'pending_approval') ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {fac.status === 'pending_approval' ? 'Pending' : fac.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="space-x-2 flex justify-end items-center">
                        {fac.status !== 'Approved' && fac.status !== 'approved' && fac.status !== 'active' && (
                          <button onClick={() => handleStatusChange(fac.id, 'Approved')} className="text-green-600 hover:text-green-900 font-bold border border-green-200 px-2 py-1 rounded hover:bg-green-50 text-xs">Approve</button>
                        )}
                        <button onClick={() => setViewingFaculty(fac)} className="text-purple-600 hover:text-purple-900 bg-purple-50 p-2 rounded-full hover:bg-purple-100" title="View Full Details"><FaEye size={12} /></button>
                        <button onClick={() => setEditingFaculty(fac)} className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-full hover:bg-blue-100" title="Edit"><FaEdit size={12} /></button>
                        <button onClick={() => handleDeleteFaculty(fac.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full hover:bg-red-100" title="Delete"><FaTrash size={12} /></button>
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
              Showing <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, filteredFaculty.length)}</span> of <span className="font-medium">{filteredFaculty.length}</span> faculty
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

      {/* Edit Faculty Modal */}
      {editingFaculty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveEdit} className="bg-white dark:bg-gray-800 p-8 rounded-xl max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Edit Faculty</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input 
                  type="text" 
                  value={editingFaculty.name || ''} 
                  onChange={(e) => setEditingFaculty({...editingFaculty, name: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input 
                  type="email" 
                  value={editingFaculty.email || ''} 
                  onChange={(e) => setEditingFaculty({...editingFaculty, email: e.target.value})}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input 
                  type="text" 
                  value={editingFaculty.phone || ''} 
                  onChange={(e) => setEditingFaculty({...editingFaculty, phone: e.target.value})}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select 
                  value={editingFaculty.status || 'Approved'}
                  onChange={(e) => setEditingFaculty({...editingFaculty, status: e.target.value})}
                  className="input-field cursor-pointer"
                >
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subjects Assigned (Comma Separated)</label>
                <input 
                  type="text" 
                  value={(editingFaculty.assignedSubjects || []).join(', ')} 
                  onChange={(e) => setEditingFaculty({...editingFaculty, assignedSubjects: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                  className="input-field"
                  placeholder="e.g. Data Structures, Algorithms"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sections Handled (Comma Separated)</label>
                <input 
                  type="text" 
                  value={(editingFaculty.sectionsHandled || []).join(', ')} 
                  onChange={(e) => setEditingFaculty({...editingFaculty, sectionsHandled: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                  className="input-field"
                  placeholder="e.g. CSE-A, CSE-B"
                />
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button type="button" onClick={() => setEditingFaculty(null)} className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium">
                Cancel
              </button>
              <button type="submit" className="flex-1 py-2 btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Faculty Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddFaculty} className="bg-white dark:bg-gray-800 p-8 rounded-xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 dark:text-white">Add New Faculty</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input type="text" value={newFaculty.name} onChange={(e) => setNewFaculty({...newFaculty, name: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Faculty ID (100-999)</label>
                <input type="text" value={newFaculty.facultyId} onChange={(e) => setNewFaculty({...newFaculty, facultyId: e.target.value})} className="input-field" required pattern="^[1-9][0-9]{2}$" title="Must be a 3-digit number between 100 and 999" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input type="email" value={newFaculty.email} onChange={(e) => setNewFaculty({...newFaculty, email: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temporary Password</label>
                <input type="text" value={newFaculty.password} onChange={(e) => setNewFaculty({...newFaculty, password: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <input type="text" value={newFaculty.department} onChange={(e) => setNewFaculty({...newFaculty, department: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input type="text" value={newFaculty.phone} onChange={(e) => setNewFaculty({...newFaculty, phone: e.target.value})} className="input-field" />
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50" disabled={isAdding}>
                Cancel
              </button>
              <button type="submit" className="flex-1 py-2 btn-primary flex justify-center items-center" disabled={isAdding}>
                {isAdding ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Add Faculty'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Faculty Full Detail Modal */}
      {viewingFaculty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setViewingFaculty(null)} 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white"
            >
              <FaTimes size={20} />
            </button>
            <h3 className="text-2xl font-bold mb-6 dark:text-white border-b pb-2 dark:border-gray-700">Faculty Profile Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg">{viewingFaculty.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Faculty ID</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg">{viewingFaculty.facultyId || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email Address</p>
                <p className="font-bold text-gray-900 dark:text-white">{viewingFaculty.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Phone Number</p>
                <p className="font-bold text-gray-900 dark:text-white">{viewingFaculty.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Department</p>
                <p className="font-bold text-gray-900 dark:text-white">{viewingFaculty.department || 'N/A'}</p>
              </div>
              <div className="col-span-1 md:col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Subjects Assigned</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {viewingFaculty.assignedSubjects && viewingFaculty.assignedSubjects.length > 0 ? (
                    viewingFaculty.assignedSubjects.map((sub, index) => (
                      <span key={index} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                        {sub}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 italic">No subjects assigned</span>
                  )}
                </div>
              </div>
              <div className="col-span-1 md:col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Sections Handled</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {viewingFaculty.sectionsHandled && viewingFaculty.sectionsHandled.length > 0 ? (
                    viewingFaculty.sectionsHandled.map((sec, index) => (
                      <span key={index} className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-1 rounded-full text-sm font-medium">
                        {sec}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 italic">No sections assigned</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t dark:border-gray-700 flex justify-end">
              <button 
                onClick={() => setViewingFaculty(null)} 
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

export default FacultyManagement;
