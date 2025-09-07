// components/DirectorCloneLibrary.jsx
import React, { useState, useEffect } from 'react';
import { Upload, Download, Trash2, Search, X } from 'lucide-react';
import { useDNAContext } from '../context/DNAContext';
import DirectorPracticeAnswers from './DirectorPracticeAnswers';
import apiService from '../services/apiService';

// Add these imports after your existing imports
import {
  CLONE_STATUSES,
  getStatusConfig,
  validateAndWarnStatus,
  STATUS_DROPDOWN_OPTIONS
} from '../statusConstraints.js';

const DirectorCloneLibrary = () => {
  const { currentUser } = useDNAContext();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    status: '',
    assignedStudent: '',
    school: ''
  });

  // NEW: Pagination state
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);


  // NEW: Practice clone state
  const [uploadMode, setUploadMode] = useState('regular'); // 'regular' or 'practice'
  const [practiceClones, setPracticeClones] = useState([]);
  const [showPracticeUploadModal, setShowPracticeUploadModal] = useState(false);
  const [showPracticeAnswersModal, setShowPracticeAnswersModal] = useState(false);
  const [selectedPracticeClone, setSelectedPracticeClone] = useState(null);


  // Update your useEffect to fetch both normal and practice clones
  useEffect(() => {
    fetchUploadedFiles();
    fetchStudents();
    fetchPracticeClones();
  }, []);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchFilters]);

  const openPracticeAnswersModal = (practiceClone) => {
    setSelectedPracticeClone(practiceClone);
    setShowPracticeAnswersModal(true);
  };

  const togglePracticeCloneStatus = async (cloneId, newStatus) => {
    try {
      const updatedClone = await apiService.put(`/practice-clones/${cloneId}/status`,
        { isActive: newStatus }
      );
      setPracticeClones(prev => prev.map(clone =>
        clone.id === cloneId ? updatedClone : clone
      ));
    } catch (error) {
      console.error('Error updating practice clone status:', error);
    }
  };

  const deletePracticeClone = async (cloneId) => {
    if (window.confirm('Are you sure you want to delete this practice clone? This action cannot be undone.')) {
      try {
        await apiService.delete(`/practice-clones/${cloneId}`);
        setPracticeClones(prev => prev.filter(clone => clone.id !== cloneId));
      } catch (error) {
        console.error('Error deleting practice clone:', error);
        alert('Failed to delete practice clone');
      }
    }
  };

  // NEW: Search and filter logic
  const getFilteredFiles = () => {
    let filtered = uploadedFiles;

    // Text search across multiple fields
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(file =>
        file.cloneName.toLowerCase().includes(term) ||
        file.originalName.toLowerCase().includes(term) ||
        file.assignedTo?.name.toLowerCase().includes(term) ||
        file.assignedTo?.school?.name.toLowerCase().includes(term) ||
        file.status.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (searchFilters.status) {
      filtered = filtered.filter(file => file.status === searchFilters.status);
    }

    // Assigned student filter
    if (searchFilters.assignedStudent) {
      if (searchFilters.assignedStudent === 'unassigned') {
        filtered = filtered.filter(file => !file.assignedTo);
      } else {
        filtered = filtered.filter(file =>
          file.assignedTo?.id === parseInt(searchFilters.assignedStudent)
        );
      }
    }

    // School filter
    if (searchFilters.school) {
      filtered = filtered.filter(file =>
        file.assignedTo?.school?.name === searchFilters.school
      );
    }

    return filtered;
  };

  // NEW: Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setSearchFilters({
      status: '',
      assignedStudent: '',
      school: ''
    });
    setCurrentPage(1);
  };

  const handlePracticeCloneUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);

    try {
      const formData = new FormData();

      // Add all selected files
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const newPracticeClones = await apiService.uploadFiles('/practice-clones/upload', formData);
      setPracticeClones(prev => [...newPracticeClones, ...prev]);
      setShowPracticeUploadModal(false);
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading practice clones:', error);
      alert(error.message || 'Failed to upload practice clones');
    } finally {
      setUploadingFiles(false);
    }
  };

  // NEW: Get unique values for filter dropdowns
  const getUniqueSchools = () => {
    const schools = uploadedFiles
      .map(file => file.assignedTo?.school?.name)
      .filter(Boolean);
    return [...new Set(schools)].sort();
  };

  const getUniqueStatuses = () => {
    const statuses = uploadedFiles.map(file => file.status);
    return [...new Set(statuses)].sort();
  };

  const fetchUploadedFiles = async () => {
    try {
      const data = await apiService.get('/uploaded-files');
      setUploadedFiles(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await apiService.get('/users');
      const approvedStudents = data.filter(user =>
        user.role === 'student' && user.status === 'approved'
      );
      setStudents(approvedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchPracticeClones = async () => {
    try {
      const data = await apiService.get('/practice-clones');
      setPracticeClones(data);
    } catch (error) {
      console.error('Error fetching practice clones:', error);
    }
  };


  const getStatusColor = (status) => {
    // Validate and warn about invalid status
    validateAndWarnStatus(status, 'DirectorCloneLibrary');

    const config = getStatusConfig(status);
    return config.badgeColor;
  };

  const sortTable = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedFiles = () => {
    const filteredFiles = getFilteredFiles(); // Changed this line

    if (!sortConfig.key) return filteredFiles;

    return [...filteredFiles].sort((a, b) => {
      // rest of your existing sorting logic stays the same
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'assignedTo') {
        aVal = a.assignedTo?.name || '';
        bVal = b.assignedTo?.name || '';
      } else if (sortConfig.key === 'school') {
        aVal = a.assignedTo?.school?.name || '';
        bVal = b.assignedTo?.school?.name || '';
      }

      if (!aVal) aVal = '';
      if (!bVal) bVal = '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortConfig.direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  };

  // NEW: Get paginated files
  const getPaginatedFiles = () => {
    const sortedFiles = getSortedFiles();

    if (itemsPerPage === 'all') {
      return sortedFiles;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedFiles.slice(startIndex, endIndex);
  };

  // NEW: Calculate total pages
  const getTotalPages = () => {
    if (itemsPerPage === 'all') return 1;
    const filteredCount = getFilteredFiles().length; // Changed this line
    return Math.ceil(filteredCount / itemsPerPage);
  };

  // NEW: Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

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
      setUploadedFiles(prev => [...newFiles, ...prev]);
      setShowUploadModal(false);
      // Reset the file input
      event.target.value = '';
    } catch (error) {
      console.error('Error uploading files:', error);
      alert(error.message || 'Failed to upload files');
    } finally {
      setUploadingFiles(false);
    }
  };

  const assignFile = async (fileId, studentId) => {
    try {
      const updatedFile = await apiService.put(`/uploaded-files/${fileId}/assign`,
        { assignedToId: studentId }
      );
      setUploadedFiles(prev => prev.map(file =>
        file.id === fileId ? updatedFile : file
      ));
    } catch (error) {
      console.error('Error assigning file:', error);
    }
  };

  const unassignFile = async (fileId) => {
    try {
      const updatedFile = await apiService.put(`/uploaded-files/${fileId}/assign`,
        { assignedToId: null }
      );
      setUploadedFiles(prev => prev.map(file =>
        file.id === fileId ? updatedFile : file
      ));
    } catch (error) {
      console.error('Error unassigning file:', error);
    }
  };

  const updateFileStatus = async (fileId, newStatus) => {
    try {
      const updatedFile = await apiService.put(`/uploaded-files/${fileId}/status`,
        { status: newStatus }
      );
      setUploadedFiles(prev => prev.map(file =>
        file.id === fileId ? updatedFile : file
      ));
    } catch (error) {
      console.error('Error updating file status:', error);
    }
  };

  const downloadFile = async (fileId, originalName) => {
    try {
      const blob = await apiService.downloadBlob(`/uploaded-files/${fileId}/download`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert(error.message || 'Failed to download file');
    }
  };


  const deleteFile = async (fileId) => {
    // First, find the file to check if it's assigned
    const fileToDelete = uploadedFiles.find(file => file.id === fileId);

    // Check if the file is assigned to a student
    if (fileToDelete?.assignedTo) {
      alert(`Cannot delete this clone because it is currently assigned to ${fileToDelete.assignedTo.name} (${fileToDelete.assignedTo.school?.name || 'Unknown School'}).\n\nPlease unassign the clone first before deleting it.`);
      return; // Exit the function without deleting
    }

    // If not assigned, proceed with deletion confirmation
    if (window.confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      try {
        await apiService.delete(`/uploaded-files/${fileId}`);
        setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
      } catch (error) {
        console.error('Error deleting file:', error);
        alert(error.message || 'Failed to delete file');
      }
    }
  };

  const filteredFiles = getFilteredFiles();
  const paginatedFiles = getPaginatedFiles();
  const totalPages = getTotalPages();

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 text-center">
          <p className="text-gray-600">Loading clone library...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Clone Library</h3>
              <p className="text-sm text-gray-600 mt-1">
                {uploadMode === 'regular'
                  ? 'All uploaded DNA sequence clones and their status'
                  : 'Practice clones available to all students'
                }
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setUploadMode('regular')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${uploadMode === 'regular'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Regular Clones ({uploadedFiles.length})
                </button>
                <button
                  onClick={() => setUploadMode('practice')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${uploadMode === 'practice'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Practice Clones ({practiceClones.length})
                </button>
              </div>

              {/* Upload Button */}
              <button
                onClick={() => {
                  if (uploadMode === 'regular') {
                    setShowUploadModal(true);
                  } else {
                    setShowPracticeUploadModal(true);
                  }
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition duration-200"
              >
                <Upload className="w-4 h-4 inline mr-2" />
                {uploadMode === 'regular' ? 'Upload Student Clones' : 'Upload Practice Clones'}
              </button>
            </div>
          </div>

          {/* NEW: Search and Filter Section */}
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search clones, files, students, schools, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Filters:</span>

                {/* Status Filter */}
                <select
                  value={searchFilters.status}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="">All Statuses</option>
                  {getUniqueStatuses().map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>

                {/* Student Filter */}
                <select
                  value={searchFilters.assignedStudent}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, assignedStudent: e.target.value }))}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="">All Students</option>
                  <option value="unassigned">Unassigned</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>

                {/* School Filter */}
                <select
                  value={searchFilters.school}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, school: e.target.value }))}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="">All Schools</option>
                  {getUniqueSchools().map(school => (
                    <option key={school} value={school}>{school}</option>
                  ))}
                </select>

                {/* Clear Filters Button */}
                {(searchTerm || searchFilters.status || searchFilters.assignedStudent || searchFilters.school) && (
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Items per page */}
              <div className="flex items-center space-x-2 ml-auto">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="all">All</option>
                </select>
                <span className="text-sm text-gray-600">clones</span>
              </div>
            </div>

            {/* Results Summary */}
            <div className="text-sm text-gray-600">
              Showing {filteredFiles.length} of {uploadedFiles.length} clones
              {(searchTerm || searchFilters.status || searchFilters.assignedStudent || searchFilters.school) &&
                <span className="text-indigo-600"> (filtered)</span>
              }
            </div>
          </div>
        </div>
        <div className="p-6">
          {uploadMode === 'regular' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th
                      className="text-left py-3 px-4 font-medium text-gray-900 cursor-pointer hover:bg-gray-50"
                      onClick={() => sortTable('cloneName')}
                    >
                      Clone Name {sortConfig.key === 'cloneName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="text-left py-3 px-4 font-medium text-gray-900 cursor-pointer hover:bg-gray-50"
                      onClick={() => sortTable('originalName')}
                    >
                      Original File {sortConfig.key === 'originalName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="text-left py-3 px-4 font-medium text-gray-900 cursor-pointer hover:bg-gray-50"
                      onClick={() => sortTable('assignedTo')}
                    >
                      Assigned Student {sortConfig.key === 'assignedTo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="text-left py-3 px-4 font-medium text-gray-900 cursor-pointer hover:bg-gray-50"
                      onClick={() => sortTable('school')}
                    >
                      School {sortConfig.key === 'school' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      className="text-left py-3 px-4 font-medium text-gray-900 cursor-pointer hover:bg-gray-50"
                      onClick={() => sortTable('status')}
                    >
                      Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Progress</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFiles.map(file => (
                    <tr key={file.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-bold text-indigo-600">{file.cloneName}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => downloadFile(file.id, file.originalName)}
                          className="font-mono text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer bg-transparent border-none p-0"
                          title={`Download ${file.originalName}`}
                        >
                          {file.originalName}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {file.assignedTo ? (
                          <span className="text-green-700 font-medium">{file.assignedTo.name}</span>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {file.assignedTo?.school?.name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {file.assignedTo ? (
                          <select
                            value={file.status}
                            onChange={(e) => updateFileStatus(file.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded-full font-medium border-0 ${getStatusColor(file.status)}`}
                          >
                            {STATUS_DROPDOWN_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(file.status)}`}>
                            {file.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${file.progress === 100 ? 'bg-green-600' : file.progress > 0 ? 'bg-blue-600' : 'bg-gray-400'}`}
                              style={{ width: `${file.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">{file.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {file.assignedTo ? (
                            <button
                              onClick={() => unassignFile(file.id)}
                              className="text-orange-600 hover:text-orange-800 text-sm"
                            >
                              Unassign
                            </button>
                          ) : (
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  assignFile(file.id, parseInt(e.target.value));
                                }
                              }}
                              value=""
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="">Assign to...</option>
                              {students.map(student => (
                                <option key={student.id} value={student.id}>
                                  {student.name} - {student.school?.name}
                                </option>
                              ))}
                            </select>
                          )}

                          {/* ENHANCED DELETE BUTTON */}
                          <button
                            onClick={() => deleteFile(file.id)}
                            disabled={file.assignedTo} // Disable button if assigned
                            className={`p-1 ${file.assignedTo
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-800'
                              }`}
                            title={
                              file.assignedTo
                                ? `Cannot delete - assigned to ${file.assignedTo.name}`
                                : 'Delete file'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // NEW: Practice clones table
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Clone Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Original File</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Upload Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {practiceClones.map(clone => (
                    <tr key={clone.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-bold text-purple-600">{clone.cloneName}</td>
                      <td className="py-3 px-4 font-mono text-sm">{clone.originalName}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {clone.description || 'No description'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${clone.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                          {clone.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(clone.uploadDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openPracticeAnswersModal(clone)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                            title="Manage correct answers for this practice clone"
                          >
                            Edit Answers
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => togglePracticeCloneStatus(clone.id, !clone.isActive)}
                            className={`text-sm px-2 py-1 rounded ${clone.isActive
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                              } transition-colors`}
                          >
                            {clone.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => deletePracticeClone(clone.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete practice clone"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredFiles.length === 0 && (
            <div className="text-center py-8">
              {uploadedFiles.length === 0 ? (
                <p className="text-gray-500">No files uploaded yet. Click "Upload New Files" to get started!</p>
              ) : (
                <p className="text-gray-500">No clones match your search criteria. Try adjusting your filters.</p>
              )}
            </div>
          )}

          {/* NEW: Pagination controls */}
          {itemsPerPage !== 'all' && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredFiles.length)} to {Math.min(currentPage * itemsPerPage, filteredFiles.length)} of {filteredFiles.length} clones
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm border rounded ${currentPage === pageNum
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Clone Status Definitions:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <p>• <span className="text-blue-600 font-medium">Being worked on by student</span> - Student is analyzing</p>
                  <p>• <span className="text-yellow-600 font-medium">Completed, waiting review</span> - Ready for instructor review</p>
                  <p>• <span className="text-orange-600 font-medium">Needs to be reanalyzed</span> - Instructor found issues</p>
                  <p>• <span className="text-purple-600 font-medium">Corrected, waiting review</span> - Student made corrections</p>
                  <p>• <span className="text-green-600 font-medium">Reviewed and Correct</span> - Final approval received</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Upload .ab1 Files</h3>
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

      {/* Practice Clone Upload Modal */}
      {showPracticeUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Upload Practice Clones</h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select practice .ab1 files
                </label>
                <input
                  type="file"
                  multiple
                  accept=".ab1"
                  onChange={handlePracticeCloneUpload}
                  disabled={uploadingFiles}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                />
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <div className="text-sm text-purple-800">
                  <p className="font-medium mb-2">Practice Clone Info:</p>
                  <ul className="space-y-1">
                    <li>• Practice clones are available to all students</li>
                    <li>• Students can complete analysis and get auto-feedback</li>
                    <li>• You can set correct answers for auto-grading</li>
                    <li>• Files can be activated/deactivated as needed</li>
                  </ul>
                </div>
              </div>
              {uploadingFiles && (
                <div className="text-center py-4">
                  <p className="text-indigo-600">Uploading practice clones...</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowPracticeUploadModal(false)}
                disabled={uploadingFiles}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-200 disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Practice Clone Answers Modal */}
      <DirectorPracticeAnswers
        isOpen={showPracticeAnswersModal}
        onClose={() => {
          setShowPracticeAnswersModal(false);
          setSelectedPracticeClone(null);
        }}
        practiceClone={selectedPracticeClone}
      />
    </>
  );
};

export default DirectorCloneLibrary;