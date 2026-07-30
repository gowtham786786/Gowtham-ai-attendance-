import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useFaculty } from '../../../context/FacultyContext';
import { toast } from 'react-toastify';
import DashboardCard from '../../../components/ui/DashboardCard';
import { FaLock, FaSave, FaUserCircle, FaInfoCircle } from 'react-icons/fa';

const FacultyProfile = () => {
  const { facultyData } = useFaculty();
  
  // Editable fields
  const [formData, setFormData] = useState({
    phone: facultyData?.phone || '',
    address: facultyData?.address || '',
    emergencyContact: facultyData?.emergencyContact || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'faculty', facultyData.id), {
        phone: formData.phone,
        address: formData.address,
        emergencyContact: formData.emergencyContact
      });
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!facultyData) return null;

  return (
    <div className="space-y-6">
      
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center space-x-6">
        <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-4 border-white dark:border-gray-800 shadow-lg">
          {facultyData.profilePhoto ? (
            <img src={facultyData.profilePhoto} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <FaUserCircle className="text-gray-400 dark:text-gray-500 h-20 w-20" />
          )}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{facultyData.name}</h2>
          <p className="text-primary dark:text-primary-light font-medium">{facultyData.designation || 'Faculty Member'}</p>
          <div className="flex items-center space-x-2 mt-2">
            <span className={`px-2 py-1 text-xs rounded-full font-bold ${facultyData.status === 'Active' || facultyData.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              Status: {facultyData.status}
            </span>
            <span className="text-gray-500 text-sm flex items-center">
              <FaLock className="mr-1 text-xs" /> Role Managed by Admin
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Editable Settings */}
        <DashboardCard title="Personal Information" subtitle="Update your contact details here.">
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
              <input 
                type="text" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="input-field" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
              <textarea 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="input-field min-h-[80px]" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Emergency Contact</label>
              <input 
                type="text" 
                value={formData.emergencyContact}
                onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                className="input-field" 
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isSaving}
              className="mt-4 bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              <FaSave />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </form>
        </DashboardCard>

        {/* Locked Admin Settings */}
        <DashboardCard title="University Assignments" subtitle="These fields are managed by the administration." actionButton={<FaInfoCircle className="text-gray-400" title="Contact Admin to change these fields" />}>
          <div className="space-y-5 mt-2 bg-gray-50 dark:bg-gray-900/50 p-5 rounded-lg border border-gray-100 dark:border-gray-800">
            
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center">
                 Faculty ID <FaLock className="ml-2 text-gray-400" size={10} title="Managed by Admin"/>
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">{facultyData.id.slice(0,6).toUpperCase()}</span>
            </div>

            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center">
                 Email <FaLock className="ml-2 text-gray-400" size={10} title="Managed by Admin"/>
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">{facultyData.email}</span>
            </div>

            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center">
                 Department <FaLock className="ml-2 text-gray-400" size={10} title="Managed by Admin"/>
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">{facultyData.department || 'Not Assigned'}</span>
            </div>

            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center">
                 Assigned Subjects <FaLock className="ml-2 text-gray-400" size={10} title="Managed by Admin"/>
              </span>
              <div className="flex flex-wrap justify-end gap-1 max-w-[200px]">
                {facultyData.assignedSubjects && facultyData.assignedSubjects.length > 0 ? (
                  facultyData.assignedSubjects.map(sub => (
                    <span key={sub} className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-md">{sub}</span>
                  ))
                ) : (
                  <span className="text-gray-400 italic">None</span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pb-1">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center">
                 Sections Handled <FaLock className="ml-2 text-gray-400" size={10} title="Managed by Admin"/>
              </span>
              <div className="flex flex-wrap justify-end gap-1 max-w-[200px]">
                {facultyData.sectionsHandled && facultyData.sectionsHandled.length > 0 ? (
                  facultyData.sectionsHandled.map(sec => (
                    <span key={sec} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-md">{sec}</span>
                  ))
                ) : (
                  <span className="text-gray-400 italic">None</span>
                )}
              </div>
            </div>

          </div>
        </DashboardCard>
      </div>

    </div>
  );
};

export default FacultyProfile;
