import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, Check, FileText, Users, Building, FlaskConical, Settings, HelpCircle, MessageSquare } from 'lucide-react';
import apiService from '../services/apiService';


const ImportModal = ({ isOpen, onClose, onImportComplete }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [importData, setImportData] = useState({});
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState('');
    const [conflictResolution, setConflictResolution] = useState('skip'); // 'skip', 'overwrite', 'merge'
    const fileInputRef = useRef(null);

    const resetModal = () => {
        setSelectedFile(null);
        setFilePreview(null);
        setImportData({});
        setImportStatus('');
        setConflictResolution('skip');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            setImportStatus('Please select a valid JSON export file.');
            return;
        }

        setSelectedFile(file);
        setIsAnalyzing(true);
        setImportStatus('Analyzing file...');

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate export format
            if (!data.exportInfo || !data.exportInfo.version) {
                throw new Error('Invalid export file format');
            }

            setFilePreview(data);

            // Initialize import selections (default to true for available data)
            const initialImportData = {};
            if (data.users) initialImportData.users = true;
            if (data.schools) initialImportData.schools = true;
            if (data.practiceClones) initialImportData.practiceClones = true;
            if (data.analysisQuestions) initialImportData.analysisQuestions = true;
            if (data.commonFeedback) initialImportData.commonFeedback = true;
            if (data.programSettings) initialImportData.programSettings = true;

            setImportData(initialImportData);
            setImportStatus('');

        } catch (error) {
            console.error('Error analyzing file:', error);
            setImportStatus(`Error reading file: ${error.message}`);
            setSelectedFile(null);
            setFilePreview(null);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleImportChange = (key, value) => {
        setImportData(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleImport = async () => {
        setIsImporting(true);
        setImportStatus('Importing data...');

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('options', JSON.stringify({
                ...importData,
                conflictResolution
            }));

            // Use apiService.uploadFiles instead of direct fetch
            const result = await apiService.uploadFiles('/import', formData);

            setImportStatus(`Import completed successfully!`);
            
            setTimeout(() => {
                onImportComplete?.(result);
                onClose();
                resetModal();
            }, 2000);

        } catch (error) {
            console.error('Import error:', error);
            setImportStatus(`Import failed: ${error.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    const getDataTypeIcon = (type) => {
        switch (type) {
            case 'users': return <Users className="text-blue-600" size={16} />;
            case 'schools': return <Building className="text-green-600" size={16} />;
            case 'practiceClones': return <FlaskConical className="text-purple-600" size={16} />;
            case 'analysisQuestions': return <HelpCircle className="text-orange-600" size={16} />;
            case 'commonFeedback': return <MessageSquare className="text-teal-600" size={16} />;
            case 'programSettings': return <Settings className="text-gray-600" size={16} />;
            default: return <FileText className="text-gray-600" size={16} />;
        }
    };

    const getDataTypeLabel = (type) => {
        switch (type) {
            case 'users': return 'Users';
            case 'schools': return 'Schools';
            case 'practiceClones': return 'Practice Clones';
            case 'analysisQuestions': return 'Analysis Questions';
            case 'commonFeedback': return 'Common Feedback';
            case 'programSettings': return 'Program Settings';
            default: return type;
        }
    };

    const hasDataSelected = Object.values(importData).some(value => value);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Import Program Data</h2>
                    <button
                        onClick={() => { onClose(); resetModal(); }}
                        disabled={isImporting}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                {!selectedFile ? (
                    /* File Selection */
                    <div className="space-y-4">
                        <p className="text-gray-600 text-sm">
                            Select a DNA Analysis Program export file to import data from another instance.
                        </p>

                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                            <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                            <p className="text-gray-600 mb-4">
                                Choose an export file (.json) to import
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileSelect}
                                className="hidden"
                                disabled={isAnalyzing}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isAnalyzing}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {isAnalyzing ? 'Analyzing...' : 'Select File'}
                            </button>
                        </div>

                        {importStatus && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
                                <AlertCircle className="text-red-600 mt-0.5" size={16} />
                                <p className="text-red-800 text-sm">{importStatus}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Import Configuration */
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">Import Configuration</h3>
                                <p className="text-sm text-gray-500">Select which data types to import</p>
                            </div>
                            <button
                                onClick={() => { resetModal(); }}
                                disabled={isImporting}
                                className="text-sm text-indigo-600 hover:text-indigo-700"
                            >
                                Choose Different File
                            </button>
                        </div>

                        {/* Export Info */}
                        {filePreview?.exportInfo && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <h4 className="font-medium text-blue-900 mb-2">Export Information</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                                    <div>Version: {filePreview.exportInfo.version}</div>
                                    <div>Date: {new Date(filePreview.exportInfo.timestamp).toLocaleDateString()}</div>
                                    <div>Source: {filePreview.exportInfo.source || 'Unknown'}</div>
                                    <div>By: {filePreview.exportInfo.exportedBy || 'Unknown'}</div>
                                </div>
                            </div>
                        )}

                        {/* Data Selection */}
                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-900">Select Data to Import</h4>
                            
                            {filePreview && Object.entries(filePreview)
                                .filter(([key, value]) => key !== 'exportInfo' && Array.isArray(value) && value.length > 0)
                                .map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        {getDataTypeIcon(key)}
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {getDataTypeLabel(key)}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {value.length} item{value.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={importData[key] || false}
                                            onChange={(e) => handleImportChange(key, e.target.checked)}
                                            className="mr-2 h-4 w-4 text-indigo-600 rounded border-gray-300"
                                            disabled={isImporting}
                                        />
                                        <span className="text-sm text-gray-700">Import</span>
                                    </label>
                                </div>
                            ))}

                            {/* Program Settings Special Case */}
                            {filePreview?.programSettings && (
                                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        {getDataTypeIcon('programSettings')}
                                        <div>
                                            <div className="font-medium text-gray-900">Program Settings</div>
                                            <div className="text-sm text-gray-500">Configuration data</div>
                                        </div>
                                    </div>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={importData.programSettings || false}
                                            onChange={(e) => handleImportChange('programSettings', e.target.checked)}
                                            className="mr-2 h-4 w-4 text-indigo-600 rounded border-gray-300"
                                            disabled={isImporting}
                                        />
                                        <span className="text-sm text-gray-700">Import</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Conflict Resolution */}
                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-900">Conflict Resolution</h4>
                            <p className="text-sm text-gray-600">How should conflicts be handled when imported data already exists?</p>
                            
                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="skip"
                                        checked={conflictResolution === 'skip'}
                                        onChange={(e) => setConflictResolution(e.target.value)}
                                        className="mr-3 h-4 w-4 text-indigo-600"
                                        disabled={isImporting}
                                    />
                                    <div>
                                        <span className="font-medium">Skip existing items</span>
                                        <p className="text-sm text-gray-500">Leave existing data unchanged</p>
                                    </div>
                                </label>
                                
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="overwrite"
                                        checked={conflictResolution === 'overwrite'}
                                        onChange={(e) => setConflictResolution(e.target.value)}
                                        className="mr-3 h-4 w-4 text-indigo-600"
                                        disabled={isImporting}
                                    />
                                    <div>
                                        <span className="font-medium">Overwrite existing items</span>
                                        <p className="text-sm text-gray-500">Replace existing data with imported data</p>
                                    </div>
                                </label>
                                
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="merge"
                                        checked={conflictResolution === 'merge'}
                                        onChange={(e) => setConflictResolution(e.target.value)}
                                        className="mr-3 h-4 w-4 text-indigo-600"
                                        disabled={isImporting}
                                    />
                                    <div>
                                        <span className="font-medium">Merge data</span>
                                        <p className="text-sm text-gray-500">Update existing items with new data</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-between pt-4 border-t border-gray-200">
                            <button
                                onClick={() => { onClose(); resetModal(); }}
                                disabled={isImporting}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!hasDataSelected || isImporting}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-2"
                            >
                                {isImporting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        <span>Importing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={16} />
                                        <span>Import Data</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Status Messages */}
                        {importStatus && (
                            <div className={`p-3 rounded-lg border flex items-start space-x-2 ${
                                importStatus.includes('successfully') || importStatus.includes('completed')
                                    ? 'bg-green-50 border-green-200'
                                    : importStatus.includes('failed') || importStatus.includes('Error')
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-blue-50 border-blue-200'
                            }`}>
                                {importStatus.includes('successfully') || importStatus.includes('completed') ? (
                                    <Check className="text-green-600 mt-0.5" size={16} />
                                ) : importStatus.includes('failed') || importStatus.includes('Error') ? (
                                    <AlertCircle className="text-red-600 mt-0.5" size={16} />
                                ) : (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mt-0.5"></div>
                                )}
                                <p className={`text-sm ${
                                    importStatus.includes('successfully') || importStatus.includes('completed')
                                        ? 'text-green-800'
                                        : importStatus.includes('failed') || importStatus.includes('Error')
                                        ? 'text-red-800'
                                        : 'text-blue-800'
                                }`}>
                                    {importStatus}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportModal;