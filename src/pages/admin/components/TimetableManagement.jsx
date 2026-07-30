import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, updateDoc, deleteDoc, onSnapshot, addDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaCalendarAlt, FaTimes, FaCopy } from 'react-icons/fa';
import DashboardCard from '../../../components/ui/DashboardCard';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [1, 2, 3, 4, 5, 6];

const TimetableManagement = () => {
  const [timetable, setTimetable] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editingId, setEditingId] = useState(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [targetCopyParams, setTargetCopyParams] = useState({ department: '', year: '', section: '' });
  const [formData, setFormData] = useState({
    department: '',
    year: '',
    section: '',
    day: 'Monday',
    periodNumber: 1,
    subject: '',
    facultyId: ''
  });

  // Fetch Data using onSnapshot
  useEffect(() => {
    setLoading(true);
    let unsubscribeTimetable = () => {};
    let unsubscribeFaculty = () => {};

    try {
      unsubscribeTimetable = onSnapshot(collection(db, 'timetable'), 
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTimetable(data);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("Timetable fetch error:", err);
          setError(err.message);
          setLoading(false);
        }
      );

      unsubscribeFaculty = onSnapshot(collection(db, 'faculty'), 
        (snapshot) => {
          const facultyData = snapshot.docs.map(doc => ({
            id: doc.id,
            uid: doc.id,
            name: doc.data().name
          }));
          setFacultyList(facultyData);
        },
        (err) => console.error("Faculty fetch error:", err)
      );

    } catch (err) {
      console.error(err);
      setError("Failed to initialize Firebase listeners.");
      setLoading(false);
    }

    return () => {
      unsubscribeTimetable();
      unsubscribeFaculty();
    };
  }, []);

  // Compute unique dropdown options from live timetable data
  const filterOptions = useMemo(() => {
    const depts = new Set();
    const years = new Set();
    const sections = new Set();
    
    timetable.forEach(t => {
      if (t.department) depts.add(t.department);
      if (t.year) years.add(t.year);
      if (t.section) sections.add(t.section);
    });

    return {
      departments: Array.from(depts).sort(),
      years: Array.from(years).sort(),
      sections: Array.from(sections).sort()
    };
  }, [timetable]);

  // Set default filters if none selected but options exist
  useEffect(() => {
    if (!selectedDept && filterOptions.departments.length > 0) setSelectedDept(filterOptions.departments[0]);
    if (!selectedYear && filterOptions.years.length > 0) setSelectedYear(filterOptions.years[0]);
    if (!selectedSection && filterOptions.sections.length > 0) setSelectedSection(filterOptions.sections[0]);
  }, [filterOptions, selectedDept, selectedYear, selectedSection]);

  // Filtered timetable for the grid
  const currentGridData = useMemo(() => {
    return timetable.filter(t => 
      t.department === selectedDept && 
      t.year === selectedYear && 
      t.section === selectedSection
    );
  }, [timetable, selectedDept, selectedYear, selectedSection]);

  // Handle Form Submission (Add or Edit)
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const faculty = facultyList.find(f => f.uid === formData.facultyId);
      const facultyName = faculty ? faculty.name : 'Unknown Faculty';

      const payload = {
        ...formData,
        periodNumber: parseInt(formData.periodNumber),
        period: `Period ${formData.periodNumber}`,
        facultyName,
      };

      if (modalMode === 'edit' && editingId) {
        await updateDoc(doc(db, 'timetable', editingId), payload);
        toast.success("Timetable updated successfully");
      } else {
        // Create custom ID format: CSE_1_A_Monday_1
        const customId = `${payload.department.replace(/\s+/g, '_')}_${payload.year}_${payload.section}_${payload.day}_${payload.periodNumber}`;
        await setDoc(doc(db, 'timetable', customId), {
          ...payload,
          id: customId
        });
        toast.success("Timetable added successfully");
      }
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error(`Error saving timetable: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this class slot?")) return;
    try {
      await deleteDoc(doc(db, 'timetable', id));
      toast.success("Timetable slot deleted");
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error("Error deleting slot");
    }
  };

  const openCopyModal = () => {
    if (!selectedDept || !selectedYear || !selectedSection) {
      toast.warning('Please select a source Department, Year, and Section to copy from.');
      return;
    }
    if (currentGridData.length === 0) {
      toast.warning('No timetable slots exist for this section to copy.');
      return;
    }
    setTargetCopyParams({ department: '', year: '', section: '' });
    setIsCopyModalOpen(true);
  };

  const handleCopyTimetable = async (e) => {
    e.preventDefault();
    if (!targetCopyParams.department || !targetCopyParams.year || !targetCopyParams.section) {
      toast.error("Please provide target department, year, and section.");
      return;
    }

    try {
      const copyPromises = currentGridData.map(slot => {
        const payload = {
          ...slot,
          department: targetCopyParams.department,
          year: targetCopyParams.year,
          section: targetCopyParams.section,
        };
        delete payload.id;
        const customId = `${payload.department.replace(/\s+/g, '_')}_${payload.year}_${payload.section}_${payload.day}_${payload.periodNumber}`;
        payload.id = customId;
        
        return setDoc(doc(db, 'timetable', customId), payload);
      });

      await Promise.all(copyPromises);
      toast.success("Timetable copied successfully!");
      setIsCopyModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(`Error copying timetable: ${err.message}`);
    }
  };

  const openAddModal = (day = 'Monday', period = 1) => {
    setModalMode('add');
    setEditingId(null);
    setFormData({
      department: selectedDept || (filterOptions.departments[0] || ''),
      year: selectedYear || (filterOptions.years[0] || ''),
      section: selectedSection || (filterOptions.sections[0] || ''),
      day: day,
      periodNumber: period,
      subject: '',
      facultyId: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (slotData) => {
    setModalMode('edit');
    setEditingId(slotData.id);
    setFormData({
      department: slotData.department,
      year: slotData.year,
      section: slotData.section,
      day: slotData.day,
      periodNumber: slotData.periodNumber,
      subject: slotData.subject,
      facultyId: slotData.facultyId || ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Helper to find slot data for a specific day and period
  const getSlot = (day, period) => {
    return currentGridData.find(t => t.day === day && t.periodNumber === period);
  };

  if (error) {
    return (
      <DashboardCard title="Timetable Management">
        <div className="py-12 flex flex-col items-center text-red-500">
           <p className="text-xl font-bold mb-2">Firebase Error</p>
           <p className="text-sm bg-red-100 p-4 rounded text-red-800">{error}</p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardCard 
        title="Timetable Management" 
        subtitle="Manage weekly class schedules across all departments."
        actionButton={
          <div className="flex space-x-2">
            <button onClick={openCopyModal} className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors shadow-sm">
              <FaCopy /> <span>Copy Timetable</span>
            </button>
            <button onClick={() => openAddModal()} className="btn-primary flex items-center space-x-2 text-sm">
              <FaPlus /> <span>Add Class Slot</span>
            </button>
          </div>
        }
      >
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Department</label>
            <select 
              value={selectedDept} 
              onChange={(e) => setSelectedDept(e.target.value)}
              className="input-field cursor-pointer"
            >
              <option value="">Select Dept</option>
              {filterOptions.departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="w-full md:w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Year</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="input-field cursor-pointer"
            >
              <option value="">Select Year</option>
              {filterOptions.years.map(y => <option key={y} value={y}>{y} Year</option>)}
            </select>
          </div>
          <div className="w-full md:w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Section</label>
            <select 
              value={selectedSection} 
              onChange={(e) => setSelectedSection(e.target.value)}
              className="input-field cursor-pointer"
            >
              <option value="">Select Section</option>
              {filterOptions.sections.map(s => <option key={s} value={s}>Section {s}</option>)}
            </select>
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="overflow-x-auto pb-4">
          {loading ? (
             <div className="py-20 flex flex-col justify-center items-center text-gray-500">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
               <span>Loading real-time timetable...</span>
             </div>
          ) : !selectedDept || !selectedYear || !selectedSection ? (
             <div className="py-12 text-center text-gray-500">
               <FaCalendarAlt className="mx-auto text-4xl mb-3 text-gray-300" />
               <p>Please select Department, Year, and Section to view timetable.</p>
             </div>
          ) : (
            <div className="min-w-[800px] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-center border-collapse">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="py-4 px-2 border-r border-white/20 font-bold uppercase tracking-wider text-sm w-24">Day</th>
                    {PERIODS.map(p => (
                      <React.Fragment key={p}>
                        <th className="py-4 px-2 border-r border-white/20 font-bold uppercase tracking-wider text-sm w-40">
                          Period {p}
                        </th>
                        {p === 4 && (
                          <th className="py-4 px-2 border-r border-white/20 font-bold uppercase tracking-wider text-xs w-24 bg-white/10">
                            LUNCH
                          </th>
                        )}
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 text-sm">
                  {DAYS.map((day, dayIndex) => (
                    <tr key={day} className={dayIndex % 2 === 0 ? 'bg-gray-50/50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900/30'}>
                      <td className="py-4 px-2 font-bold text-gray-700 dark:text-gray-300 border-r border-b border-gray-200 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/80">
                        {day}
                      </td>
                      
                      {PERIODS.map(period => {
                        const slot = getSlot(day, period);
                        return (
                          <React.Fragment key={`${day}-${period}`}>
                            <td 
                              className={`p-2 border-r border-b border-gray-200 dark:border-gray-700 relative group transition-colors`}
                            >
                              {slot ? (
                                <div 
                                  onClick={() => openEditModal(slot)}
                                  className="h-full min-h-[80px] p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 flex flex-col justify-center items-center cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                                >
                                  <span className="font-bold text-gray-900 dark:text-white block mb-1 leading-tight text-[13px] text-center">{slot.subject}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 block text-center">{slot.facultyName}</span>
                                  
                                  {/* Hover overlay for edit */}
                                  <div className="absolute inset-0 bg-black/10 dark:bg-white/5 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
                                     <FaEdit className="text-gray-700 dark:text-gray-300 drop-shadow-md" size={20} />
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  onClick={() => openAddModal(day, period)}
                                  className="h-full min-h-[80px] p-2 rounded-lg border-2 border-dashed border-transparent flex flex-col justify-center items-center cursor-pointer group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-colors"
                                >
                                  <FaPlus className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  <span className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 mt-1">Add Class</span>
                                </div>
                              )}
                            </td>
                            {period === 4 && (
                              <td className="bg-gray-100 dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 align-middle">
                                <div className="h-full min-h-[80px] flex items-center justify-center">
                                  <span style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }} className="font-bold text-gray-400 tracking-[0.2em] text-xs uppercase transform rotate-180">
                                    Lunch
                                  </span>
                                </div>
                              </td>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DashboardCard>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl max-w-lg w-full shadow-2xl relative">
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <FaTimes size={20} />
            </button>
            
            <h3 className="text-xl font-bold mb-6 dark:text-white flex items-center">
              {modalMode === 'add' ? 'Add Timetable Slot' : 'Edit Timetable Slot'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Day</label>
                  <select 
                    value={formData.day} 
                    onChange={(e) => setFormData({...formData, day: e.target.value})}
                    className="input-field"
                    required
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Period</label>
                  <select 
                    value={formData.periodNumber} 
                    onChange={(e) => setFormData({...formData, periodNumber: parseInt(e.target.value)})}
                    className="input-field"
                    required
                  >
                    {PERIODS.map(p => <option key={p} value={p}>Period {p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject Name</label>
                <input 
                  type="text" 
                  value={formData.subject} 
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="input-field"
                  placeholder="e.g. Data Structures"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Faculty</label>
                <select 
                  value={formData.facultyId} 
                  onChange={(e) => setFormData({...formData, facultyId: e.target.value})}
                  className="input-field"
                  required
                >
                  <option value="">-- Select Faculty --</option>
                  {facultyList.map(f => (
                    <option key={f.uid} value={f.uid}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mt-4 border border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 uppercase font-bold mb-2">Target Audience</p>
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="input-field text-sm p-2" placeholder="Dept" required />
                  <input type="text" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className="input-field text-sm p-2" placeholder="Year" required />
                  <input type="text" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="input-field text-sm p-2" placeholder="Section" required />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                {modalMode === 'edit' && (
                  <button 
                    type="button" 
                    onClick={() => handleDelete(editingId)} 
                    className="px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors flex items-center justify-center"
                    title="Delete Slot"
                  >
                    <FaTrash />
                  </button>
                )}
                <button type="button" onClick={closeModal} className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium">
                  Cancel
                </button>
                <button type="submit" className="flex-[2] py-2 btn-primary">
                  {modalMode === 'add' ? 'Save Class' : 'Update Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Copy Timetable Modal */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setIsCopyModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <FaTimes size={20} />
            </button>
            
            <h3 className="text-xl font-bold mb-4 dark:text-white flex items-center">
              Copy Timetable
            </h3>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 border-b pb-4 dark:border-gray-700">
              Copying all <strong>{currentGridData.length}</strong> slots from <br/> 
              <span className="font-semibold text-primary">{selectedDept} - {selectedYear} Year - Section {selectedSection}</span>
            </p>

            <form onSubmit={handleCopyTimetable} className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Department</label>
                <input 
                  type="text" 
                  value={targetCopyParams.department} 
                  onChange={(e) => setTargetCopyParams({...targetCopyParams, department: e.target.value})}
                  className="input-field"
                  placeholder="e.g. CSE"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Year</label>
                <input 
                  type="text" 
                  value={targetCopyParams.year} 
                  onChange={(e) => setTargetCopyParams({...targetCopyParams, year: e.target.value})}
                  className="input-field"
                  placeholder="e.g. 2nd"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Section</label>
                <input 
                  type="text" 
                  value={targetCopyParams.section} 
                  onChange={(e) => setTargetCopyParams({...targetCopyParams, section: e.target.value})}
                  className="input-field"
                  placeholder="e.g. B"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setIsCopyModalOpen(false)} className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium">
                  Cancel
                </button>
                <button type="submit" className="flex-[2] py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                  Confirm Copy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableManagement;
