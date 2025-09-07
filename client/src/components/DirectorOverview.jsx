// components/DirectorOverview.jsx
import React, { useState, useEffect } from 'react';
import { School, Users, CheckCircle, Upload, X } from 'lucide-react';
import { useDNAContext } from '../context/DNAContext';
import apiService from '../services/apiService';

const DirectorOverview = ({ onNavigateToTab }) => {
  const { currentUser } = useDNAContext();
  const [schools, setSchools] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // NEW: Upload functionality state (copied from DirectorCloneLibrary)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Fetch all data on component mount
  useEffect(() => {
    console.log('DirectorOverview mounted, calling fetchAllData');
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      console.log('fetchAllData starting...');
      setLoading(true);
      await Promise.all([
        fetchSchools(),
        fetchUploadedFiles(),
        fetchStudents()
      ]);
      console.log('fetchAllData completed');
    } catch (error) {
      console.error('Error fetching overview data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const data = await apiService.get('/schools');
      setSchools(data);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      const data = await apiService.get('/uploaded-files');
      setUploadedFiles(data);
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await apiService.get('/users?role=student&status=approved');
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  // NEW: Upload functionality (copied from DirectorCloneLibrary)
  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);

    try {
      const formData = new FormData();

      // Add all selected files
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      // Add the current user ID as the uploader
      formData.append('uploadedById', currentUser.id);

      const newFiles = await apiService.uploadFiles('/uploaded-files', formData);
      
      // Update the uploadedFiles state with new files
      setUploadedFiles(prev => [...newFiles, ...prev]);
      setShowUploadModal(false);
      
      // Reset the file input
      event.target.value = '';
      
      console.log(`Successfully uploaded ${newFiles.length} files`);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert(error.message || 'Failed to upload files');
    } finally {
      setUploadingFiles(false);
    }
  };

  // Calculate real completion rate from uploaded files
  const calculateCompletionRate = () => {
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return 0;
    }

    // Count files that are completed (100% progress)
    const completedFiles = uploadedFiles.filter(file => file.progress === 100);
    const completionRate = Math.round((completedFiles.length / uploadedFiles.length) * 100);

    return completionRate;
  };

  // Calculate average progress across all files
  const calculateAverageProgress = () => {
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return 0;
    }

    const totalProgress = uploadedFiles.reduce((sum, file) => sum + (file.progress || 0), 0);
    return Math.round(totalProgress / uploadedFiles.length);
  };

  const completionRate = calculateCompletionRate();
  const averageProgress = calculateAverageProgress();

  // Calculate total students from actual student records rather than school.students field
  const totalStudents = students.length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border animate-pulse">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 rounded"></div>
                <div className="ml-4 space-y-2">
                  <div className="w-20 h-4 bg-gray-300 rounded"></div>
                  <div className="w-12 h-8 bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center space-x-3">
          <X className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700">{error}</p>
            <button 
              onClick={fetchAllData}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Schools Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center">
            <School className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Schools</p>
              <p className="text-2xl font-bold text-gray-900">{schools.length}</p>
            </div>
          </div>
        </div>

        {/* Students Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Active Students</p>
              <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Schools Overview */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Schools Overview</h3>
            <p className="text-sm text-gray-600 mt-1">Registered institutions</p>
          </div>
          <div className="p-6">
            {schools.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <School className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No schools registered yet</p>
                <button
                  onClick={() => onNavigateToTab && onNavigateToTab('schools')}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mt-2"
                >
                  Add your first school →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {schools.map(school => (
                  <div key={school.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{school.name}</h4>
                      <p className="text-sm text-gray-600">
                        Instructor: {school.instructor || 'Unassigned'}
                      </p>
                      <p className="text-xs text-gray-500">ID: {school.schoolId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {students.filter(student => student.school?.id === school.id).length}
                      </p>
                      <p className="text-sm text-gray-500">students</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* File Management */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">File Management</h3>
              <p className="text-sm text-gray-600 mt-1">Recent analysis files</p>
            </div>
            {/* UPDATED: Now functional upload button */}
            <button 
              onClick={() => setShowUploadModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition duration-200"
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Upload Files
            </button>
          </div>
          <div className="p-6">
            {uploadedFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No files uploaded yet</p>
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mt-2"
                >
                  Upload your first .ab1 files →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {uploadedFiles.slice(0, 5).map(file => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm text-gray-900 truncate">{file.filename}</p>
                      <p className="text-xs text-gray-600">
                        {file.assignedTo ?
                          `${file.assignedTo.name} - ${file.assignedTo.school?.name || 'No school'}` :
                          'Unassigned'
                        }
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <div className="text-sm text-gray-600">{file.progress || 0}%</div>
                      {/* Visual progress indicator */}
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${(file.progress || 0) === 100 ?
                            'bg-green-500' : 'bg-blue-500'
                            }`}
                          style={{ width: `${file.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Show "view all" link if there are more files */}
                {uploadedFiles.length > 5 && (
                  <div className="text-center pt-3">
                    <button 
                      onClick={() => onNavigateToTab && onNavigateToTab('clone-library')}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      View all {uploadedFiles.length} files →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats Bar */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{uploadedFiles.filter(f => f.progress > 0 && f.progress < 100).length}</p>
            <p className="text-sm text-blue-800">In Progress</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{uploadedFiles.filter(f => f.progress === 100).length}</p>
            <p className="text-sm text-green-800">Completed</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{uploadedFiles.filter(f => !f.assignedTo).length}</p>
            <p className="text-sm text-yellow-800">Unassigned</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{uploadedFiles.length}</p>
            <p className="text-sm text-purple-800">Total Files</p>
          </div>
        </div>
      </div>

      {/* NEW: Upload Modal (copied from DirectorCloneLibrary) */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Upload .ab1 Files</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploadingFiles}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select DNA sequence files (.ab1)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".ab1"
                  onChange={handleFileUpload}
                  disabled={uploadingFiles}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">File Requirements:</p>
                  <ul className="space-y-1">
                    <li>• Only .ab1 files are accepted</li>
                    <li>• Multiple files can be selected</li>
                    <li>• Maximum file size: 10MB per file</li>
                    <li>• Files will be available for assignment after upload</li>
                  </ul>
                </div>
              </div>
              {uploadingFiles && (
                <div className="text-center py-4">
                  <p className="text-indigo-600">Uploading files...</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploadingFiles}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-200 disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DirectorOverview;