// components/DirectorHelp.jsx
import React, { useState, useEffect } from 'react';
import {
    Edit,
    Trash2,
    Plus,
    HelpCircle,
    ExternalLink,
    Video,
    FileText,
    ChevronDown,
    ChevronRight,
    AlertCircle,
    X
} from 'lucide-react';
import apiService from '../services/apiService';

const DirectorHelp = () => {
    const [helpTopics, setHelpTopics] = useState([]);
    const [analysisQuestions, setAnalysisQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTopic, setEditingTopic] = useState(null);
    const [expandedSteps, setExpandedSteps] = useState(new Set(['clone-editing']));
    const [formData, setFormData] = useState({
        analysisQuestionId: '',
        title: '',
        videoBoxUrl: '',
        helpDocumentUrl: ''
    });
    const [stepHelp, setStepHelp] = useState([]);
    const [showStepForm, setShowStepForm] = useState(false);
    const [editingStepHelp, setEditingStepHelp] = useState(null);
    const [stepFormData, setStepFormData] = useState({
        step: '',
        title: '',
        description: '',
        videoBoxUrl: '',
        helpDocumentUrl: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [topics, questions, stepHelpData] = await Promise.all([
                apiService.get('/help-topics'),
                apiService.get('/analysis-questions'),
                apiService.get('/step-help')
            ]);
            setHelpTopics(topics);
            setAnalysisQuestions(questions);
            setStepHelp(stepHelpData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTopic) {
                const updated = await apiService.put(`/help-topics/${editingTopic.id}`, formData);
                setHelpTopics(prev => prev.map(topic =>
                    topic.id === editingTopic.id ? updated : topic
                ));
            } else {
                const newTopic = await apiService.post('/help-topics', formData);
                setHelpTopics(prev => [newTopic, ...prev]);
            }
            resetForm();
        } catch (error) {
            console.error('Error saving help topic:', error);
            alert('Error saving help topic. Please try again.');
        }
    };

    const handleStepSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingStepHelp) {
                const updated = await apiService.put(`/step-help/${editingStepHelp.id}`, stepFormData);
                setStepHelp(prev => prev.map(help =>
                    help.id === editingStepHelp.id ? updated : help
                ));
            } else {
                const newStepHelp = await apiService.post('/step-help', stepFormData);
                setStepHelp(prev => [newStepHelp, ...prev]);
            }
            resetStepForm();
        } catch (error) {
            console.error('Error saving step help:', error);
            alert('Error saving step help. Please try again.');
        }
    };

    const resetStepForm = () => {
        setStepFormData({
            step: '',
            title: '',
            description: '',
            videoBoxUrl: '',
            helpDocumentUrl: ''
        });
        setShowStepForm(false);
        setEditingStepHelp(null);
    };

    const editStepHelp = (help) => {
        setStepFormData(help);
        setEditingStepHelp(help);
        setShowStepForm(true);
    };

    const deleteStepHelp = async (helpId) => {
        if (!window.confirm('Are you sure you want to delete this step help?')) return;
        try {
            await apiService.delete(`/step-help/${helpId}`);
            setStepHelp(prev => prev.filter(help => help.id !== helpId));
        } catch (error) {
            console.error('Error deleting step help:', error);
            alert('Error deleting step help. Please try again.');
        }
    };

    const getAvailableSteps = () => {
        const allSteps = [
            { id: 'clone-editing', name: 'Clone Editing' },
            { id: 'blast', name: 'BLAST Analysis' },
            { id: 'analysis-submission', name: 'Analysis & Submission' },
            { id: 'review', name: 'Review' }
        ];
        return allSteps.filter(step =>
            !stepHelp.some(help => help.step === step.id)
        );
    };

    const resetForm = () => {
        setFormData({
            analysisQuestionId: '',
            title: '',
            videoBoxUrl: '',
            helpDocumentUrl: ''
        });
        setShowForm(false);
        setEditingTopic(null);
    };

    const editTopic = (topic) => {
        setFormData(topic);
        setEditingTopic(topic);
        setShowForm(true);
    };

    const deleteTopic = async (topicId) => {
        if (!window.confirm('Are you sure you want to delete this help topic?')) return;
        try {
            await apiService.delete(`/help-topics/${topicId}`);
            setHelpTopics(prev => prev.filter(topic => topic.id !== topicId));
        } catch (error) {
            console.error('Error deleting help topic:', error);
            alert('Error deleting help topic. Please try again.');
        }
    };

    const getQuestionText = (questionId) => {
        const question = analysisQuestions.find(q => q.id === questionId);
        return question ? question.text : 'Unknown Question';
    };

    const getQuestionsForStep = (step) => {
        return analysisQuestions
            .filter(q => q.step === step)
            .sort((a, b) => a.order - b.order);
    };

    const getHelpTopicForQuestion = (questionId) => {
        return helpTopics.find(topic => topic.analysisQuestionId === questionId);
    };

    const toggleStep = (step) => {
        const newExpanded = new Set(expandedSteps);
        if (newExpanded.has(step)) {
            newExpanded.delete(step);
        } else {
            newExpanded.add(step);
        }
        setExpandedSteps(newExpanded);
    };

    const getStepDisplayName = (step) => {
        const stepNames = {
            'clone-editing': 'Clone Editing & Quality Check',
            'blast': 'BLAST Analysis',
            'analysis-submission': 'Final Analysis & Submission',
            'review': 'Review & Feedback'
        };
        return stepNames[step] || step;
    };

    const getAvailableQuestions = () => {
        return analysisQuestions.filter(question =>
            !helpTopics.some(topic => topic.analysisQuestionId === question.id)
        );
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading help topics...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Help Topic Management</h3>
                        <p className="text-sm text-gray-600 mt-1">Create help videos and documents for analysis questions</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition duration-200 flex items-center space-x-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Help Topic</span>
                    </button>
                </div>

                {/* Background Help Section */}
                <div className="bg-white rounded-xl shadow-sm border mb-6">
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Background Help Topics</h3>
                            <p className="text-sm text-gray-600 mt-1">Create help content for each analysis step</p>
                        </div>
                        <button
                            onClick={() => setShowStepForm(true)}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition duration-200 flex items-center space-x-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Step Help</span>
                        </button>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['clone-editing', 'blast', 'analysis-submission', 'review'].map(step => {
                                const help = stepHelp.find(h => h.step === step);
                                return (
                                    <div key={step} className={`border rounded-lg p-4 ${help ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-medium text-gray-900">{getStepDisplayName(step)}</h4>
                                            {help ? (
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                        Has Help
                                                    </span>
                                                    <button
                                                        onClick={() => editStepHelp(help)}
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteStepHelp(help.id)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                    No Help
                                                </span>
                                            )}
                                        </div>
                                        {help && (
                                            <div className="text-sm text-gray-600">
                                                <p className="font-medium">{help.title}</p>
                                                {help.description && <p className="text-xs mt-1">{help.description}</p>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Step Help Form Modal */}
                {showStepForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-lg font-semibold text-gray-900">
                                        {editingStepHelp ? 'Edit Step Help' : 'Add Step Help'}
                                    </h4>
                                    <button onClick={resetStepForm} className="text-gray-400 hover:text-gray-600">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={handleStepSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Step</label>
                                    <select
                                        value={stepFormData.step}
                                        onChange={(e) => setStepFormData({ ...stepFormData, step: e.target.value })}
                                        required
                                        disabled={editingStepHelp}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    >
                                        <option value="">Select Step</option>
                                        {editingStepHelp ? (
                                            <option value={stepFormData.step}>
                                                {getStepDisplayName(stepFormData.step)}
                                            </option>
                                        ) : (
                                            getAvailableSteps().map(step => (
                                                <option key={step.id} value={step.id}>
                                                    {step.name}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                    <input
                                        type="text"
                                        value={stepFormData.title}
                                        onChange={(e) => setStepFormData({ ...stepFormData, title: e.target.value })}
                                        required
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="e.g., Clone Editing Overview"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                                    <textarea
                                        value={stepFormData.description || ''}
                                        onChange={(e) => setStepFormData({ ...stepFormData, description: e.target.value })}
                                        rows={3}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="Brief description of what this step involves..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Video URL (Box)</label>
                                    <input
                                        type="url"
                                        value={stepFormData.videoBoxUrl}
                                        onChange={(e) => setStepFormData({ ...stepFormData, videoBoxUrl: e.target.value })}
                                        required
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="https://..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Help Document URL (Box)</label>
                                    <input
                                        type="url"
                                        value={stepFormData.helpDocumentUrl}
                                        onChange={(e) => setStepFormData({ ...stepFormData, helpDocumentUrl: e.target.value })}
                                        required
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                        placeholder="https://..."
                                    />
                                </div>

                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={resetStepForm}
                                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-200"
                                    >
                                        {editingStepHelp ? 'Update Step Help' : 'Create Step Help'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="p-6">
                    {/* Help Topics by Analysis Step */}
                    <div className="space-y-4">
                        {['clone-editing', 'blast', 'analysis-submission', 'review'].map(step => {
                            const stepQuestions = getQuestionsForStep(step);
                            const isExpanded = expandedSteps.has(step);

                            return (
                                <div key={step} className="border border-gray-200 rounded-lg overflow-hidden">
                                    {/* Step Header */}
                                    <button
                                        onClick={() => toggleStep(step)}
                                        className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="text-left">
                                                <h4 className="font-medium text-gray-900">{getStepDisplayName(step)}</h4>
                                                <p className="text-sm text-gray-500">
                                                    {stepQuestions.length} questions, {helpTopics.filter(topic => {
                                                        const question = analysisQuestions.find(q => q.id === topic.analysisQuestionId);
                                                        return question && question.step === step;
                                                    }).length} with help
                                                </p>
                                            </div>
                                        </div>
                                        {isExpanded ?
                                            <ChevronDown className="w-5 h-5 text-gray-400" /> :
                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                        }
                                    </button>

                                    {/* Step Content */}
                                    {isExpanded && (
                                        <div className="p-4 bg-white border-t border-gray-200">
                                            {stepQuestions.length === 0 ? (
                                                <div className="text-center py-6 text-gray-500">
                                                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                    <p>No questions configured for this step</p>
                                                    <p className="text-xs mt-1">Add questions in "Edit Questions" first</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {stepQuestions.map(question => {
                                                        const helpTopic = getHelpTopicForQuestion(question.id);

                                                        return (
                                                            <div
                                                                key={question.id}
                                                                className={`border rounded-lg p-4 ${helpTopic ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
                                                            >
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center space-x-2 mb-2">
                                                                            <span className="text-sm font-medium text-gray-900">
                                                                                Question {question.order}
                                                                            </span>
                                                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                                                {question.type}
                                                                            </span>
                                                                            {question.required && (
                                                                                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                                                                                    Required
                                                                                </span>
                                                                            )}
                                                                            {helpTopic && (
                                                                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex items-center space-x-1">
                                                                                    <HelpCircle className="w-3 h-3" />
                                                                                    <span>Has Help</span>
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <p className="text-sm text-gray-700 mb-2">{question.text}</p>

                                                                        {helpTopic && (
                                                                            <div className="mt-3 space-y-2">
                                                                                <div className="text-sm font-medium text-gray-900">Help Content:</div>
                                                                                <div className="text-sm text-gray-600 space-y-1">
                                                                                    <div className="flex items-center space-x-2">
                                                                                        <span className="font-medium">Title:</span>
                                                                                        <span>{helpTopic.title}</span>
                                                                                    </div>
                                                                                    {helpTopic.videoBoxUrl && (
                                                                                        <div className="flex items-center space-x-2">
                                                                                            <Video className="w-4 h-4 text-blue-600" />
                                                                                            <a
                                                                                                href={helpTopic.videoBoxUrl}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                className="text-blue-600 hover:text-blue-800 hover:underline"
                                                                                            >
                                                                                                View help video
                                                                                            </a>
                                                                                        </div>
                                                                                    )}
                                                                                    {helpTopic.helpDocumentUrl && (
                                                                                        <div className="flex items-center space-x-2">
                                                                                            <FileText className="w-4 h-4 text-green-600" />
                                                                                            <a
                                                                                                href={helpTopic.helpDocumentUrl}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                className="text-green-600 hover:text-green-800 hover:underline"
                                                                                            >
                                                                                                View help document
                                                                                            </a>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex items-center space-x-2 ml-4">
                                                                        {helpTopic ? (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => editTopic(helpTopic)}
                                                                                    className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100"
                                                                                    title="Edit help topic"
                                                                                >
                                                                                    <Edit className="w-4 h-4" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => deleteTopic(helpTopic.id)}
                                                                                    className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100"
                                                                                    title="Delete help topic"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setFormData({
                                                                                        analysisQuestionId: question.id,
                                                                                        title: `Help for: ${question.text.substring(0, 50)}${question.text.length > 50 ? '...' : ''}`,
                                                                                        videoBoxUrl: '',
                                                                                        helpDocumentUrl: ''
                                                                                    });
                                                                                    setShowForm(true);
                                                                                }}
                                                                                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium hover:bg-indigo-50 px-3 py-1 rounded"
                                                                            >
                                                                                Add Help
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Empty State */}
                    {helpTopics.length === 0 && analysisQuestions.length === 0 && (
                        <div className="text-center py-12">
                            <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h4 className="text-lg font-medium text-gray-900 mb-2">No Questions Available</h4>
                            <p className="text-gray-600 mb-4">You need to create analysis questions before you can add help topics.</p>
                            <button
                                onClick={() => {/* Navigate to Edit Questions tab */ }}
                                className="text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                                Go to Edit Questions →
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Help Topic Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editingTopic ? 'Edit Help Topic' : 'Add New Help Topic'}
                            </h3>
                            <button
                                onClick={resetForm}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                            {/* Question Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Analysis Question
                                </label>
                                <select
                                    value={formData.analysisQuestionId}
                                    onChange={(e) => setFormData({ ...formData, analysisQuestionId: e.target.value })}
                                    required
                                    disabled={editingTopic} // Can't change question when editing
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                                >
                                    <option value="">Select a question...</option>
                                    {editingTopic ? (
                                        // Show current question when editing
                                        <option value={formData.analysisQuestionId}>
                                            {getQuestionText(formData.analysisQuestionId)}
                                        </option>
                                    ) : (
                                        // Show available questions when adding new
                                        getAvailableQuestions().map(question => (
                                            <option key={question.id} value={question.id}>
                                                [{getStepDisplayName(question.step)}] {question.text}
                                            </option>
                                        ))
                                    )}
                                </select>
                                {!editingTopic && getAvailableQuestions().length === 0 && (
                                    <p className="text-sm text-amber-600 mt-1">
                                        All questions already have help topics. Edit existing topics or create new questions first.
                                    </p>
                                )}
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Help Topic Title
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    placeholder="e.g., How to analyze chromatogram peaks"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Video URL */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <div className="flex items-center space-x-2">
                                        <Video className="w-4 h-4" />
                                        <span>Box Video URL</span>
                                    </div>
                                </label>
                                <input
                                    type="url"
                                    value={formData.videoBoxUrl}
                                    onChange={(e) => setFormData({ ...formData, videoBoxUrl: e.target.value })}
                                    placeholder="https://app.box.com/s/..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Upload your video to Box and paste the shared link here
                                </p>
                            </div>

                            {/* Help Document URL */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <div className="flex items-center space-x-2">
                                        <FileText className="w-4 h-4" />
                                        <span>Box Help Document URL</span>
                                    </div>
                                </label>
                                <input
                                    type="url"
                                    value={formData.helpDocumentUrl}
                                    onChange={(e) => setFormData({ ...formData, helpDocumentUrl: e.target.value })}
                                    placeholder="https://app.box.com/s/..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Upload your PDF help document to Box and paste the shared link here
                                </p>
                            </div>

                            {/* Box Integration Info */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start space-x-2">
                                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <h5 className="text-sm font-medium text-blue-900 mb-2">Box Integration Tips:</h5>
                                        <ul className="text-xs text-blue-800 space-y-1">
                                            <li>• Upload videos and PDFs to your Box account</li>
                                            <li>• Share the files with "People with the link" access</li>
                                            <li>• Copy the shared link and paste it above</li>
                                            <li>• Students will be able to view content directly in their browser</li>
                                            <li>• For videos, Box supports MP4, MOV, and other common formats</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!formData.analysisQuestionId || !formData.title || (!formData.videoBoxUrl && !formData.helpDocumentUrl)}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    {editingTopic ? 'Update Help Topic' : 'Create Help Topic'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            {helpTopics.length > 0 && (
                <div className="mt-6 bg-white rounded-xl shadow-sm border p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Help Coverage Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {['clone-editing', 'blast', 'analysis-submission', 'review'].map(step => {
                            const stepQuestions = getQuestionsForStep(step);
                            const helpCount = helpTopics.filter(topic => {
                                const question = analysisQuestions.find(q => q.id === topic.analysisQuestionId);
                                return question && question.step === step;
                            }).length;
                            const coverage = stepQuestions.length > 0 ? Math.round((helpCount / stepQuestions.length) * 100) : 0;

                            return (
                                <div key={step} className="text-center p-4 bg-gray-50 rounded-lg">
                                    <div className="text-2xl font-bold text-gray-900">{coverage}%</div>
                                    <div className="text-sm text-gray-600">{getStepDisplayName(step)}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {helpCount} of {stepQuestions.length} questions
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
};

export default DirectorHelp;