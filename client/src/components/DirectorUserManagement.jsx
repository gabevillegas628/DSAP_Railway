// components/DirectorUserManagement.jsx - Updated to use apiService
import React, { useState, useEffect } from 'react';
import { Edit, Trash2, Eye, EyeOff, Check, X, Clock, AlertCircle, Users, GraduationCap, Shield, History } from 'lucide-react';
import apiService from './apiService';

const DirectorUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'status', direction: 'asc' }); // Default sort by status
  const [showPassword, setShowPassword] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [showLoginHistory, setShowLoginHistory] = useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState(null);
  const [loginLogs, setLoginLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'student',
    schoolId: ''
  });

  // Fetch users and schools from API
  useEffect(() => {
    fetchUsers();
    fetchSchools();
  }, []);

  // Function to open login history modal
  const openLoginHistory = async (user) => {
    setSelectedUserForHistory(user);
    setShowLoginHistory(true);
    setLoadingLogs(true);

    try {
      const logs = await apiService.get(`/login-logs/user/${user.id}?limit=20`);
      setLoginLogs(logs);
    } catch (error) {
      console.error('Error fetching login logs:', error);
      setLoginLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Function to close login history modal
  const closeLoginHistory = () => {
    setShowLoginHistory(false);
    setSelectedUserForHistory(null);
    setLoginLogs([]);
  };

  // Helper function to format login time
  const formatLoginTime = (loginTime) => {
    const date = new Date(loginTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const fetchUsers = async () => {
    try {
      const data = await apiService.get('/users');
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const approveUser = async (userId) => {
    try {
      const updatedUser = await apiService.put(`/users/${userId}`, { status: 'approved' });
      setUsers(prev => prev.map(user =>
        user.id === userId ? updatedUser : user
      ));
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const rejectUser = async (userId) => {
    if (window.confirm('Are you sure you want to reject this user? They will not be able to access the system.')) {
      try {
        const updatedUser = await apiService.put(`/users/${userId}`, { status: 'rejected' });
        setUsers(prev => prev.map(user =>
          user.id === userId ? updatedUser : user
        ));
      } catch (error) {
        console.error('Error rejecting user:', error);
      }
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

  const sortTable = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedAndFilteredUsers = () => {
    let filteredUsers = users;

    // Apply filter
    if (filter !== 'all') {
      filteredUsers = users.filter(user => user.status === filter);
    }

    // Apply sort
    if (!sortConfig.key) return filteredUsers;

    return [...filteredUsers].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle school name sorting
      if (sortConfig.key === 'school') {
        aVal = a.school?.name || '';
        bVal = b.school?.name || '';
      }

      // Custom sorting for status to prioritize pending
      if (sortConfig.key === 'status') {
        const statusOrder = { 'pending': 0, 'approved': 1, 'rejected': 2 };
        aVal = statusOrder[aVal] || 3;
        bVal = statusOrder[bVal] || 3;
      }

      // Handle name sorting by last name instead of first name
      if (sortConfig.key === 'name') {
        // Extract last name from full name
        const getLastName = (fullName) => {
          if (!fullName) return '';
          const nameParts = fullName.trim().split(' ');
          return nameParts[nameParts.length - 1]; // Get the last part as last name
        };

        aVal = getLastName(aVal);
        bVal = getLastName(bVal);
      }

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

  const addUser = async () => {
    if (isFormValid()) {
      try {
        const userData = {
          ...newUser,
          schoolId: newUser.schoolId || null
        };

        const newUserData = await apiService.post('/users', userData);
        setUsers(prev => [...prev, newUserData]);
        setNewUser({ email: '', password: '', name: '', role: 'student', schoolId: '' });
        setShowUserForm(false);
      } catch (error) {
        console.error('Error adding user:', error);
        alert(error.message || 'Failed to create user');
      }
    }
  };

  const editUser = (user) => {
    setEditingUser(user.id);
    setNewUser({
      email: user.email,
      password: '', // Don't prefill password
      name: user.name,
      role: user.role,
      schoolId: user.schoolId || ''
    });
    setShowUserForm(true);
  };

  const updateUser = async () => {
    if (isFormValid()) {
      try {
        const userData = {
          ...newUser,
          schoolId: newUser.schoolId || null
        };

        const updatedUser = await apiService.put(`/users/${editingUser}`, userData);
        setUsers(prev => prev.map(user =>
          user.id === editingUser ? updatedUser : user
        ));
        setShowUserForm(false);
        setEditingUser(null);
        setNewUser({ email: '', password: '', name: '', role: 'student', schoolId: '' });
      } catch (error) {
        console.error('Error updating user:', error);
        alert(error.message || 'Failed to update user');
      }
    }
  };

  const removeUser = (userId) => {
    const userToRemove = users.find(user => user.id === userId);
    setUserToDelete(userToRemove);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (userToDelete) {
      try {
        await apiService.delete(`/users/${userToDelete.id}`);
        setUsers(prev => prev.filter(user => user.id !== userToDelete.id));
        setShowDeleteConfirm(false);
        setUserToDelete(null);
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user');
      }
    }
  };

  const cancelDeleteUser = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'director':
        return 'bg-purple-100 text-purple-800';
      case 'instructor':
        return 'bg-blue-100 text-blue-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <Check className="w-3 h-3" />;
      case 'pending':
        return <Clock className="w-3 h-3" />;
      case 'rejected':
        return <X className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  // Form validation logic
  const isFormValid = () => {
    const basicFields = newUser.name && newUser.email && newUser.role;
    const passwordRequired = !editingUser && !newUser.password;

    if (!basicFields || passwordRequired) return false;

    // Students must have a school
    if (newUser.role === 'student' && !newUser.schoolId) return false;

    // Directors and instructors don't require schools
    return true;
  };

  // Get validation message for form
  const getValidationMessage = () => {
    if (!newUser.name || !newUser.email || !newUser.role) {
      return 'Please fill in all required fields';
    }
    if (!editingUser && !newUser.password) {
      return 'Password is required for new users';
    }
    if (newUser.role === 'student' && !newUser.schoolId) {
      return 'Students must be assigned to a school';
    }
    return null;
  };

  // Render school selection based on role
  const renderSchoolSelection = () => {
    if (newUser.role === 'director') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">School</label>
          <select
            value=""
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
          >
            <option value="">Directors are not assigned to schools</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Directors have system-wide access</p>
        </div>
      );
    }

    if (newUser.role === 'instructor') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            School <span className="text-gray-500">(optional - can be assigned later)</span>
          </label>
          <select
            value={newUser.schoolId}
            onChange={(e) => setNewUser({ ...newUser, schoolId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">No school assigned yet</option>
            {schools.map(school => (
              <option key={school.id} value={school.id}>{school.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Instructors can be created without a school and assigned later in School Management
          </p>
        </div>
      );
    }

    // For students - school is required
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          School <span className="text-red-500">*</span>
        </label>
        <select
          value={newUser.schoolId}
          onChange={(e) => setNewUser({ ...newUser, schoolId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Select a school...</option>
          {schools.map(school => (
            <option key={school.id} value={school.id}>{school.name}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Students must be assigned to a school
        </p>
      </div>
    );
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'director':
        return <Shield className="w-3 h-3" />;
      case 'instructor':
        return <GraduationCap className="w-3 h-3" />;
      case 'student':
        return <Users className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  const sortedAndFilteredUsers = getSortedAndFilteredUsers();
  const pendingCount = users.filter(user => user.status === 'pending').length;
  const approvedCount = users.filter(user => user.status === 'approved').length;
  const rejectedCount = users.filter(user => user.status === 'rejected').length;
  // Count users by role
  const directorCount = users.filter(user => user.role === 'director').length;
  const instructorCount = users.filter(user => user.role === 'instructor').length;
  const studentCount = users.filter(user => user.role === 'student').length;
  const unassignedInstructors = users.filter(user => user.role === 'instructor' && !user.schoolId).length;

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 text-center">
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage all user accounts and access levels
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <Clock className="w-3 h-3 mr-1" />
                  {pendingCount} pending approval
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Filter Dropdown */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-3 py-1"
            >
              <option value="all">All Users ({users.length})</option>
              <option value="pending">Pending ({pendingCount})</option>
              <option value="approved">Approved ({approvedCount})</option>
              <option value="rejected">Rejected ({rejectedCount})</option>
            </select>

            <button
              onClick={() => setShowUserForm(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition duration-200"
            >
              + Add User
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th
                    className="text-left py-3 px-4 font-medium text-gray-900 cursor-pointer hover:bg-gray-50"
                    onClick={() => sortTable('name')}
                  >
                    Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium text-gray-900 cursor-pointer hover:bg-gray-50"
                    onClick={() => sortTable('email')}
                  >
                    Email {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium text-gray-900 cursor-pointer hover:bg-gray-50"
                    onClick={() => sortTable('role')}
                  >
                    Role {sortConfig.key === 'role' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium text-gray-900 cursor-pointer hover:bg-gray-50"
                    onClick={() => sortTable('status')}
                  >
                    Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="text-left py-3 px-4 font-medium text-gray-900 cursor-pointer hover:bg-gray-50"
                    onClick={() => sortTable('school')}
                  >
                    School {sortConfig.key === 'school' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Registration</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredUsers.map(user => (
                  <tr
                    key={user.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${user.status === 'pending' ? 'bg-yellow-50' : ''
                      }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{user.name}</span>
                        {user.status === 'pending' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            NEW
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize flex items-center space-x-1 ${getStatusBadgeColor(user.status)}`}>
                          {getStatusIcon(user.status)}
                          <span>{user.status}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {user.school ? user.school.name : '-'}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        {/* Pending user actions */}
                        {user.status === 'pending' && (
                          <>
                            <button
                              onClick={() => approveUser(user.id)}
                              className="inline-flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition duration-200"
                              title="Approve user"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => rejectUser(user.id)}
                              className="inline-flex items-center px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition duration-200"
                              title="Reject user"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Reject
                            </button>
                          </>
                        )}

                        {/* Standard actions for all users */}
                        <button
                          onClick={() => editUser(user)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* NEW: Login History Button */}
                        <button
                          onClick={() => openLoginHistory(user)}
                          className="text-purple-600 hover:text-purple-800 p-1"
                          title="View login history"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => removeUser(user.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete user"
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

          {sortedAndFilteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filter === 'all'
                  ? 'No users found. Click "Add User" to get started!'
                  : `No ${filter} users found.`
                }
              </p>
            </div>
          )}

          {/* Summary Info */}
          {users.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">User Status Summary:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span><strong>Approved:</strong> {approvedCount} users with full access</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span><strong>Pending:</strong> {pendingCount} awaiting approval</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span><strong>Rejected:</strong> {rejectedCount} denied access</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter full name..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter email address..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password {editingUser && <span className="text-gray-500">(leave blank to keep current)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={editingUser ? "Enter new password..." : "Enter password..."}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="director">Director</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">School</label>
                <select
                  value={newUser.schoolId}
                  onChange={(e) => setNewUser({ ...newUser, schoolId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">No School (for Directors)</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowUserForm(false);
                  setEditingUser(null);
                  setNewUser({ email: '', password: '', name: '', role: 'student', schoolId: '' });
                }}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={editingUser ? updateUser : addUser}
                disabled={!newUser.name || !newUser.email || !newUser.role || (!editingUser && !newUser.password)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete <strong>{userToDelete.name}</strong> ({userToDelete.email})?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">
                  <strong>Warning:</strong> This action cannot be undone. The user will lose access to their account.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={cancelDeleteUser}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Login History Modal */}
      {showLoginHistory && selectedUserForHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Login History</h3>
                  <p className="text-sm text-gray-600">
                    {selectedUserForHistory.name} ({selectedUserForHistory.email})
                  </p>
                </div>
                <button
                  onClick={closeLoginHistory}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-96">
              {loadingLogs ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading login history...</p>
                </div>
              ) : loginLogs.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No login history found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Login tracking started with the recent system update
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-gray-900">Recent Logins</h4>
                    <span className="text-sm text-gray-500">{loginLogs.length} total logins</span>
                  </div>

                  {loginLogs.map((log, index) => {
                    const { date, time } = formatLoginTime(log.loginTime);
                    return (
                      <div
                        key={log.id}
                        className={`p-3 rounded-lg border ${log.success
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                          } ${index === 0 ? 'ring-2 ring-blue-200' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className={`w-2 h-2 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              <span className="font-medium text-gray-900">
                                {log.success ? 'Successful Login' : 'Failed Login'}
                              </span>
                              {index === 0 && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  Most Recent
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              <p><strong>Date:</strong> {date}</p>
                              <p><strong>Time:</strong> {time}</p>
                              {log.ipAddress && (
                                <p className="text-xs text-gray-500 mt-1">
                                  IP: {log.ipAddress}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  Showing last 20 login attempts
                </div>
                <button
                  onClick={closeLoginHistory}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DirectorUserManagement;