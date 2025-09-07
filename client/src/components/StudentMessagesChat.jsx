import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, FileText, Search, Plus } from 'lucide-react';
import { useDNAContext } from '../context/DNAContext';
import apiService from '../services/apiService';
import { markDiscussionAsRead } from '../utils/discussionUtils';

const StudentMessagesChat = ({
    selectedCloneId,
    onMessageRead,
    prePopulatedReplyText = ''
}) => {
    const { currentUser } = useDNAContext();

    const [discussions, setDiscussions] = useState([]);
    const [selectedDiscussion, setSelectedDiscussion] = useState(null);
    const [messages, setMessages] = useState([]);
    const [replyText, setReplyText] = useState(prePopulatedReplyText);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (currentUser?.id) {
            loadDiscussions();
        } else {
            setLoading(false);
        }
    }, [currentUser?.id, selectedCloneId]);

    useEffect(() => {
        if (prePopulatedReplyText) {
            setReplyText(prePopulatedReplyText);
        }
    }, [prePopulatedReplyText]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);



    const loadDiscussions = async () => {
        if (!currentUser?.id) {
            setLoading(false);
            return;
        }

        try {
            const discussionsData = await apiService.get(`/clone-discussions/student/${currentUser.id}`);
            setDiscussions(discussionsData);

            // Auto-select discussion if selectedCloneId is provided
            if (selectedCloneId) {
                const targetDiscussion = discussionsData.find(d =>
                    d.cloneId === selectedCloneId ||
                    (selectedCloneId === 'general' && !d.cloneId)
                );
                if (targetDiscussion) {
                    await selectDiscussion(targetDiscussion);
                }
            }
        } catch (error) {
            console.error('Error loading discussions:', error);
        } finally {
            setLoading(false);
        }
    };

    // Add this new useEffect after the existing useEffects in StudentMessagesChat.jsx
    useEffect(() => {
        // Handle selectedCloneId changes when component is already mounted with discussions
        if (selectedCloneId && discussions.length > 0) {
            const targetDiscussion = discussions.find(d =>
                d.cloneId === selectedCloneId ||
                (selectedCloneId === 'general' && !d.cloneId)
            );

            if (targetDiscussion && (!selectedDiscussion || selectedDiscussion.id !== targetDiscussion.id)) {
                console.log('Auto-selecting discussion due to selectedCloneId change:', targetDiscussion.id);
                selectDiscussion(targetDiscussion);
            }
        }
    }, [selectedCloneId, discussions, selectedDiscussion]); // Watch for changes to selectedCloneId

    // Load all messages for a specific discussion
    const loadMessages = async (discussionId) => {
        try {
            setLoadingMessages(true);
            const response = await apiService.get(`/clone-discussions/${discussionId}/messages`);
            setMessages(response.messages);
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    // In both StudentMessagesChat.jsx and DirectorMessagesChat.jsx
    // In StudentMessagesChat.jsx, update the selectDiscussion function:
    const selectDiscussion = async (discussion) => {
        console.log('🔍 Selecting discussion:', discussion.id, 'Unread count:', discussion.unreadCount);

        setSelectedDiscussion(discussion);
        setMessages([]); // Clear previous messages

        // Load all messages for this discussion
        await loadMessages(discussion.id);

        // ALWAYS mark as read when opening (like WhatsApp/Slack)
        if (discussion.unreadCount > 0) {
            console.log('📝 Attempting to mark discussion as read:', discussion.id, 'for user:', currentUser.id);

            try {
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
                    console.log('🔄 Updated discussions state:', updated.map(d => ({ id: d.id, unreadCount: d.unreadCount })));
                    return updated;
                });

                // Refresh the dashboard count
                if (onMessageRead) {
                    console.log('🔄 Calling onMessageRead to refresh dashboard');
                    onMessageRead();
                }
            } catch (error) {
                console.error('❌ Error marking discussion as read:', error);
            }
        } else {
            console.log('ℹ️ Discussion already has 0 unread messages, skipping mark as read');
        }
    };
    const sendReply = async () => {
        if (!replyText.trim() || !selectedDiscussion || sending) return;

        setSending(true);
        try {
            const newMessage = await apiService.post(`/clone-discussions/${selectedDiscussion.id}/messages`, {
                senderId: currentUser.id,
                content: replyText.trim(),
                messageType: 'message'
            });

            // Add new message to the end of messages
            setMessages(prev => [...prev, newMessage]);

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
        } catch (error) {
            console.error('Error sending reply:', error);
            alert('Failed to send reply. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const createNewDiscussion = async () => {
        if (!currentUser?.id) {
            console.error('No current user ID available');
            return;
        }

        try {
            const discussion = await apiService.get(`/clone-discussions/${currentUser.id}/general`);
            setDiscussions(prev => {
                const exists = prev.find(d => d.id === discussion.id);
                if (exists) return prev;
                return [discussion, ...prev];
            });
            await selectDiscussion(discussion);
        } catch (error) {
            console.error('Error creating new discussion:', error);
            alert('Failed to create new discussion. Please try again.');
        }
    };

    // Filter discussions based on search
    const filteredDiscussions = React.useMemo(() => {
        if (!searchTerm) return discussions;
        return discussions.filter(discussion =>
            (discussion.clone?.cloneName && discussion.clone.cloneName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            discussion.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [discussions, searchTerm]);

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

    return (
        <div className="h-[600px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex">
            {/* Left Sidebar - Discussion List */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">Your Discussions</h3>
                        <button
                            onClick={createNewDiscussion}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            title="Start New Discussion"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search discussions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div className="text-xs text-gray-600 mt-2">
                        {filteredDiscussions.length} discussion{filteredDiscussions.length !== 1 ? 's' : ''}
                    </div>
                </div>

                {/* Discussion List - Fixed height with scroll */}
                <div className="flex-1 overflow-y-auto">
                    {filteredDiscussions.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm">No discussions found</p>
                            <button
                                onClick={createNewDiscussion}
                                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                                Start First Discussion
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-1 p-2">
                            {filteredDiscussions.map((discussion) => (
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
                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                                {discussion.clone ? (
                                                    <FileText className="w-4 h-4 text-gray-600" />
                                                ) : (
                                                    <MessageCircle className="w-4 h-4 text-gray-600" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900 text-sm">
                                                    {discussion.clone?.cloneName ||
                                                        discussion.practiceClone?.cloneName ||
                                                        'General Discussion'}
                                                </p>
                                                <p className="text-xs text-gray-600">with Instructors</p>
                                            </div>
                                        </div>
                                        {discussion.unreadCount > 0 && (
                                            <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                                {discussion.unreadCount}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-1">
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
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                    {selectedDiscussion.clone ? (
                                        <FileText className="w-5 h-5 text-gray-600" />
                                    ) : (
                                        <MessageCircle className="w-5 h-5 text-gray-600" />
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">
                                        {selectedDiscussion.clone?.cloneName ||
                                            selectedDiscussion.practiceClone?.cloneName ||
                                            'General Discussion'}
                                    </h4>
                                    <p className="text-sm text-gray-600">Discussion with your instructors</p>
                                </div>
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
                                    <p>No messages yet. Start the conversation!</p>
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
                                                    {message.sender.id === currentUser.id ? 'You' : message.sender.name}
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
                                    placeholder="Type your message..."
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
                            <p className="text-gray-600 mb-4">
                                Select a discussion to view and send messages to your instructors.
                            </p>
                            <button
                                onClick={createNewDiscussion}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Start New Discussion
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentMessagesChat;