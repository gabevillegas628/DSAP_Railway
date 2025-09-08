import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, User, FileText, Clock } from 'lucide-react';
import { useDNAContext } from '../context/DNAContext';
import apiService from '../services/apiService';

const SimpleStudentChat = ({ 
    selectedCloneId = null, 
    onMessageRead = null,
    prePopulatedReplyText = '',
    onReplyTextUsed = null
}) => {
    const { currentUser } = useDNAContext();
    
    // States
    const [discussions, setDiscussions] = useState([]);
    const [selectedDiscussion, setSelectedDiscussion] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    
    const messagesEndRef = useRef(null);

    // Load discussions on mount
    useEffect(() => {
        if (currentUser?.id) {
            loadDiscussions();
        }
    }, [currentUser?.id]);

    // Auto-select discussion if selectedCloneId is provided
    useEffect(() => {
        if (selectedCloneId && discussions.length > 0) {
            const targetDiscussion = discussions.find(d => 
                d.cloneId === selectedCloneId || 
                (selectedCloneId === 'general' && !d.cloneId)
            );
            if (targetDiscussion) {
                selectDiscussion(targetDiscussion);
            }
        }
    }, [selectedCloneId, discussions]);

    // Handle pre-populated reply text
    useEffect(() => {
        if (prePopulatedReplyText) {
            setNewMessage(prePopulatedReplyText);
            // Notify parent that reply text was used
            if (onReplyTextUsed) {
                onReplyTextUsed();
            }
        }
    }, [prePopulatedReplyText, onReplyTextUsed]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const loadDiscussions = async () => {
        try {
            setLoading(true);
            const data = await apiService.get(`/clone-discussions/student/${currentUser.id}`);
            console.log('Loaded discussions:', data);
            setDiscussions(data);
        } catch (error) {
            console.error('Error loading discussions:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectDiscussion = async (discussion) => {
        console.log('Selecting discussion:', discussion.id);
        
        setSelectedDiscussion(discussion);
        setLoadingMessages(true);
        
        try {
            // Load messages for this discussion
            const response = await apiService.get(`/clone-discussions/${discussion.id}/messages`);
            setMessages(response.messages || []);
            
            // Mark as read if there are unread messages
            if (discussion.unreadCount > 0) {
                await apiService.patch(`/clone-discussions/${discussion.id}/mark-read`, {
                    userId: currentUser.id
                });
                
                // Update local state
                setDiscussions(prev => prev.map(d => 
                    d.id === discussion.id ? { ...d, unreadCount: 0 } : d
                ));
                
                // Notify parent
                if (onMessageRead) {
                    onMessageRead();
                }
            }
        } catch (error) {
            console.error('Error loading messages or marking as read:', error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedDiscussion || sending) return;
        
        setSending(true);
        try {
            const message = await apiService.post(`/clone-discussions/${selectedDiscussion.id}/messages`, {
                senderId: currentUser.id,
                content: newMessage.trim(),
                messageType: 'message'
            });
            
            // Add to local messages
            setMessages(prev => [...prev, message]);
            
            // Update discussion in list
            setDiscussions(prev => prev.map(d => 
                d.id === selectedDiscussion.id 
                    ? { ...d, lastMessageAt: new Date().toISOString(), messageCount: (d.messageCount || 0) + 1 }
                    : d
            ));
            
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setSending(false);
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

    const getDiscussionTitle = (discussion) => {
        if (discussion.clone?.cloneName) return discussion.clone.cloneName;
        if (discussion.practiceClone?.cloneName) return discussion.practiceClone.cloneName;
        return 'General Discussion';
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
            {/* Left Panel - Discussions */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">Your Discussions</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        {discussions.length} discussion{discussions.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {/* Discussions List */}
                <div className="flex-1 overflow-y-auto">
                    {discussions.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm">No discussions found</p>
                        </div>
                    ) : (
                        <div className="space-y-1 p-2">
                            {discussions.map((discussion) => (
                                <div
                                    key={discussion.id}
                                    onClick={() => selectDiscussion(discussion)}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                        selectedDiscussion?.id === discussion.id
                                            ? 'bg-blue-50 border border-blue-200'
                                            : 'hover:bg-gray-50 border border-transparent'
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                                {discussion.clone || discussion.practiceClone ? (
                                                    <FileText className="w-4 h-4 text-gray-600" />
                                                ) : (
                                                    <MessageCircle className="w-4 h-4 text-gray-600" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900 text-sm">
                                                    {getDiscussionTitle(discussion)}
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

            {/* Right Panel - Messages */}
            <div className="flex-1 flex flex-col">
                {selectedDiscussion ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                    {selectedDiscussion.clone || selectedDiscussion.practiceClone ? (
                                        <FileText className="w-5 h-5 text-gray-600" />
                                    ) : (
                                        <MessageCircle className="w-5 h-5 text-gray-600" />
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">
                                        {getDiscussionTitle(selectedDiscussion)}
                                    </h4>
                                    <p className="text-sm text-gray-600">Discussion with your instructors</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                                        <div className={`max-w-3/4 rounded-lg p-3 ${
                                            message.sender.id === currentUser.id
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-900'
                                        }`}>
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

                        {/* Message Input */}
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <div className="flex space-x-3">
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                    disabled={sending}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!newMessage.trim() || sending}
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
                                Select a discussion to view and send messages to your instructors.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SimpleStudentChat;