import React, { useState, useEffect, useRef } from 'react';
import { FaBars, FaSearch, FaBell, FaUserCircle, FaCog, FaSignOutAlt, FaCheckDouble } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { logoutUser } from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const TopNavbar = ({ onMenuClick }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, `notifications/${currentUser.uid}/alerts`),
      orderBy('timestamp', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const notifs = [];
      snapshot.forEach(d => notifs.push({ id: d.id, ...d.data() }));
      setNotifications(notifs);
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    if (!currentUser) return;
    const batch = writeBatch(db);
    notifications.forEach(n => {
      if (!n.read) {
        batch.update(doc(db, `notifications/${currentUser.uid}/alerts`, n.id), { read: true });
      }
    });
    await batch.commit();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  return (
    <header className="bg-primary text-white h-16 fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 shadow-md">
      {/* Left section: Hamburger & Brand */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={onMenuClick}
          className="p-2 rounded-md hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-white"
        >
          <FaBars size={20} />
        </button>
        <div className="flex items-center space-x-2 font-bold text-xl tracking-wide">
          <span className="bg-white text-primary rounded-full w-8 h-8 flex items-center justify-center font-black">
            AI
          </span>
          <span>Smart Attendance Portal</span>
        </div>
      </div>

      {/* Center section: Search (Hidden on small screens) */}
      <div className="hidden md:flex flex-1 max-w-xl mx-8">
        <div className="relative w-full text-gray-800">
          <input 
            type="text" 
            placeholder="Search... (Beta version)" 
            className="w-full py-2 pl-10 pr-4 rounded-full bg-white/90 focus:bg-white focus:outline-none focus:ring-2 focus:ring-white shadow-inner"
          />
          <FaSearch className="absolute left-4 top-3 text-gray-500" />
        </div>
      </div>

      {/* Right section: Profile & Actions */}
      <div className="flex items-center space-x-3 md:space-x-6">
        
        {/* Notifications Dropdown */}
        <div className="relative hidden sm:block" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-primary-dark rounded-full transition-colors"
          >
            <FaBell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-xs w-4 h-4 flex items-center justify-center rounded-full border border-primary">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
              <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-primary hover:text-primary-dark flex items-center">
                    <FaCheckDouble className="mr-1" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`p-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                      <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(n.timestamp?.toDate()).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <button className="p-2 hover:bg-primary-dark rounded-full transition-colors hidden sm:block">
          <FaCog size={18} />
        </button>

        <div className="flex items-center space-x-2 pl-2 border-l border-primary-dark">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold leading-tight">{currentUser?.name || 'Welcome'}</p>
            <p className="text-xs text-primary-light capitalize">{currentUser?.role || 'User'}</p>
          </div>
          <button className="p-1 hover:bg-primary-dark rounded-full transition-colors flex items-center space-x-1">
            <FaUserCircle size={28} />
          </button>
          <button onClick={handleLogout} className="p-2 hover:bg-red-500 rounded-full transition-colors ml-2" title="Logout">
            <FaSignOutAlt size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
