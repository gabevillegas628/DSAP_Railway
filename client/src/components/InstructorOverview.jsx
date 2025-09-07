// components/InstructorOverview.jsx
import React, { useState, useEffect } from 'react';
import { Users, FileText, CheckCircle, MessageCircle, Clock, BookOpen, AlertCircle } from 'lucide-react';
import { useDNAContext } from '../context/DNAContext';
import apiService from '../services/apiService';

const InstructorOverview = ({ onNavigateToTab }) => {
    const { currentUser } = useDNAContext();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // State for metrics
    const [myStudents, setMyStudents] = useState([]);
    const [pendingReviews, setPendingReviews] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [recentActivity, setRecentActivity] = useState([]);
    const [schoolInfo, setSchoolInfo] = useState(null);

    useEffect(() => {
        fetchInstructorData();
    }, [currentUser]);

    const fetchInstructorData = async () => {
        if (!currentUser || !currentUser.school) {
            setError('No school assigned to instructor');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // Fetch students first and get the result
            const students = await fetchMyStudents();

            // Pass students to other functions that need them
            await Promise.all([
                fetchPendingReviews(),
                fetchUnreadMessages(),
                fetchRecentActivity(students) // Pass students directly
            ]);

        } catch (error) {
            console.error('Error fetching instructor data:', error);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };



    const fetchMyStudents = async () => {
        try {
            console.log('Fetching students for school:', currentUser.school.name);
            const allStudents = await apiService.get('/users');
            console.log('Total users from API:', allStudents.length);

            const schoolStudents = allStudents.filter(student =>
                student.role === 'student' &&
                student.school?.id === currentUser.school?.id
            );
            console.log('Students in my school:', schoolStudents.length);
            console.log('My students:', schoolStudents.map(s => ({ id: s.id, name: s.name })));

            setMyStudents(schoolStudents);
            setSchoolInfo(currentUser.school);

            // Return the students so other functions can use them immediately
            return schoolStudents;
        } catch (error) {
            console.error('Error fetching students:', error);
            return [];
        }
    };

    const fetchPendingReviews = async () => {
        try {
            if (myStudents.length === 0) {
                setPendingReviews(0);
                return;
            }

            const [uploadedFiles, practiceSubmissions] = await Promise.all([
                apiService.get(`/uploaded-files?schoolName=${encodeURIComponent(currentUser.school.name)}`),
                apiService.get(`/practice-submissions?schoolName=${encodeURIComponent(currentUser.school.name)}`)
            ]);

            // FIXED: Use correct status values
            const myPendingFiles = uploadedFiles.filter(file =>
                [
                    'Completed, waiting review by staff',
                    'Corrected by student, waiting review'
                ].includes(file.status)
            );

            const myPendingPractice = practiceSubmissions.filter(submission =>
                ['pending', 'resubmitted'].includes(submission.reviewStatus || submission.status)
            );

            setPendingReviews(myPendingFiles.length + myPendingPractice.length);
            console.log('Pending reviews:', { files: myPendingFiles.length, practice: myPendingPractice.length });
        } catch (error) {
            console.error('Error fetching pending reviews:', error);
            setPendingReviews(0);
        }
    };

    const fetchUnreadMessages = async () => {
        try {
            // Get messages for this instructor
            const messages = await apiService.get(`/messages/user/${currentUser.id}?type=received`);
            const unread = messages.filter(message => {
                // Handle both readBy array format and isRead boolean format
                if (message.readBy && Array.isArray(message.readBy)) {
                    return !message.readBy.includes(currentUser.id);
                } else if (typeof message.isRead === 'boolean') {
                    return !message.isRead && message.recipientId === currentUser.id;
                }
                return true;
            });
            setUnreadMessages(unread.length);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const fetchRecentActivity = async (studentsArray = null) => {
        try {
            const students = studentsArray || myStudents;
            console.log('=== INSTRUCTOR ACTIVITY DEBUG ===');
            console.log('Students provided:', students.length);
            console.log('Current instructor ID:', currentUser.id);

            if (students.length === 0) {
                setRecentActivity([]);
                return;
            }

            const myStudentIds = students.map(student => student.id);
            console.log('My student IDs:', myStudentIds);

            const activities = [];

            // 1. Check for pending RESEARCH clone submissions
            try {
                console.log('=== FETCHING RESEARCH SUBMISSIONS ===');
                const uploadedFiles = await apiService.get(`/uploaded-files?schoolName=${encodeURIComponent(currentUser.school.name)}`);

                const pendingStatuses = [
                    'Completed, waiting review by staff',
                    'Corrected by student, waiting review'
                ];

                const pendingFiles = uploadedFiles.filter(file =>
                    file.assignedTo &&
                    myStudentIds.includes(file.assignedTo.id) &&
                    pendingStatuses.includes(file.status)
                );

                console.log('Pending research files:', pendingFiles.length);

                // Add research submission activities
                pendingFiles.forEach(file => {
                    activities.push({
                        id: `file-${file.id}`,
                        type: 'research-submission',
                        priority: 'high',
                        icon: 'FileText',
                        title: `${file.assignedTo.name} submitted research clone: ${file.cloneName || file.originalName}`,
                        subtitle: file.status === 'Corrected by student, waiting review' ? 'Resubmission' : 'New submission',
                        timestamp: file.updatedAt,
                        status: 'pending',
                        actionable: true
                    });
                });

            } catch (error) {
                console.error('Error fetching research submissions:', error);
            }

            // 2. Check for pending PRACTICE clone submissions
            try {
                console.log('=== FETCHING PRACTICE SUBMISSIONS ===');

                // Get practice submissions ready for review from instructor's school
                const practiceSubmissions = await apiService.get(`/practice-submissions?reviewReady=true&schoolName=${encodeURIComponent(currentUser.school.name)}`);

                console.log('Total practice submissions ready for review:', practiceSubmissions.length);

                // Filter for students in this instructor's class and submissions needing review
                const myPendingPractice = practiceSubmissions.filter(submission => {
                    const isMyStudent = submission.assignedTo && myStudentIds.includes(submission.assignedTo.id);
                    const needsReview = [
                        'Completed, waiting review by staff',
                        'Corrected by student, waiting review'
                    ].includes(submission.status);

                    console.log(`Practice submission ${submission.id}:`, {
                        cloneName: submission.cloneName,
                        studentName: submission.assignedTo?.name,
                        studentId: submission.assignedTo?.id,
                        status: submission.status,
                        isMyStudent,
                        needsReview,
                        passes: isMyStudent && needsReview
                    });

                    return isMyStudent && needsReview;
                });

                console.log('My pending practice submissions:', myPendingPractice.length);

                // Add practice submission activities
                myPendingPractice.forEach(submission => {
                    activities.push({
                        id: `practice-${submission.id}`,
                        type: 'practice-submission',
                        priority: 'high',
                        icon: 'BookOpen',
                        title: `${submission.assignedTo.name} submitted practice clone: ${submission.cloneName}`,
                        subtitle: submission.status === 'Corrected by student, waiting review' ? 'Resubmission' : 'New submission',
                        timestamp: submission.submittedAt || submission.updatedAt,
                        status: 'pending',
                        actionable: true
                    });
                });

            } catch (error) {
                console.error('Error fetching practice submissions:', error);

                // Fallback: try getting all practice submissions and filter manually
                try {
                    console.log('Trying fallback method for practice submissions...');
                    const allPracticeSubmissions = await apiService.get('/practice-submissions');

                    const myPendingPracticeFallback = allPracticeSubmissions.filter(submission => {
                        const isMyStudent = submission.assignedTo &&
                            submission.assignedTo.school &&
                            submission.assignedTo.school.name === currentUser.school.name &&
                            myStudentIds.includes(submission.assignedTo.id);

                        const needsReview = [
                            'Completed, waiting review by staff',
                            'Corrected by student, waiting review'
                        ].includes(submission.status);

                        return isMyStudent && needsReview;
                    });

                    console.log('Fallback practice submissions found:', myPendingPracticeFallback.length);

                    myPendingPracticeFallback.forEach(submission => {
                        activities.push({
                            id: `practice-fallback-${submission.id}`,
                            type: 'practice-submission',
                            priority: 'high',
                            icon: 'BookOpen',
                            title: `${submission.assignedTo.name} submitted practice clone: ${submission.cloneName}`,
                            subtitle: submission.status === 'Corrected by student, waiting review' ? 'Resubmission' : 'New submission',
                            timestamp: submission.submittedAt || submission.updatedAt,
                            status: 'pending',
                            actionable: true
                        });
                    });

                } catch (fallbackError) {
                    console.error('Error in practice submissions fallback:', fallbackError);
                }
            }

            // 3. Check for unread messages using instructor endpoint
            try {
                console.log('=== FETCHING INSTRUCTOR DISCUSSIONS ===');

                const discussions = await apiService.get(`/clone-discussions/instructor/${currentUser.id}`);
                console.log('Total instructor discussions:', discussions.length);

                const unreadDiscussions = discussions.filter(discussion => {
                    const hasUnread = discussion.unreadCount > 0;
                    const hasLastMessage = discussion.lastMessage;

                    console.log(`Discussion ${discussion.id}:`, {
                        studentName: discussion.student?.name,
                        cloneName: discussion.clone?.cloneName || discussion.practiceClone?.cloneName || 'General',
                        unreadCount: discussion.unreadCount,
                        hasLastMessage: !!hasLastMessage,
                        lastMessageAt: discussion.lastMessageAt,
                        passes: hasUnread && hasLastMessage
                    });

                    return hasUnread && hasLastMessage;
                });

                console.log('Discussions with unread messages:', unreadDiscussions.length);

                unreadDiscussions
                    .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
                    .slice(0, 5)
                    .forEach(discussion => {
                        const cloneName = discussion.clone?.cloneName ||
                            discussion.practiceClone?.cloneName ||
                            'General Discussion';

                        activities.push({
                            id: `discussion-${discussion.id}`,
                            type: 'message',
                            priority: 'medium',
                            icon: 'MessageCircle',
                            title: `${discussion.student.name} sent ${discussion.unreadCount} new message${discussion.unreadCount !== 1 ? 's' : ''}`,
                            subtitle: cloneName,
                            timestamp: discussion.lastMessageAt,
                            status: 'unread',
                            actionable: true,
                            discussionId: discussion.id
                        });
                    });

            } catch (error) {
                console.error('Error fetching instructor discussions:', error);
            }

            // 4. Sort activities by priority and timestamp
            activities.sort((a, b) => {
                // First sort by priority (high > medium > low)
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                if (priorityDiff !== 0) return priorityDiff;

                // Then by timestamp (most recent first)
                return new Date(b.timestamp) - new Date(a.timestamp);
            });

            // 5. Limit to 10 most recent activities
            const recentActivities = activities.slice(0, 10);

            console.log('=== FINAL INSTRUCTOR ACTIVITIES ===');
            console.log('Total activities created:', recentActivities.length);
            recentActivities.forEach(activity => {
                console.log(`${activity.type}: ${activity.title} (${activity.priority})`);
            });

            setRecentActivity(recentActivities);

            // If no activities, show a helpful message
            if (recentActivities.length === 0) {
                setRecentActivity([{
                    id: 'no-activity',
                    type: 'info',
                    priority: 'low',
                    icon: 'CheckCircle',
                    title: 'No pending activities',
                    subtitle: `All caught up with your ${students.length} students!`,
                    timestamp: new Date().toISOString(),
                    status: 'completed',
                    actionable: false
                }]);
            }

        } catch (error) {
            console.error('Error in fetchRecentActivity:', error);
            setRecentActivity([{
                id: 'error',
                type: 'error',
                priority: 'low',
                icon: 'AlertCircle',
                title: 'Error loading recent activity',
                subtitle: 'Please refresh the page to try again',
                timestamp: new Date().toISOString(),
                status: 'error',
                actionable: false
            }]);
        }
    };

    // handler for clicking activity items
    const handleActivityClick = (activity) => {
        if (activity.type === 'research-submission' || activity.type === 'practice-submission') {
            onNavigateToTab && onNavigateToTab('analysis-review');
        } else if (activity.type === 'message') {
            onNavigateToTab && onNavigateToTab('messages');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'resubmitted':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-600';
        }
    };

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInHours = Math.floor((now - time) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
    };

    // Calculate completion statistics
    const totalAssignments = myStudents.reduce((total, student) => {
        // This would need to be enhanced based on your actual assignment tracking
        return total + (student.assignmentCount || 0);
    }, 0);

    const completedAssignments = myStudents.reduce((total, student) => {
        return total + (student.completedCount || 0);
    }, 0);

    const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 text-center">
                    <p className="text-gray-600">Loading instructor dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm text-white p-6">
                <h3 className="text-2xl font-bold mb-2">Welcome back!</h3>
                <p className="text-indigo-100">
                    {schoolInfo?.name || 'Your School'} • {myStudents.length} students under your guidance
                </p>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div
                    className="bg-white p-6 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onNavigateToTab && onNavigateToTab('students')}
                >
                    <div className="flex items-center">
                        <Users className="w-8 h-8 text-blue-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">My Students</p>
                            <p className="text-2xl font-bold text-gray-900">{myStudents.length}</p>
                        </div>
                    </div>
                </div>

                <div
                    className="bg-white p-6 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onNavigateToTab && onNavigateToTab('analysis-review')}
                >
                    <div className="flex items-center">
                        <FileText className="w-8 h-8 text-orange-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                            <p className="text-2xl font-bold text-gray-900">{pendingReviews}</p>
                        </div>
                    </div>
                </div>

                <div
                    className="bg-white p-6 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onNavigateToTab && onNavigateToTab('messages')}
                >
                    <div className="flex items-center">
                        <MessageCircle className="w-8 h-8 text-indigo-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">New Messages</p>
                            <p className="text-2xl font-bold text-gray-900">{unreadMessages}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <div className="flex items-center">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                            <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity - Enhanced */}
                <div className="bg-white rounded-xl shadow-sm border">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                    </div>
                    <div className="p-6">
                        {recentActivity.length > 0 ? (
                            <div className="space-y-4">
                                {recentActivity.map((activity) => {
                                    // In the activity rendering section, update the IconComponent logic:
                                    const IconComponent = activity.icon === 'FileText' ? FileText :
                                        activity.icon === 'MessageCircle' ? MessageCircle :
                                            activity.icon === 'CheckCircle' ? CheckCircle :
                                                activity.icon === 'BookOpen' ? BookOpen :  // Add this line
                                                    AlertCircle;
                                    const iconColor = activity.priority === 'high' ? 'text-red-500' :
                                        activity.priority === 'medium' ? 'text-yellow-500' :
                                            'text-green-500';

                                    return (
                                        <div
                                            key={activity.id}
                                            className={`flex items-start space-x-3 ${activity.actionable ? 'cursor-pointer hover:bg-gray-50 p-2 rounded-lg -m-2' : ''}`}
                                            onClick={() => activity.actionable && handleActivityClick(activity)}
                                        >
                                            <div className="flex-shrink-0">
                                                <IconComponent className={`w-5 h-5 ${iconColor} mt-0.5`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-900">{activity.title}</p>
                                                <p className="text-xs text-gray-500">{activity.subtitle}</p>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    {activity.actionable && (
                                                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                                            Action needed
                                                        </span>
                                                    )}
                                                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(activity.status)}`}>
                                                        {activity.status}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No recent activity</p>
                                <p className="text-sm text-gray-400">Check back later for updates from your students</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm border">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                    </div>
                    <div className="p-6 space-y-3">
                        <button
                            onClick={() => onNavigateToTab && onNavigateToTab('students')}
                            className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Users className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">View All Students</span>
                        </button>

                        <button
                            onClick={() => onNavigateToTab && onNavigateToTab('analysis-review')}
                            className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <FileText className="w-5 h-5 text-orange-600" />
                            <span className="text-sm font-medium text-gray-700">Review Submissions</span>
                        </button>

                        <button
                            onClick={() => onNavigateToTab && onNavigateToTab('messages')}
                            className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <MessageCircle className="w-5 h-5 text-indigo-600" />
                            <span className="text-sm font-medium text-gray-700">Send Message</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* School Information */}
            {schoolInfo && (
                <div className="bg-white rounded-xl shadow-sm border">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">School Information</h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm font-medium text-gray-600">School Name</p>
                                <p className="text-lg text-gray-900">{schoolInfo.name}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">School ID</p>
                                <p className="text-lg text-gray-900 font-mono">{schoolInfo.schoolId}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Students</p>
                                <p className="text-lg text-gray-900">{myStudents.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstructorOverview;