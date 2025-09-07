import React, { useState, useEffect } from 'react';
import { Download, X, AlertCircle, Check } from 'lucide-react';
import apiService from '../services/apiService';


const ExportModal = ({ isOpen, onClose }) => {
    const [exportData, setExportData] = useState({
        directors: false,
        instructors: false,
        students: false,
        schools: false,
        practiceClones: false,
        analysisQuestions: false,
        commonFeedback: false,
        programSettings: false,
        createDefaultDirector: false
    });

    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState('');
    const [userCounts, setUserCounts] = useState({
        directors: 0,
        instructors: 0,
        students: 0
    });
    const [feedbackCounts, setFeedbackCounts] = useState({ total: 0, questions: 0 });

    // Fetch user counts and feedback counts when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchUserCounts();
            fetchFeedbackCounts();
        }
    }, [isOpen]);

    const fetchUserCounts = async () => {
        try {
            // Use apiService instead of direct fetch
            const counts = await apiService.get('/export/user-counts');
            setUserCounts(counts);
        } catch (error) {
            console.error('Error fetching user counts:', error);
        }
    };

    const fetchFeedbackCounts = async () => {
        try {
            // Use apiService instead of direct fetch
            const feedback = await apiService.get('/common-feedback');
            const uniqueQuestions = new Set(feedback.map(f => f.questionId)).size;
            setFeedbackCounts({
                total: feedback.length,
                questions: uniqueQuestions
            });
        } catch (error) {
            console.error('Error fetching feedback counts:', error);
        }
    };

    const handleExportChange = (key, value) => {
        setExportData(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleExport = async () => {
        setIsExporting(true);
        setExportStatus('Preparing export...');

        try {
            // Include createDefaultDirector flag in the export options
            const exportOptions = {
                ...exportData
            };

            // Create a custom export method since this returns a blob, not JSON
            const blob = await apiService.downloadExport(exportOptions);

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().split('T')[0];
            link.download = `dna-analysis-export-${timestamp}.json`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setExportStatus('Export completed successfully!');
            setTimeout(() => {
                onClose();
                setExportStatus('');
                setIsExporting(false);
            }, 2000);

        } catch (error) {
            console.error('Export error:', error);
            setExportStatus(`Export failed: ${error.message}`);
            setIsExporting(false);
        }
    };

    const hasDataSelected = Object.entries(exportData)
        .filter(([key]) => key !== 'createDefaultDirector')
        .some(([, value]) => value);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Export Program Data</h2>
                    <button
                        onClick={onClose}
                        disabled={isExporting}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-4">
                    <p className="text-gray-600 text-sm">
                        Select the data you want to export. This will create a file that can be imported into other instances of the DNA Analysis Program.
                    </p>

                    {/* User Data Section */}
                    <div className="space-y-3">
                        <h3 className="font-medium text-gray-900">Users</h3>
                        <div className="space-y-2 ml-4">
                            <label className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={exportData.directors}
                                        onChange={(e) => handleExportChange('directors', e.target.checked)}
                                        className="mr-3 h-4 w-4 text-indigo-600 rounded border-gray-300"
                                        disabled={isExporting}
                                    />
                                    <span>Directors</span>
                                </div>
                                <span className="text-sm text-gray-500">({userCounts.directors})</span>
                            </label>
                            
                            <label className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={exportData.instructors}
                                        onChange={(e) => handleExportChange('instructors', e.target.checked)}
                                        className="mr-3 h-4 w-4 text-indigo-600 rounded border-gray-300"
                                        disabled={isExporting}
                                    />
                                    <span>Instructors</span>
                                </div>
                                <span className="text-sm text-gray-500">({userCounts.instructors})</span>
                            </label>
                            
                            <label className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={exportData.students}
                                        onChange={(e) => handleExportChange('students', e.target.checked)}
                                        className="mr-3 h-4 w-4 text-indigo-600 rounded border-gray-300"
                                        disabled={isExporting}
                                    />
                                    <span>Students</span>
                                </div>
                                <span className="text-sm text-gray-500">({userCounts.students})</span>
                            </label>
                        </div>
                    </div>

                    {/* Other Data Section */}
                    <div className="space-y-3">
                        <h3 className="font-medium text-gray-900">Configuration & Content</h3>
                        <div className="space-y-2 ml-4">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={exportData.schools}
                                    onChange={(e) => handleExportChange('schools', e.target.checked)}
                                    className="mr-3 h-4 w-4 text-indigo-600 rounded border-gray-300"
                                    disabled={isExporting}
                                />
                                <span>Schools</span>
                            </label>
                            
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={exportData.practiceClones}
                                    onChange={(e) => handleExportChange('practiceClones', e.target.checked)}
                                    className="mr-3 h-4 w-4 text-indigo-600 rounded border-gray-300"
                                    disabled={isExporting}
                                />
                                <span>Practice Clones</span>
                            </label>
                            
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={exportData.analysisQuestions}
                                    onChange={(e) => handleExportChange('analysisQuestions', e.target.checked)}
                                    className="mr-3 h-4 w-4 text-indigo-600 rounded border-gray-300"
                                    disabled={isExporting}
                                />
                                <span>Analysis Questions</span>
                            </label>

                            <label className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={exportData.commonFeedback}
                                        onChange={(e) => handleExportChange('commonFeedback', e.target.checked)}
                                        className="mr-3 h-4 w-4 text-indigo-600 rounded border-gray-300"
                                        disabled={isExporting}
                                    />
                                    <span>Common Feedback</span>
                                </div>
                                <span className="text-sm text-gray-500">
                                    ({feedbackCounts.total} items, {feedbackCounts.questions} questions)
                                </span>
                            </label>
                            
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={exportData.programSettings}
                                    onChange={(e) => handleExportChange('programSettings', e.target.checked)}
                                    className="mr-3 h-4 w-4 text-indigo-600 rounded border-gray-300"
                                    disabled={isExporting}
                                />
                                <span>Program Settings</span>
                            </label>
                        </div>
                    </div>

                    {/* Default Director Option */}
                    {exportData.directors && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <label className="flex items-start">
                                <input
                                    type="checkbox"
                                    checked={exportData.createDefaultDirector}
                                    onChange={(e) => handleExportChange('createDefaultDirector', e.target.checked)}
                                    className="mr-3 mt-1 h-4 w-4 text-indigo-600 rounded border-gray-300"
                                    disabled={isExporting}
                                />
                                <div>
                                    <span className="font-medium">Create default director in target system</span>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Creates a default director account (admin/password123) if no directors exist after import
                                    </p>
                                </div>
                            </label>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between pt-4 border-t border-gray-200">
                        <button
                            onClick={onClose}
                            disabled={isExporting}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={!hasDataSelected || isExporting}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-2"
                        >
                            {isExporting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    <span>Exporting...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    <span>Export Data</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Status Messages */}
                    {exportStatus && (
                        <div className={`p-3 rounded-lg border flex items-start space-x-2 ${
                            exportStatus.includes('successfully') || exportStatus.includes('completed')
                                ? 'bg-green-50 border-green-200'
                                : exportStatus.includes('failed') || exportStatus.includes('Error')
                                ? 'bg-red-50 border-red-200'
                                : 'bg-blue-50 border-blue-200'
                        }`}>
                            {exportStatus.includes('successfully') || exportStatus.includes('completed') ? (
                                <Check className="text-green-600 mt-0.5" size={16} />
                            ) : exportStatus.includes('failed') || exportStatus.includes('Error') ? (
                                <AlertCircle className="text-red-600 mt-0.5" size={16} />
                            ) : (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mt-0.5"></div>
                            )}
                            <p className={`text-sm ${
                                exportStatus.includes('successfully') || exportStatus.includes('completed')
                                    ? 'text-green-800'
                                    : exportStatus.includes('failed') || exportStatus.includes('Error')
                                    ? 'text-red-800'
                                    : 'text-blue-800'
                            }`}>
                                {exportStatus}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExportModal;