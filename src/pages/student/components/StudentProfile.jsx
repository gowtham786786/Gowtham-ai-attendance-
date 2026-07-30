import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useStudent } from '../../../context/StudentContext';
import { toast } from 'react-toastify';
import { FaLock, FaEdit, FaSave, FaCheckCircle, FaTimesCircle, FaCamera } from 'react-icons/fa';
import FaceRegistration from './FaceRegistration';

const StudentProfile = () => {
  const { studentData } = useStudent();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFaceReg, setShowFaceReg] = useState(false);
  const [localPhoto, setLocalPhoto] = useState(null);

  const displayPhoto = localPhoto || studentData?.facePhotoURL;
  const isRegistered = !!localPhoto || studentData?.faceRegistered;

  const [editForm, setEditForm] = useState({
    phone: studentData?.phone || '',
    address: studentData?.address || ''
  });

  if (!studentData) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'students', studentData.id), {
        phone: editForm.phone,
        address: editForm.address
      });
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const LockedField = ({ label, value }) => (
    <div>
      <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center space-x-1">
        <span>{label}</span>
        <FaLock className="text-xs text-gray-400" title="Managed by Admin" />
      </label>
      <p className="mt-1 text-gray-900 dark:text-gray-100 font-medium bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
        {value || 'N/A'}
      </p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="glass-card p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-primary">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden border-2 border-primary">
              {displayPhoto ? (
                <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <FaCamera className="text-gray-400 text-2xl" />
              )}
            </div>
            {isRegistered && (
              <div className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full p-1 border-2 border-white dark:border-gray-900" title="Face Registered">
                <FaCheckCircle className="text-xs" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{studentData.name}</h2>
            <p className="text-gray-500 dark:text-gray-400">{studentData.studentId}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${studentData.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {studentData.status}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium flex items-center space-x-1 ${isRegistered ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {isRegistered ? <><FaCheckCircle /> <span>Face Registered</span></> : <><FaTimesCircle /> <span>No Face Data</span></>}
              </span>
            </div>
          </div>
        </div>

        {!isRegistered && (
           <button onClick={() => setShowFaceReg(!showFaceReg)} className="btn-primary flex items-center space-x-2">
             <FaCamera /> <span>{showFaceReg ? 'Cancel Face Reg' : 'Register Face Now'}</span>
           </button>
        )}
      </div>

      {showFaceReg && !isRegistered && (
        <FaceRegistration onComplete={(url) => {
          if(url) setLocalPhoto(url);
          setShowFaceReg(false);
        }} />
      )}

      <div className="glass-card p-6 rounded-2xl">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Profile Information</h3>
          {isEditing ? (
            <div className="flex space-x-3">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={loading} className="btn-primary flex items-center space-x-2 py-2 text-sm">
                <FaSave /> <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} className="flex items-center space-x-2 text-primary hover:text-primary-dark transition-colors px-3 py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20">
              <FaEdit /> <span>Edit Profile</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LockedField label="Full Name" value={studentData.name} />
          <LockedField label="Student ID / Register No." value={studentData.studentId} />
          <LockedField label="Email Address" value={studentData.email} />
          <LockedField label="Branch / Department" value={studentData.department} />
          <LockedField label="Year" value={studentData.year} />
          <LockedField label="Section" value={studentData.section} />
          <LockedField label="Gender" value={studentData.gender} />

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-1">
              <span>Mobile Number</span>
              {!isEditing && <FaEdit className="text-xs text-gray-400" title="Editable" />}
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                className="input-field mt-1 w-full"
              />
            ) : (
              <p className="mt-1 text-gray-900 dark:text-gray-100 font-medium p-2">{studentData.phone || 'N/A'}</p>
            )}
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center space-x-1">
              <span>Home Address</span>
              {!isEditing && <FaEdit className="text-xs text-gray-400" title="Editable" />}
            </label>
            {isEditing ? (
              <textarea
                value={editForm.address}
                onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                className="input-field mt-1 w-full h-24"
                placeholder="Enter your complete residential address"
              />
            ) : (
              <p className="mt-1 text-gray-900 dark:text-gray-100 font-medium p-2 bg-gray-50 dark:bg-gray-800 rounded border border-transparent min-h-[3rem]">
                {studentData.address || 'Address not provided'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
