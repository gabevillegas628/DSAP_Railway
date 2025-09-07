import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, Send, Trash2, User, FileText, Clock, AlertTriangle, Search, Filter, ChevronDown } from 'lucide-react';
import { useDNAContext } from '../context/DNAContext';
import apiService from '../services/apiService';
import { markDiscussionAsRead } from '../utils/discussionUtils';

const InstructorMessagesChat = ({ onMessageRead }) => {
    const { currentUser } = useDNAContext();
    const [discussions, setDiscussions] = useState([]);
    const [selectedDiscussion, setSelectedDiscussion] = useState(null);
    const [messages, setMessages] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Filter and search states
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'unread', 'active'
    const [sortBy, setSortBy] = useState('recent'); // 'recent', 'oldest', 'student'

    // Delete modal states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [discussionToDelete, setDiscussionToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const messagesEndRef = useRef(null);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Load discussions for instructor - using the new endpoint
    const loadDiscussions = useCallback(async () => {
        if (!currentUser?.school?.name || !currentUser?.id) {
            console.error('Instructor has no school assigned or missing user ID');
            setLoading(false);
            return;
        }

        try {
            console.log('=== INSTRUCTOR LOADING DISCUSSIONS ===');
            console.log('Instructor:', currentUser.name, 'ID:', currentUser.id);
            console.log('School:', currentUser.school.name);

            // Use the instructor-specific endpoint
            const discussionsData = await apiService.get(`/clone-discussions/instructor/${currentUser.id}`);
            console.log('Loaded discussions for instructor:', discussionsData.length);

            setDiscussions(discussionsData);
        } catch (error) {
            console.error('Error loading instructor discussions:', error);
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id, currentUser?.school?.name]);

    useEffect(() => {
        loadDiscussions();
    }, [loadDiscussions]);

    // Load all messages for a specific discussion
    const loadMessages = async (discussionId) => {
        try {
            console.log('🔄 Loading messages for discussion:', discussionId);
            setLoadingMessages(true);

            const response = await apiService.get(`/clone-discussions/${discussionId}/messages`);
            console.log('✅ Messages loaded successfully:', response.messages?.length || 0);

            setMessages(response.messages || []);
        } catch (error) {
            console.error('❌ Error loading messages:', error);
            setMessages([]); // Ensure messages is always an array
        } finally {
            setLoadingMessages(false);
        }
    };

    // Filter and sort discussions
    const filteredAndSortedDiscussions = React.useMemo(() => {
        let filtered = discussions;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(discussion =>
                discussion.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                discussion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (discussion.clone?.cloneName && discussion.clone.cloneName.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Apply status filter
        if (filterStatus === 'unread') {
            filtered = filtered.filter(discussion => discussion.unreadCount > 0);
        } else if (filterStatus === 'active') {
            filtered = filtered.filter(discussion => discussion.status === 'active');
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'oldest':
                    return new Date(a.lastMessageAt) - new Date(b.lastMessageAt);
                case 'student':
                    return a.student.name.localeCompare(b.student.name);
                case 'recent':
                default:
                    return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
            }
        });

        return filtered;
    }, [discussions, searchTerm, filterStatus, sortBy]);

    const selectDiscussion = async (discussion) => {
        console.log('🔍 Selecting discussion:', discussion.id, 'Unread count:', discussion.unreadCount);
        console.log('🔍 Discussion title:', discussion.title);
        console.log('🔍 Current user:', currentUser.id, currentUser.name);

        setSelectedDiscussion(discussion);
        setMessages([]); // Clear previous messages

        // Load all messages for this discussion
        try {
            await loadMessages(discussion.id);
            console.log('✅ Messages loaded for discussion:', discussion.id);
        } catch (error) {
            console.error('❌ Failed to load messages:', error);
        }

        // Mark as read when opening - but don't let errors block the UI
        try {
            console.log('🔍 Attempting to mark discussion as read:', discussion.id, 'for instructor:', currentUser.id);

            const result = await markDiscussionAsRead(discussion.id, currentUser.id);
            console.log('✅ markDiscussionAsRead result:', result);

            // Update local state to show 0 unread
            setDiscussions(prev => {
                const updated = prev.map(d => {
                    if (d.id === discussion.id) {
                        console.log('🔄 Updating discussion', d.id, 'unread count from', d.unreadCount, 'to 0');
                        return { ...d, unreadCount: 0 };
                    }
                    return d;
                });
                console.log('🔄 Updated discussions state with', updated.length, 'discussions');
                return updated;
            });

            // Refresh the dashboard count
            if (onMessageRead) {
                console.log('🔄 Calling onMessageRead to refresh dashboard');
                onMessageRead();
            }
        } catch (error) {
            console.error('❌ Error marking discussion as read (non-blocking):', error);
            // Don't block the UI if mark as read fails
        }
    };

    const sendReply = async () => {
        if (!replyText.trim() || !selectedDiscussion || sending) {
            console.log('⚠️ Cannot send reply:', {
                hasText: !!replyText.trim(),
                hasDiscussion: !!selectedDiscussion,
                isSending: sending
            });
            return;
        }

        console.log('📤 Sending reply to discussion:', selectedDiscussion.id);
        console.log('📤 Reply content length:', replyText.trim().length);

        setSending(true);
        try {
            const newMessage = await apiService.post(`/clone-discussions/${selectedDiscussion.id}/messages`, {
                senderId: currentUser.id,
                content: replyText.trim(),
                messageType: 'message'
            });

            console.log('✅ Reply sent successfully:', newMessage.id);

            // Add new message to the end of messages
            setMessages(prev => {
                const updated = [...prev, newMessage];
                console.log('🔄 Updated messages array, new length:', updated.length);
                return updated;
            });

            // Update discussions list
            setDiscussions(prev => prev.map(disc =>
                disc.id === selectedDiscussion.id
                    ? {
                        ...disc,
                        lastMessage: newMessage,
                        lastMessageAt: new Date().toISOString(),
                        messageCount: (disc.messageCount || 0) + 1
                    }
                    : disc
            ));

            setReplyText('');
            console.log('✅ Reply processing completed');
        } catch (error) {
            console.error('❌ Error sending reply:', error);
            alert('Failed to send reply. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const debugDiscussionState = () => {
        console.log('=== DISCUSSION STATE DEBUG ===');
        console.log('Selected Discussion:', selectedDiscussion?.id, selectedDiscussion?.title);
        console.log('Messages count:', messages.length);
        console.log('Loading messages:', loadingMessages);
        console.log('Current user:', currentUser?.id, currentUser?.name);
        console.log('Total discussions:', discussions.length);
        console.log('================================');
    };

    const handleDeleteDiscussion = async () => {
        if (!discussionToDelete || deleting) return;

        setDeleting(true);
        try {
            await apiService.delete(`/clone-discussions/${discussionToDelete.id}`, {
                requesterId: currentUser.id
            });

            // Remove from local state
            setDiscussions(prev => prev.filter(d => d.id !== discussionToDelete.id));

            // Clear selection if this was the selected discussion
            if (selectedDiscussion && selectedDiscussion.id === discussionToDelete.id) {
                setSelectedDiscussion(null);
                setMessages([]);
            }

            setShowDeleteModal(false);
            setDiscussionToDelete(null);
        } catch (error) {
            console.error('Error deleting discussion:', error);
            alert('Failed to delete discussion. Please try again.');
        } finally {
            setDeleting(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    const formatFullDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-600">Loading discussions...</span>
            </div>
        );
    }

    // Show message if instructor has no school assigned
    if (!currentUser?.school?.name) {
        return (
            <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" />
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    <strong>No school assigned.</strong> You need to be assigned to a school to view student discussions.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[600px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex">
            {/* Left Sidebar - Discussion List */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
                {/* Header with filters - Fixed */}
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Student Discussions</h3>
                    <p className="text-sm text-gray-600 mb-3">
                        From {currentUser.school.name}
                    </p>

                    {/* Search */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by student or clone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex space-x-2">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All</option>
                            <option value="unread">Unread</option>
                            <option value="active">Active</option>
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="recent">Recent</option>
                            <option value="oldest">Oldest</option>
                            <option value="student">Student Name</option>
                        </select>
                    </div>

                    <div className="text-xs text-gray-600 mt-2">
                        {filteredAndSortedDiscussions.length} discussion{filteredAndSortedDiscussions.length !== 1 ? 's' : ''}
                    </div>
                </div>

                {/* Discussion List - Fixed height with scroll */}
                <div className="flex-1 overflow-y-auto">
                    {filteredAndSortedDiscussions.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm">No discussions found</p>
                        </div>
                    ) : (
                        <div className="space-y-1 p-2">
                            {filteredAndSortedDiscussions.map((discussion) => (
                                <div
                                    key={discussion.id}
                                    onClick={() => selectDiscussion(discussion)}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedDiscussion?.id === discussion.id
                                        ? 'bg-blue-50 border border-blue-200'
                                        : 'hover:bg-gray-50 border border-transparent'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                <User className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900 text-sm">{discussion.student.name}</p>
                                                <p className="text-xs text-gray-600">{discussion.student.school?.name}</p>
                                            </div>
                                        </div>
                                        {discussion.unreadCount > 0 && (
                                            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                                {discussion.unreadCount}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-gray-800 line-clamp-1">
                                            {discussion.clone?.cloneName ||
                                                discussion.practiceClone?.cloneName ||
                                                'General Discussion'}
                                        </p>

                                        {discussion.lastMessage && (
                                            <p className="text-xs text-gray-600 line-clamp-2">
                                                {discussion.lastMessage.content}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>{discussion.messageCount || 0} message{discussion.messageCount !== 1 ? 's' : ''}</span>
                                            <span>{formatDate(discussion.lastMessageAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side - Chat Area */}
            <div className="flex-1 flex flex-col">
                {selectedDiscussion ? (
                    <>
                        {/* Chat Header - Fixed */}
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900">{selectedDiscussion.student.name}</h4>
                                        <p className="text-sm text-gray-600">
                                            {selectedDiscussion.clone?.cloneName ||
                                                selectedDiscussion.practiceClone?.cloneName ||
                                                'General Discussion'}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setDiscussionToDelete(selectedDiscussion);
                                        setShowDeleteModal(true);
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Delete Discussion"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages - Fixed height with scroll */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="ml-3 text-gray-600">Loading messages...</span>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex items-center justify-center py-8 text-gray-500">
                                    <p>No messages yet in this discussion.</p>
                                </div>
                            ) : (
                                messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.sender.id === currentUser.id ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-3/4 ${message.sender.id === currentUser.id
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-900'
                                            } rounded-lg p-3`}>
                                            <div className="flex items-center space-x-2 mb-1">
                                                <span className="text-xs font-medium opacity-75">
                                                    {message.sender.name}
                                                </span>
                                                <span className="text-xs opacity-50">
                                                    {formatFullDate(message.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Reply Box - Fixed */}
                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                            <div className="flex space-x-3">
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Type your reply..."
                                    className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                    disabled={sending}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendReply();
                                        }
                                    }}
                                />
                                <button
                                    onClick={sendReply}
                                    disabled={!replyText.trim() || sending}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                                >
                                    {sending ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    <span>Send</span>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center">
                            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Discussion Selected</h3>
                            <p className="text-gray-600">
                                Select a student discussion to view and reply to messages.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Delete Discussion</h3>
                            </div>

                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete this discussion with{' '}
                                <strong>{discussionToDelete?.student.name}</strong>?
                                <br />
                                <span className="text-sm text-gray-500">
                                    This will permanently delete all {discussionToDelete?.messageCount || 0} messages and cannot be undone.
                                </span>
                            </p>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setDiscussionToDelete(null);
                                    }}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                    disabled={deleting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteDiscussion}
                                    disabled={deleting}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                                >
                                    {deleting ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    <span>Delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstructorMessagesChat;