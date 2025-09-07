import React, { useState, useEffect } from 'react';
import { Video, FileText, ExternalLink, HelpCircle, X } from 'lucide-react';
import apiService from '../services/apiService';

const StudentHelp = ({ helpTopicId, onClose, questionText }) => {
  const [helpTopic, setHelpTopic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("both"); // "both" | "video" | "doc"

  useEffect(() => {
    if (helpTopicId) {
      fetchHelpTopic();
    }
  }, [helpTopicId]);

  const fetchHelpTopic = async () => {
    try {
      setLoading(true);
      setError(null);
      const topic = await apiService.get(`/help-topics/${helpTopicId}`);
      setHelpTopic(topic);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching help topic:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-96 bg-white rounded-lg border flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading help content...</p>
        </div>
      </div>
    );
  }

  if (error || !helpTopic) {
    return (
      <div className="min-h-96 bg-white rounded-lg border flex items-center justify-center">
        <div className="text-center max-w-md">
          <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Help Topic Not Found</h2>
          <p className="text-gray-600 mb-4">
            {error || "This help topic may have been removed or doesn't exist."}
          </p>
          {questionText && (
            <p className="text-sm text-gray-500 mb-4">
              Looking for help with: "{questionText}"
            </p>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Close Help
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <HelpCircle className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">{helpTopic.title}</h1>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            title="Close help"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {questionText && (
          <p className="text-sm text-gray-600 mt-2">Help for: "{questionText}"</p>
        )}
      </div>

      {/* View Toggle */}
      <div className="border-b border-gray-200 px-6 py-3 flex space-x-2">
        <button
          onClick={() => setViewMode("both")}
          className={`px-3 py-1 rounded-lg text-sm font-medium ${viewMode === "both" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          Both
        </button>
        <button
          onClick={() => setViewMode("video")}
          className={`px-3 py-1 rounded-lg text-sm font-medium ${viewMode === "video" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          Video Only
        </button>
        <button
          onClick={() => setViewMode("doc")}
          className={`px-3 py-1 rounded-lg text-sm font-medium ${viewMode === "doc" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          Document Only
        </button>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto h-[calc(100vh-250px)]">
        {(helpTopic.videoBoxUrl || helpTopic.helpDocumentUrl) ? (
          <>
            {viewMode === "both" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                {helpTopic.videoBoxUrl && (
                  <VideoSection url={helpTopic.videoBoxUrl} />
                )}
                {helpTopic.helpDocumentUrl && (
                  <DocSection url={helpTopic.helpDocumentUrl} />
                )}
              </div>
            )}

            {viewMode === "video" && helpTopic.videoBoxUrl && (
              <div className="h-full">
                <VideoSection url={helpTopic.videoBoxUrl} full />
              </div>
            )}

            {viewMode === "doc" && helpTopic.helpDocumentUrl && (
              <div className="h-full">
                <DocSection url={helpTopic.helpDocumentUrl} full />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Available</h3>
            <p className="text-gray-600">This help topic doesn't have any video or document content yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Subcomponents for cleaner rendering
const VideoSection = ({ url, full }) => (
  <div className="flex flex-col space-y-4 h-full">
    <div className="flex items-center space-x-2">
      <Video className="w-5 h-5 text-indigo-600" />
      <h2 className="text-lg font-semibold text-gray-900">Help Video</h2>
    </div>
    <div className="bg-gray-100 rounded-lg p-4 flex-1">
      <iframe 
        src={url}
        className={`w-full ${full ? "h-[75vh]" : "h-full min-h-[500px]"} rounded`}
        allowFullScreen
        title="Help Video"
      />
    </div>
    <a 
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 text-sm"
    >
      <ExternalLink className="w-4 h-4" />
      <span>Open video in Box</span>
    </a>
  </div>
);

const DocSection = ({ url, full }) => (
  <div className="flex flex-col space-y-4 h-full">
    <div className="flex items-center space-x-2">
      <FileText className="w-5 h-5 text-indigo-600" />
      <h2 className="text-lg font-semibold text-gray-900">Help Document</h2>
    </div>
    <div className="bg-gray-100 rounded-lg p-4 flex-1">
      <iframe 
        src={`${url}#view=FitH`}
        className={`w-full ${full ? "h-[75vh]" : "h-full min-h-[500px]"} rounded`}
        title="Help Document"
      />
    </div>
    <a 
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 text-sm"
    >
      <ExternalLink className="w-4 h-4" />
      <span>Open document in Box</span>
    </a>
  </div>
);

export default StudentHelp;
