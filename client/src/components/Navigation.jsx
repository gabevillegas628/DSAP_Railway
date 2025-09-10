// components/Navigation.jsx - Updated with logos at absolute edges
import React from 'react';
import { User, FileText } from 'lucide-react';

const Navigation = ({ currentUser, onLogout }) => {
  // Logo imports (adjust path based on your setup)
  const rutgersLogo = "/images/RSUNJ_H_RED_BLACK_RGB.png";
const waksmanLogo = "/images/wssp-banner-bldg.png";

  const handleLogoutClick = () => {
    console.log('Logout button clicked');
    console.log('Current user role:', currentUser?.role);
    console.log('window.handleStudentLogoutAttempt exists:', !!window.handleStudentLogoutAttempt);

    // Only use the student logout handler for students
    if (currentUser?.role === 'student' && window.handleStudentLogoutAttempt) {
      console.log('Using student logout handler');
      window.handleStudentLogoutAttempt(onLogout);
    } else {
      console.log('Using direct logout');
      onLogout();
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 relative">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logos at absolute edges */}
        <img 
          src={rutgersLogo} 
          alt="Rutgers University" 
          className="absolute left-2 top-1/2 transform -translate-y-1/2 h-10 w-auto z-10"
        />
        <img 
          src={waksmanLogo} 
          alt="Waksman Institute" 
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-12 w-auto z-10"
        />
        
        {/* Original layout unchanged */}
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4 ml-14"> {/* Added left margin to avoid logo overlap */}
            <FileText className="w-8 h-8 text-indigo-600" />
            <h1 className="text-xl font-semibold text-gray-900">WSSP DNA Sequence Analysis Platform</h1>
          </div>

          <div className="flex items-center space-x-4 mr-16"> {/* Added right margin to avoid logo overlap */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{currentUser?.name}</span>
              <span className="text-indigo-600 font-medium capitalize">({currentUser?.role})</span>
            </div>
            <button
              onClick={handleLogoutClick}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;