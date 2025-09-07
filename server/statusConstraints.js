// Universal statusConstraints.js - Uses CommonJS for compatibility with both environments

const CLONE_STATUSES = {
  // Student working states
  BEING_WORKED_ON: 'Being worked on by student',
  UNASSIGNED: 'Unassigned',
  AVAILABLE: 'Available', // For practice clones

  // Submission states
  COMPLETED_WAITING_REVIEW: 'Completed, waiting review by staff',
  CORRECTED_WAITING_REVIEW: 'Corrected by student, waiting review',

  // Review states (instructor feedback)
  NEEDS_REANALYSIS: 'Reviewed, needs to be reanalyzed',
  NEEDS_CORRECTIONS: 'Needs corrections from student', // Alternative naming
  REVIEWED_CORRECT: 'Reviewed and Correct'
};

// All valid status values in one array for validation
const ALL_VALID_STATUSES = Object.values(CLONE_STATUSES);

// Status validation function
const isValidStatus = (status) => {
  return ALL_VALID_STATUSES.includes(status) || status === null || status === '';
};

// Status groups for business logic
const STATUS_GROUPS = {
  // When students can edit their work
  STUDENT_EDITABLE: [
    CLONE_STATUSES.BEING_WORKED_ON,
    CLONE_STATUSES.NEEDS_REANALYSIS,
    CLONE_STATUSES.NEEDS_CORRECTIONS,
    CLONE_STATUSES.UNASSIGNED,
    CLONE_STATUSES.AVAILABLE,
    CLONE_STATUSES.REVIEWED_CORRECT,  // Students can still edit even after approval
    null,
    ''
  ],

  // When interface should be read-only
  READ_ONLY: [
    CLONE_STATUSES.COMPLETED_WAITING_REVIEW,
    CLONE_STATUSES.CORRECTED_WAITING_REVIEW
    // Removed REVIEWED_CORRECT - students can edit approved work
  ],

  // Ready for instructor review
  REVIEW_READY: [
    CLONE_STATUSES.COMPLETED_WAITING_REVIEW,
    CLONE_STATUSES.CORRECTED_WAITING_REVIEW
  ],

  // Should show instructor feedback
  SHOW_FEEDBACK: [
    CLONE_STATUSES.NEEDS_REANALYSIS,
    CLONE_STATUSES.NEEDS_CORRECTIONS,
    CLONE_STATUSES.REVIEWED_CORRECT
  ]
};

// Helper functions for business logic
const canStudentEdit = (status) => {
  return STATUS_GROUPS.STUDENT_EDITABLE.includes(status);
};

const isReadOnly = (status) => {
  return STATUS_GROUPS.READ_ONLY.includes(status);
};

const isReviewReady = (status) => {
  return STATUS_GROUPS.REVIEW_READY.includes(status);
};

const shouldShowFeedback = (status) => {
  return STATUS_GROUPS.SHOW_FEEDBACK.includes(status);
};

// Status transitions - what statuses can change to what
const STATUS_TRANSITIONS = {
  [CLONE_STATUSES.UNASSIGNED]: [CLONE_STATUSES.BEING_WORKED_ON],
  [CLONE_STATUSES.AVAILABLE]: [CLONE_STATUSES.BEING_WORKED_ON],
  [CLONE_STATUSES.BEING_WORKED_ON]: [
    CLONE_STATUSES.COMPLETED_WAITING_REVIEW,
    CLONE_STATUSES.CORRECTED_WAITING_REVIEW,  // ADD THIS LINE
    CLONE_STATUSES.UNASSIGNED
  ],
  [CLONE_STATUSES.COMPLETED_WAITING_REVIEW]: [
    CLONE_STATUSES.NEEDS_REANALYSIS,
    CLONE_STATUSES.REVIEWED_CORRECT
  ],
  [CLONE_STATUSES.NEEDS_REANALYSIS]: [
    CLONE_STATUSES.CORRECTED_WAITING_REVIEW,
    CLONE_STATUSES.BEING_WORKED_ON  // Allow students to start working
  ],
  [CLONE_STATUSES.CORRECTED_WAITING_REVIEW]: [
    CLONE_STATUSES.NEEDS_REANALYSIS,
    CLONE_STATUSES.REVIEWED_CORRECT
  ],
  [CLONE_STATUSES.REVIEWED_CORRECT]: [
    CLONE_STATUSES.BEING_WORKED_ON
  ]
};

// Validate status transition
const isValidStatusTransition = (fromStatus, toStatus) => {
  if (!fromStatus) return true; // Any status is valid from null/empty
  if (!isValidStatus(toStatus)) return false;

  const validTransitions = STATUS_TRANSITIONS[fromStatus] || [];
  return validTransitions.includes(toStatus);
};

// Status display configurations for UI components
const STATUS_CONFIGS = {
  [CLONE_STATUSES.COMPLETED_WAITING_REVIEW]: {
    icon: 'Clock',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-600',
    badgeColor: 'bg-yellow-100 text-yellow-800',
    title: 'Submitted for Review',
    message: 'Your analysis has been submitted and is waiting for instructor review.',
    showRefresh: true,
    showFeedbackButton: false
  },

  [CLONE_STATUSES.NEEDS_REANALYSIS]: {
    icon: 'RefreshCw',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800',
    iconColor: 'text-orange-600',
    badgeColor: 'bg-orange-100 text-orange-800',
    title: 'Revisions Requested',
    message: 'Your instructor has reviewed your work and requested changes. Check the feedback below and update your analysis.',
    showRefresh: false,
    showFeedbackButton: true
  },

  [CLONE_STATUSES.NEEDS_CORRECTIONS]: {
    icon: 'RefreshCw',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800',
    iconColor: 'text-orange-600',
    badgeColor: 'bg-orange-100 text-orange-800',
    title: 'Revisions Requested',
    message: 'Your instructor has reviewed your work and requested changes. Check the feedback below and update your analysis.',
    showRefresh: false,
    showFeedbackButton: true
  },

  [CLONE_STATUSES.REVIEWED_CORRECT]: {
    icon: 'CheckCircle',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-600',
    badgeColor: 'bg-green-100 text-green-800',
    title: 'Analysis Approved',
    message: 'Congratulations! Your analysis has been reviewed and approved by your instructor.',
    showRefresh: false,
    showFeedbackButton: true
  },

  [CLONE_STATUSES.CORRECTED_WAITING_REVIEW]: {
    icon: 'Clock',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800',
    iconColor: 'text-purple-600',
    badgeColor: 'bg-purple-100 text-purple-800',
    title: 'Resubmitted for Review',
    message: 'Your corrections have been submitted and are waiting for instructor review.',
    showRefresh: true,
    showFeedbackButton: false
  },

  [CLONE_STATUSES.BEING_WORKED_ON]: {
    icon: 'Clock',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-800',
    title: 'In Progress',
    message: 'Student is currently working on this analysis.',
    showRefresh: false,
    showFeedbackButton: false
  },

  [CLONE_STATUSES.UNASSIGNED]: {
    icon: 'AlertCircle',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    iconColor: 'text-gray-600',
    badgeColor: 'bg-gray-100 text-gray-600',
    title: 'Unassigned',
    message: 'This clone has not been assigned to a student yet.',
    showRefresh: false,
    showFeedbackButton: false
  },

  [CLONE_STATUSES.AVAILABLE]: {
    icon: 'AlertCircle',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    iconColor: 'text-gray-600',
    badgeColor: 'bg-gray-100 text-gray-600',
    title: 'Available',
    message: 'This practice clone is available for student analysis.',
    showRefresh: false,
    showFeedbackButton: false
  }
};

// Get status display config with fallback
const getStatusConfig = (status) => {
  return STATUS_CONFIGS[status] || {
    icon: 'AlertCircle',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    iconColor: 'text-gray-600',
    badgeColor: 'bg-gray-100 text-gray-600',
    title: 'Unknown Status',
    message: `Status: ${status}`,
    showRefresh: false,
    showFeedbackButton: false
  };
};

// Review status mapping for DirectorAnalysisReview filtering
const REVIEW_STATUS_MAP = {
  [CLONE_STATUSES.COMPLETED_WAITING_REVIEW]: 'pending',
  [CLONE_STATUSES.CORRECTED_WAITING_REVIEW]: 'resubmitted'
};

const getReviewStatus = (status) => {
  return REVIEW_STATUS_MAP[status] || null;
};

// Status mapping for review actions (approve/reject)
const REVIEW_ACTION_MAP = {
  'approved': CLONE_STATUSES.REVIEWED_CORRECT,
  'rejected': CLONE_STATUSES.NEEDS_REANALYSIS  // Use NEEDS_REANALYSIS for better workflow
};

// Dropdown options for director interfaces
const STATUS_DROPDOWN_OPTIONS = [
  { value: CLONE_STATUSES.BEING_WORKED_ON, label: 'Being worked on by student' },
  { value: CLONE_STATUSES.COMPLETED_WAITING_REVIEW, label: 'Completed, waiting review by staff' },
  { value: CLONE_STATUSES.NEEDS_REANALYSIS, label: 'Reviewed, needs to be reanalyzed' },
  { value: CLONE_STATUSES.NEEDS_CORRECTIONS, label: 'Needs corrections from student' },
  { value: CLONE_STATUSES.CORRECTED_WAITING_REVIEW, label: 'Corrected by student, waiting review' },
  { value: CLONE_STATUSES.REVIEWED_CORRECT, label: 'Reviewed and Correct' }
];

// Progress calculation helpers
const getStatusProgressWeight = (status) => {
  switch (status) {
    case CLONE_STATUSES.UNASSIGNED:
    case CLONE_STATUSES.AVAILABLE:
      return 0;
    case CLONE_STATUSES.BEING_WORKED_ON:
      return 0.25;
    case CLONE_STATUSES.COMPLETED_WAITING_REVIEW:
      return 0.75;
    case CLONE_STATUSES.NEEDS_REANALYSIS:
    case CLONE_STATUSES.NEEDS_CORRECTIONS:
      return 0.5;
    case CLONE_STATUSES.CORRECTED_WAITING_REVIEW:
      return 0.75;
    case CLONE_STATUSES.REVIEWED_CORRECT:
      return 1.0;
    default:
      return 0;
  }
};

// Development helper - logs a warning if an invalid status is used
const validateAndWarnStatus = (status, componentName = 'Unknown Component') => {
  if (!isValidStatus(status) && status !== null && status !== '') {
    console.warn(`⚠️  Invalid status "${status}" used in ${componentName}. Valid statuses are:`, ALL_VALID_STATUSES);
  }
  return status;
};

// CommonJS export (works in both Node.js and modern bundlers)
module.exports = {
  // Core constants
  CLONE_STATUSES,
  ALL_VALID_STATUSES,

  // Validation functions
  isValidStatus,
  isValidStatusTransition,

  // Business logic functions
  canStudentEdit,
  isReadOnly,
  isReviewReady,
  shouldShowFeedback,

  // Status configuration
  STATUS_CONFIGS,
  getStatusConfig,

  // Review mappings
  REVIEW_STATUS_MAP,
  getReviewStatus,
  REVIEW_ACTION_MAP,

  // Dropdown options
  STATUS_DROPDOWN_OPTIONS,

  // Helper functions
  getStatusProgressWeight,
  validateAndWarnStatus,

  // Status groups
  STATUS_GROUPS
};