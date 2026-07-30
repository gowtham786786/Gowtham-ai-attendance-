import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import DashboardCard from '../../../components/ui/DashboardCard';
import { generateUniversityData } from '../../../utils/seedFirestore';
import { FaDatabase, FaSpinner, FaSave, FaExclamationTriangle, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  const [minAttendance, setMinAttendance] = useState(75);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'global'));
        if (docSnap.exists() && docSnap.data().minAttendance) {
          setMinAttendance(docSnap.data().minAttendance);
        }
      } catch(err) {
        console.error("Failed to load settings:", err);
      }
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), { minAttendance }, { merge: true });
      toast.success('Global settings updated successfully');
    } catch(err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeed = async () => {
    if (!window.confirm("WARNING: This will generate a massive amount of data (thousands of records) into your Firestore database. Are you sure you want to proceed?")) {
      return;
    }
    setLoading(true);
    setProgress('Initializing Seeder...');
    try {
      await generateUniversityData((msg) => setProgress(msg));
      toast.success('Demo data generated successfully');
    } catch (error) {
      console.error(error);
      alert("Error seeding data. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!window.confirm("DANGER: Are you absolutely sure you want to delete ALL historical data (students, faculty, attendance, timetable)? This cannot be undone.")) return;
    if (prompt("Type 'DELETE' to confirm:") !== "DELETE") return;

    setLoading(true);
    setProgress("Deleting all collections... this may take a while.");
    
    try {
      const collectionsToDelete = ['students', 'faculty', 'timetable', 'attendance', 'attendance_audit'];
      
      for (let col of collectionsToDelete) {
        setProgress(`Deleting ${col}...`);
        const snapshot = await getDocs(collection(db, col));
        const deletePromises = [];
        snapshot.forEach(d => {
          deletePromises.push(deleteDoc(d.ref));
        });
        await Promise.all(deletePromises);
      }
      
      toast.success('All historical data deleted successfully.');
      setProgress('');
    } catch(err) {
      console.error(err);
      toast.error('Failed to delete all data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardCard title="System Settings" subtitle="Global configurations and thresholds for the application.">
      <div className="py-6 flex flex-col space-y-12">
        
        {/* Global Settings */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm max-w-xl">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Attendance Parameters</h3>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Minimum Attendance Required (%)
              </label>
              <input 
                type="number" 
                min="0" max="100"
                value={minAttendance}
                onChange={(e) => setMinAttendance(parseInt(e.target.value) || 0)}
                className="input-field max-w-xs"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Students below this threshold will be flagged as defaulters.</p>
            </div>
            
            <button 
              type="submit" 
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              <FaSave />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </form>
        </div>

        {/* Development Tools */}
        <div className="mt-8 p-6 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900 rounded-xl max-w-xl">
          <h3 className="text-lg font-bold text-red-800 dark:text-red-400 mb-2">Development Tools</h3>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4">
            Need test data? You can automatically generate realistic students, faculty, timetables, and attendance records.
          </p>
          <button 
            onClick={handleSeed}
            disabled={loading}
            className="w-full flex justify-center items-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaDatabase />}
            <span>{loading ? 'Generating...' : 'Generate University Demo Data'}</span>
          </button>
        </div>

        {/* Danger Zone */}
        <div className="p-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-xl max-w-xl">
          <div className="flex items-center space-x-2 mb-2">
            <FaExclamationTriangle className="text-red-600 dark:text-red-400" size={20} />
            <h3 className="text-xl font-bold text-red-800 dark:text-red-400">Danger Zone</h3>
          </div>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4">
            Irreversibly delete all historical data (Students, Faculty, Timetables, and Attendance). This action cannot be undone!
          </p>
          <button 
            onClick={handleDeleteAllData}
            disabled={loading}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaTrash />}
            <span>Delete All Historical Data</span>
          </button>
          
          {progress && (
            <div className="mt-4 text-sm font-medium text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              {progress}
            </div>
          )}
        </div>
      </div>
    </DashboardCard>
  );
};

export default Settings;
