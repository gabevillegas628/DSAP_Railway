import React, { useState, useEffect } from 'react';
import { useProgramSettingsContext } from '../context/ProgramSettingsContext';
import { Plus, Edit2, Trash2, Save, X, MessageSquare, Download, Upload, Database, AlertCircle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import ExportModal from './ExportModal';
import ImportModal from './ImportModal';
import apiService from '../services/apiService';

// Add this CSS for animations
const animationStyles = `
  .section-wrapper {
    display: grid;
    transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .section-wrapper.collapsed {
    grid-template-rows: 0fr;
  }
  .section-wrapper.expanded {
    grid-template-rows: 1fr;
  }
  .section-content {
    overflow: hidden;
    transition: opacity 0.3s ease;
  }
  .section-content.collapsed {
    opacity: 0;
  }
  .section-content.expanded {
    opacity: 1;
  }
  .chevron-icon {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .chevron-icon.expanded {
    transform: rotate(90deg);
  }
`;

// Inject styles into document head
if (typeof document !== 'undefined' && !document.querySelector('#director-settings-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'director-settings-styles';
  styleSheet.textContent = animationStyles;
  document.head.appendChild(styleSheet);
}

// Project icon component - add this OUTSIDE the DirectorSettings component
const ProjectIcon = () => (
  <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center text-white text-xs font-bold">P</div>
);

// Collapsible Section Component
const CollapsibleSection = ({ sectionKey, title, description, icon: Icon, children, expandedSections, toggleSection }) => {
  const isExpanded = expandedSections[sectionKey];

  return (
    <div className="bg-white shadow rounded-lg mb-6">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Icon className="text-indigo-600" size={20} />
          <div className="text-left">
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>
        </div>
        <ChevronRight
          className={`chevron-icon text-gray-400 ${isExpanded ? 'expanded' : ''}`}
          size={20}
        />
      </button>
      <div className={`section-wrapper ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className={`section-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
          <div className="px-6 pb-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const DirectorSettings = () => {
  //const { settings, loading: contextLoading, updateSettings } = useProgramSettingsContext();
  const [settings, setSettings] = useState(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [formData, setFormData] = useState({
    projectHeader: 'DNA Analysis Program',
    principalInvestigator: '',
    projectName: '',
    staffEmail: '',
    organismName: '',
    orfContactInformation: '',
    cloningVector: '',
    sequencePrimer: '',
    libraryName: '',
    restrictionEnzyme: '',
    description: '',
    welcomeText: '',
    overview: '',
    collectDemographics: false
  });
  const [directors, setDirectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Import/Export states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [lastImportResult, setLastImportResult] = useState(null);

  // Section visibility states
  const [expandedSections, setExpandedSections] = useState({
    projectInfo: true,
    commonFeedback: false,
    dataManagement: false
  });

  // Common Feedback states
  const [analysisQuestions, setAnalysisQuestions] = useState([]);
  const [commonFeedback, setCommonFeedback] = useState([]);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [newFeedback, setNewFeedback] = useState({
    questionId: '',
    title: '',
    text: ''
  });



  // Add this function to fetch settings directly
  const fetchSettings = async () => {
    try {
      setContextLoading(true);
      const data = await apiService.get('/program-settings');
      setSettings(data);
      setContextLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setContextLoading(false);
    }
  };

  // Load directors on component mount
  // Load directors on component mount
  useEffect(() => {
    const loadDirectors = async () => {
      try {
        const data = await apiService.get('/directors');
        setDirectors(data);
      } catch (error) {
        console.error('Error loading directors:', error);
      }
    };

    fetchSettings();
    loadDirectors();
    loadAnalysisQuestions();
    loadCommonFeedback();
  }, []);

  // Update local state when context settings change
  // Update local state when context settings change - ENHANCED VERSION
  useEffect(() => {
    console.log('Settings useEffect triggered, settings:', settings);

    if (settings && Object.keys(settings).length > 0) {
      console.log('Updating formData with settings');
      setFormData({
        projectHeader: settings.projectHeader || 'DNA Analysis Program',
        principalInvestigator: settings.principalInvestigator || '',
        projectName: settings.projectName || '',
        staffEmail: settings.staffEmail || '',
        organismName: settings.organismName || '',
        orfContactInformation: settings.orfContactInformation || '',
        cloningVector: settings.cloningVector || '',
        sequencePrimer: settings.sequencePrimer || '',
        libraryName: settings.libraryName || '',
        restrictionEnzyme: settings.restrictionEnzyme || '',
        description: settings.description || '',
        welcomeText: settings.welcomeText || '',
        overview: settings.overview || '',
        collectDemographics: settings.collectDemographics || false
      });
    }
  }, [settings, contextLoading]); // Added contextLoading as dependency

  // Add this useEffect to force populate fields if they're still empty after context loads
  useEffect(() => {
    // If context is not loading, and we have settings, but formData is still empty - force update
    if (!contextLoading && settings && Object.keys(settings).length > 0 && !formData.projectName) {
      console.log('Fallback: Force updating formData because fields are empty');
      setFormData({
        projectHeader: settings.projectHeader || 'DNA Analysis Program',
        principalInvestigator: settings.principalInvestigator || '',
        projectName: settings.projectName || '',
        staffEmail: settings.staffEmail || '',
        organismName: settings.organismName || '',
        orfContactInformation: settings.orfContactInformation || '',
        cloningVector: settings.cloningVector || '',
        sequencePrimer: settings.sequencePrimer || '',
        libraryName: settings.libraryName || '',
        restrictionEnzyme: settings.restrictionEnzyme || '',
        description: settings.description || '',
        welcomeText: settings.welcomeText || '',
        overview: settings.overview || ''
      });
    }
  }, [contextLoading, settings, formData.projectName]);


  const loadAnalysisQuestions = async () => {
    try {
      const questions = await apiService.get('/analysis-questions');
      setAnalysisQuestions(questions);
    } catch (error) {
      console.error('Error loading analysis questions:', error);
    }
  };

  const loadCommonFeedback = async () => {
    try {
      console.log('Loading common feedback...');
      const feedback = await apiService.get('/common-feedback');
      console.log('Common feedback response:', feedback);
      console.log('Number of feedback items:', feedback?.length || 0);
      setCommonFeedback(feedback);
    } catch (error) {
      console.error('Error loading common feedback:', error);
      console.error('Error details:', error.message);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Replace your handleSave function:
  const handleSave = async () => {
    setLoading(true);
    setSaveStatus('');

    try {
      const response = await apiService.post('/program-settings', formData);
      setSettings(response); // Update local settings
      setSaveStatus('Settings saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('Error saving settings. Please try again.');
    }

    setLoading(false);
  };

  // Import/Export functions
  const handleImportComplete = (result) => {
    setLastImportResult(result);
    // Refresh data after successful import
    if (result.success) {
      loadAnalysisQuestions();
      loadCommonFeedback();
      // You might want to refresh other data as well
    }
    console.log('Import completed:', result);
  };

  // Toggle section visibility
  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };


  // Common Feedback functions
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();

    if (!newFeedback.questionId || !newFeedback.title || !newFeedback.text) {
      alert('Please fill in all fields');
      return;
    }

    try {
      if (editingFeedback) {
        await apiService.put(`/api/common-feedback/${editingFeedback.id}`, newFeedback);
      } else {
        await apiService.post('/common-feedback', newFeedback);
      }

      await loadCommonFeedback();
      setShowFeedbackForm(false);
      setEditingFeedback(null);
      setNewFeedback({ questionId: '', title: '', text: '' });
    } catch (error) {
      console.error('Error saving feedback:', error);
      alert('Error saving feedback');
    }
  };

  const editFeedback = (feedback) => {
    setEditingFeedback(feedback);
    setNewFeedback({
      questionId: feedback.questionId,
      title: feedback.title,
      text: feedback.text
    });
    setShowFeedbackForm(true);
  };

  const deleteFeedback = async (feedbackId) => {
    if (!window.confirm('Are you sure you want to delete this feedback option?')) {
      return;
    }

    try {
      await apiService.delete(`/api/common-feedback/${feedbackId}`);
      await loadCommonFeedback();
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('Error deleting feedback');
    }
  };

  const cancelFeedbackForm = () => {
    setShowFeedbackForm(false);
    setEditingFeedback(null);
    setNewFeedback({ questionId: '', title: '', text: '' });
  };

  const getQuestionText = (questionId) => {
    const question = analysisQuestions.find(q => q.id === questionId);
    return question ? question.text : 'Unknown Question';
  };

  const getStepName = (step) => {
    return step.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Group feedback by question for better organization
  const groupedFeedback = commonFeedback.reduce((groups, feedback) => {
    const questionId = feedback.questionId;
    if (!groups[questionId]) {
      groups[questionId] = [];
    }
    groups[questionId].push(feedback);
    return groups;
  }, {});

  // Show loading state if context is still loading
  if (contextLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }


  return (

    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Program Settings</h2>
        <p className="text-gray-600 mt-1">Configure program information, manage data, and set up common feedback options</p>
      </div>

      {/* Project Information Section */}
      <CollapsibleSection
        sectionKey="projectInfo"
        title="Project Information"
        description="Configure basic project settings and details"
        icon={ProjectIcon}
        expandedSections={expandedSections}
        toggleSection={toggleSection}
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="projectHeader" className="block text-sm font-medium text-gray-700 mb-2">
              Project Header
            </label>
            <input
              type="text"
              id="projectHeader"
              value={formData.projectHeader}
              onChange={(e) => handleInputChange('projectHeader', e.target.value)}
              placeholder="Enter project header"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
              Project Name
            </label>
            <input
              type="text"
              id="projectName"
              value={formData.projectName}
              onChange={(e) => handleInputChange('projectName', e.target.value)}
              placeholder="Enter project name"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="principalInvestigator" className="block text-sm font-medium text-gray-700 mb-2">
              Principal Investigator
            </label>
            <select
              id="principalInvestigator"
              value={formData.principalInvestigator}
              onChange={(e) => handleInputChange('principalInvestigator', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Select Principal Investigator</option>
              {directors.map(director => (
                <option key={director.id} value={director.name}>
                  {director.name} ({director.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="staffEmail" className="block text-sm font-medium text-gray-700 mb-2">
              Staff Email
            </label>
            <input
              type="email"
              id="staffEmail"
              value={formData.staffEmail}
              onChange={(e) => handleInputChange('staffEmail', e.target.value)}
              placeholder="Enter staff email"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="organismName" className="block text-sm font-medium text-gray-700 mb-2">
              Organism Name
            </label>
            <input
              type="text"
              id="organismName"
              value={formData.organismName}
              onChange={(e) => handleInputChange('organismName', e.target.value)}
              placeholder="Enter organism name"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="orfContactInformation" className="block text-sm font-medium text-gray-700 mb-2">
              ORF Contact Information
            </label>
            <input
              type="text"
              id="orfContactInformation"
              value={formData.orfContactInformation}
              onChange={(e) => handleInputChange('orfContactInformation', e.target.value)}
              placeholder="Enter ORF contact information"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="cloningVector" className="block text-sm font-medium text-gray-700 mb-2">
              Cloning Vector
            </label>
            <input
              type="text"
              id="cloningVector"
              value={formData.cloningVector}
              onChange={(e) => handleInputChange('cloningVector', e.target.value)}
              placeholder="Enter cloning vector"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="sequencePrimer" className="block text-sm font-medium text-gray-700 mb-2">
              Sequence Primer
            </label>
            <input
              type="text"
              id="sequencePrimer"
              value={formData.sequencePrimer}
              onChange={(e) => handleInputChange('sequencePrimer', e.target.value)}
              placeholder="Enter sequence primer"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="libraryName" className="block text-sm font-medium text-gray-700 mb-2">
              Library Name
            </label>
            <input
              type="text"
              id="libraryName"
              value={formData.libraryName}
              onChange={(e) => handleInputChange('libraryName', e.target.value)}
              placeholder="Enter library name"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="restrictionEnzyme" className="block text-sm font-medium text-gray-700 mb-2">
              Restriction Enzyme
            </label>
            <input
              type="text"
              id="restrictionEnzyme"
              value={formData.restrictionEnzyme}
              onChange={(e) => handleInputChange('restrictionEnzyme', e.target.value)}
              placeholder="Enter restriction enzyme"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Project Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter project description"
              rows="4"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="welcomeText" className="block text-sm font-medium text-gray-700 mb-2">
              Welcome Text
            </label>
            <textarea
              id="welcomeText"
              value={formData.welcomeText}
              onChange={(e) => handleInputChange('welcomeText', e.target.value)}
              placeholder="Enter welcome message for students and instructors"
              rows="3"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="overview" className="block text-sm font-medium text-gray-700 mb-2">
              Project Overview
            </label>
            <textarea
              id="overview"
              value={formData.overview}
              onChange={(e) => handleInputChange('overview', e.target.value)}
              placeholder="Enter detailed project overview"
              rows="4"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          {/* Demographics Collection Toggle */}
          <div className="sm:col-span-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.collectDemographics}
                onChange={(e) => handleInputChange('collectDemographics', e.target.checked)}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Collect Demographics During Registration
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  When enabled, students will be asked to provide demographic information during account creation.
                  This data is optional and stored securely for research and analysis purposes.
                </p>
              </div>
            </label>
          </div>
        </div>
      </CollapsibleSection>

      {/* Common Feedback Management Section */}
      <CollapsibleSection
        sectionKey="commonFeedback"
        title="Common Feedback Options"
        description="Create reusable feedback responses for common issues in student submissions"
        icon={MessageSquare}
        expandedSections={expandedSections}
        toggleSection={toggleSection}
      >
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowFeedbackForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition duration-200 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Feedback</span>
          </button>
        </div>

        {/* Feedback Form */}
        {showFeedbackForm && (
          <div className="bg-gray-50 border rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-3">
              {editingFeedback ? 'Edit Feedback Option' : 'Add New Feedback Option'}
            </h4>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question
                </label>
                <select
                  value={newFeedback.questionId}
                  onChange={(e) => setNewFeedback({ ...newFeedback, questionId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">Select a question...</option>
                  {analysisQuestions.map(question => (
                    <option key={question.id} value={question.id}>
                      [{getStepName(question.step)}] {question.text.substring(0, 80)}
                      {question.text.length > 80 ? '...' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback Title
                </label>
                <input
                  type="text"
                  value={newFeedback.title}
                  onChange={(e) => setNewFeedback({ ...newFeedback, title: e.target.value })}
                  placeholder="e.g., Missing units, Incorrect calculation, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback Text
                </label>
                <textarea
                  value={newFeedback.text}
                  onChange={(e) => setNewFeedback({ ...newFeedback, text: e.target.value })}
                  placeholder="Enter the feedback message that will be shown to students..."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingFeedback ? 'Update' : 'Save'} Feedback</span>
                </button>
                <button
                  type="button"
                  onClick={cancelFeedbackForm}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Existing Feedback List */}
        <div className="space-y-4">
          {Object.keys(groupedFeedback).length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No common feedback options created yet. Click "Add Feedback" to get started!
            </p>
          ) : (
            Object.entries(groupedFeedback).map(([questionId, feedbackItems]) => (
              <div key={questionId} className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900">
                    {getQuestionText(questionId)}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {feedbackItems.length} feedback option{feedbackItems.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="divide-y divide-gray-200">
                  {feedbackItems.map(feedback => (
                    <div key={feedback.id} className="px-4 py-3 flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900 mb-1">
                          {feedback.title}
                        </h5>
                        <p className="text-gray-600 text-sm">
                          {feedback.text}
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => editFeedback(feedback)}
                          className="text-indigo-600 hover:text-indigo-800 p-1"
                          title="Edit feedback"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteFeedback(feedback.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete feedback"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </CollapsibleSection>

      {/* Data Management Section - Now at the end */}
      <CollapsibleSection
        sectionKey="dataManagement"
        title="Data Management"
        description="Import and export program data to share between different instances"
        icon={Database}
        expandedSections={expandedSections}
        toggleSection={toggleSection}
      >
        {/* Last Import Result */}
        {lastImportResult && (
          <div className={`p-4 rounded-lg border mb-6 ${lastImportResult.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
            }`}>
            <div className="flex items-start space-x-2">
              {lastImportResult.success ? (
                <CheckCircle className="text-green-600 mt-0.5" size={16} />
              ) : (
                <AlertCircle className="text-red-600 mt-0.5" size={16} />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${lastImportResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                  {lastImportResult.message}
                </p>
                {lastImportResult.results && (
                  <div className="mt-2 text-xs space-y-1">
                    {Object.entries(lastImportResult.results.imported || {}).map(([key, value]) => (
                      <p key={key} className="text-green-700">✓ {value}</p>
                    ))}
                    {Object.entries(lastImportResult.results.skipped || {}).map(([key, value]) => (
                      <p key={key} className="text-yellow-700">⚠ {value}</p>
                    ))}
                    {lastImportResult.results.errors && lastImportResult.results.errors.map((error, i) => (
                      <p key={i} className="text-red-700">✗ {error}</p>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setLastImportResult(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Card */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Download className="text-blue-600" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Export Data</h4>
                <p className="text-sm text-gray-600">Create a backup file to share with other instances</p>
              </div>
            </div>

            <div className="space-y-2 mb-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span>Directors</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Instructors</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Students</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <span>School information</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span>Practice clones and answers</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                <span>Analysis questions</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                <span>Common Feedback</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>Program settings</span>
              </div>
            </div>

            <button
              onClick={() => setShowExportModal(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download size={16} />
              <span>Export Program Data</span>
            </button>
          </div>

          {/* Import Card */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Upload className="text-green-600" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Import Data</h4>
                <p className="text-sm text-gray-600">Load data from another DNA Analysis Program instance</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="text-yellow-600 mt-0.5" size={12} />
                <p className="text-xs text-yellow-800">
                  <strong>Important:</strong> Importing may overwrite existing data. Consider exporting first as a backup.
                </p>
              </div>
            </div>

            <div className="space-y-1 mb-4 text-sm text-gray-600">
              <p>✓ Supports conflict resolution</p>
              <p>✓ Preview data before importing</p>
              <p>✓ Selective import options</p>
            </div>

            <button
              onClick={() => setShowImportModal(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Upload size={16} />
              <span>Import Program Data</span>
            </button>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-gray-50 rounded-lg p-4 mt-6">
          <h4 className="font-medium text-gray-900 mb-2">Best Practices</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <strong>Regular Backups:</strong> Export your data regularly as a backup measure</li>
            <li>• <strong>Before Major Changes:</strong> Create an export before importing data or making significant system changes</li>
            <li>• <strong>Test Environment:</strong> Consider testing imports in a separate instance first</li>
            <li>• <strong>Password Security:</strong> User passwords are never exported; imported users will need to reset their passwords (default pass: defaultpassword123)</li>
          </ul>
        </div>
      </CollapsibleSection>

      {/* Save Button */}
      <div className="flex items-center justify-between bg-white shadow rounded-lg p-6">
        <div>
          {saveStatus && (
            <p className={`text-sm ${saveStatus.includes('successfully')
              ? 'text-green-600'
              : 'text-red-600'
              }`}>
              {saveStatus}
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            }`}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Modals */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};

export default DirectorSettings;