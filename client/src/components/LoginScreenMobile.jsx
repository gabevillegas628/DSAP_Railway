// LoginScreenMobile.jsx - Mobile-optimized login screen
import React, { useState, useEffect } from 'react';
import { FileText, Eye, EyeOff, X, ArrowLeft } from 'lucide-react';
import apiService from './apiService';
import TermsOfServiceModal from './TermsOfServiceModal';

const LoginScreenMobile = ({ onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [schools, setSchools] = useState([]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [schoolId, setSchoolId] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [programSettings, setProgramSettings] = useState(null);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showTOSModal, setShowTOSModal] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMessage, setForgotMessage] = useState('');
    const [shouldCollectDemographics, setShouldCollectDemographics] = useState(false);
    const [demographics, setDemographics] = useState({
        academicYear: '',
        yearsInProgram: '',
        classesTaken: [],
        otherScienceCourses: '',
        age: '',
        gender: '',
        ethnicity: '',
        location: '',
        country: ''
    });

    // All your existing useEffect hooks and handler functions stay the same
    useEffect(() => {
        const checkDemographicsSettings = async () => {
            try {
                const response = await apiService.get('/settings/collect-demographics');
                setShouldCollectDemographics(response.collectDemographics);
            } catch (error) {
                console.error('Error checking demographics settings:', error);
                setShouldCollectDemographics(false);
            }
        };
        checkDemographicsSettings();
    }, []);

    useEffect(() => {
        if (isRegistering) {
            fetchSchools();
        }
    }, [isRegistering]);

    useEffect(() => {
        fetchProgramSettings();
    }, []);

    const fetchSchools = async () => {
        try {
            const data = await apiService.get('/schools/public');
            setSchools(data);
        } catch (error) {
            console.error('Error fetching schools:', error);
        }
    };

    const fetchProgramSettings = async () => {
        try {
            const data = await apiService.get('/program-settings');
            setProgramSettings(data);
        } catch (error) {
            console.error('Error fetching program settings:', error);
        }
    };

    const handleClassToggle = (className) => {
        setDemographics(prev => ({
            ...prev,
            classesTaken: prev.classesTaken.includes(className)
                ? prev.classesTaken.filter(c => c !== className)
                : [...prev.classesTaken, className]
        }));
    };

    // Copy all your existing handler functions (handleLogin, handleRegister, etc.) here
    // I'll abbreviate for space, but include all the same logic

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = await apiService.post('/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            apiService.setToken(data.token);
            onLogin(data.user);
        } catch (error) {
            let errorMessage = 'Login failed. Please check your credentials and try again.';
            if (error.message.includes('Invalid credentials')) {
                errorMessage = 'Incorrect email or password. Please double-check your credentials and try again.';
            } else if (error.message.includes('pending approval')) {
                errorMessage = 'Your account is awaiting approval from your program director.';
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const registrationData = { name, email, password, schoolId };

            if (shouldCollectDemographics) {
                const cleanedDemographics = {};
                
                if (demographics.academicYear?.trim()) cleanedDemographics.academicYear = demographics.academicYear.trim();
                if (demographics.yearsInProgram?.trim()) cleanedDemographics.yearsInProgram = demographics.yearsInProgram.trim();
                if (demographics.classesTaken?.length > 0) cleanedDemographics.classesTaken = demographics.classesTaken;
                if (demographics.otherScienceCourses?.trim()) cleanedDemographics.otherScienceCourses = demographics.otherScienceCourses.trim();
                if (demographics.age?.trim()) cleanedDemographics.age = demographics.age.trim();
                if (demographics.gender?.trim()) cleanedDemographics.gender = demographics.gender.trim();
                if (demographics.ethnicity?.trim()) cleanedDemographics.ethnicity = demographics.ethnicity.trim();

                // Location parsing logic
                let location = '', state = '', parsedCountry = '';
                if (demographics.location?.trim()) {
                    const locationParts = demographics.location.trim().split(',').map(part => part.trim());
                    if (locationParts.length >= 3) {
                        location = locationParts[0];
                        state = locationParts[1];
                        parsedCountry = locationParts[2];
                    } else if (locationParts.length >= 2) {
                        location = locationParts[0];
                        state = locationParts[1];
                    } else {
                        location = locationParts[0];
                    }
                }

                if (location) cleanedDemographics.location = location;
                if (state) cleanedDemographics.state = state;
                if (parsedCountry) {
                    cleanedDemographics.country = parsedCountry;
                } else if (demographics.country?.trim()) {
                    cleanedDemographics.country = demographics.country.trim();
                }

                if (Object.keys(cleanedDemographics).length > 0) {
                    registrationData.demographics = cleanedDemographics;
                }
            }

            const data = await apiService.post('/auth/register-student', registrationData);
            
            if (data.user?.status === 'approved') {
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    apiService.setToken(data.token);
                    onLogin(data.user);
                } else {
                    setSuccessMessage('Account created and approved! Please sign in with your credentials.');
                    setIsRegistering(false);
                }
            } else {
                setSuccessMessage('Registration submitted successfully! Please wait for director approval before signing in.');
                setIsRegistering(false);
            }
        } catch (error) {
            let errorMessage = 'Registration failed. Please try again.';
            if (error.message.includes('already exists')) {
                errorMessage = 'An account with this email already exists. Please try signing in instead.';
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotMessage('');

        try {
            await apiService.post('/auth/forgot-password', { email: forgotEmail });
            setForgotMessage('If an account exists with this email, you will receive reset instructions.');
            setForgotEmail('');
        } catch (error) {
            setForgotMessage('Error sending reset email. Please try again.');
        } finally {
            setForgotLoading(false);
        }
    };

    const switchMode = () => {
        setIsRegistering(!isRegistering);
        setError('');
        setSuccessMessage('');
        setEmail('');
        setPassword('');
        setName('');
        setSchoolId('');
    };

    const handleContactUs = () => {
        if (programSettings?.staffEmail) {
            window.location.href = `mailto:${programSettings.staffEmail}?subject=DSAP Support Request`;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col">
            {/* Mobile Header */}
            <div className="bg-white shadow-sm border-b border-blue-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-blue-900">DSAP</h1>
                            <p className="text-xs text-blue-700">DNA Sequence Analysis</p>
                        </div>
                    </div>
                    {programSettings?.projectName && (
                        <div className="text-right">
                            <p className="text-sm font-semibold text-blue-900">{programSettings.projectName}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Welcome Section */}
                <div className="bg-blue-800 text-white px-4 py-6 text-center">
                    <h2 className="text-2xl font-bold mb-2">
                        {programSettings?.welcomeText || "Welcome to WISE"}
                    </h2>
                    <p className="text-blue-100 text-sm leading-relaxed">
                        {programSettings?.overview || "Waksman Institute Summer Experience - DNA Sequence Analysis Platform"}
                    </p>
                </div>

                {/* Form Container */}
                <div className="flex-1 px-4 py-6">
                    {/* Error Messages */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start space-x-3">
                                <X className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-red-800 text-sm font-medium">{error}</p>
                                    {error.includes('pending approval') && programSettings?.staffEmail && (
                                        <button
                                            onClick={handleContactUs}
                                            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                                        >
                                            Contact Support
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Success Messages */}
                    {successMessage && (
                        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-start space-x-3">
                                <div className="w-5 h-5 bg-green-500 rounded-full mt-0.5 flex-shrink-0 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                </div>
                                <p className="text-green-800 text-sm font-medium flex-1">{successMessage}</p>
                            </div>
                        </div>
                    )}

                    {/* Form Card */}
                    <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
                        <div className="bg-blue-800 px-4 py-3">
                            <h3 className="text-xl font-bold text-white text-center">
                                {isRegistering ? 'Create Account' : 'Sign In'}
                            </h3>
                        </div>

                        <div className="p-4">
                            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
                                {isRegistering && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                                        placeholder="Enter your email address"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full px-3 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                                            placeholder={isRegistering ? "Choose a password (minimum 6 characters)" : "Enter your password"}
                                            minLength={isRegistering ? 6 : undefined}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {isRegistering && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            School/Institution
                                        </label>
                                        <select
                                            value={schoolId}
                                            onChange={(e) => setSchoolId(e.target.value)}
                                            required
                                            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                                        >
                                            <option value="">Select your school...</option>
                                            {schools.map(school => (
                                                <option key={school.id} value={school.id}>
                                                    {school.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Demographics Section - Single Column for Mobile */}
                                {isRegistering && shouldCollectDemographics && (
                                    <div className="pt-4 border-t border-gray-200">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Additional Information (Optional)</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Academic Year</label>
                                                <select
                                                    value={demographics.academicYear}
                                                    onChange={(e) => setDemographics(prev => ({ ...prev, academicYear: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                >
                                                    <option value="">Select...</option>
                                                    <option value="freshman">Freshman</option>
                                                    <option value="sophomore">Sophomore</option>
                                                    <option value="junior">Junior</option>
                                                    <option value="senior">Senior</option>
                                                    <option value="homeschooled">Homeschooled</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Years in Program</label>
                                                <select
                                                    value={demographics.yearsInProgram}
                                                    onChange={(e) => setDemographics(prev => ({ ...prev, yearsInProgram: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                >
                                                    <option value="">Select...</option>
                                                    <option value="first">First</option>
                                                    <option value="second">Second</option>
                                                    <option value="third">Third</option>
                                                    <option value="fourth">Fourth</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Classes Taken</label>
                                                <div className="grid grid-cols-2 gap-1 text-sm max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
                                                    {[
                                                        'Biology', 'Honors Biology', 'AP Biology',
                                                        'Chemistry', 'Honors Chemistry', 'AP Chemistry',
                                                        'Physics', 'Honors Physics', 'AP Physics',
                                                        'Calculus', 'Honors Calculus', 'AP Calculus'
                                                    ].map(className => (
                                                        <label key={className} className="flex items-center space-x-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={demographics.classesTaken.includes(className)}
                                                                onChange={() => handleClassToggle(className)}
                                                                className="h-3 w-3 text-blue-600 rounded"
                                                            />
                                                            <span className="text-gray-900 text-xs">{className}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Age</label>
                                                    <input
                                                        type="number"
                                                        value={demographics.age}
                                                        onChange={(e) => setDemographics(prev => ({ ...prev, age: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                        placeholder="Age"
                                                        min="1"
                                                        max="120"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                                                    <select
                                                        value={demographics.gender}
                                                        onChange={(e) => setDemographics(prev => ({ ...prev, gender: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                    >
                                                        <option value="">Select...</option>
                                                        <option value="Male">Male</option>
                                                        <option value="Female">Female</option>
                                                        <option value="Non-binary">Non-binary</option>
                                                        <option value="Prefer not to say">Prefer not to say</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Other Science Courses</label>
                                                <textarea
                                                    value={demographics.otherScienceCourses}
                                                    onChange={(e) => setDemographics(prev => ({ ...prev, otherScienceCourses: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                                                    placeholder="List any other relevant science courses..."
                                                    rows="2"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Ethnicity</label>
                                                <select
                                                    value={demographics.ethnicity}
                                                    onChange={(e) => setDemographics(prev => ({ ...prev, ethnicity: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                >
                                                    <option value="">Select...</option>
                                                    <option value="american-indian-alaska-native">American Indian or Alaska Native</option>
                                                    <option value="asian">Asian</option>
                                                    <option value="black-african-american">Black or African American</option>
                                                    <option value="native-hawaiian-pacific-islander">Native Hawaiian or Pacific Islander</option>
                                                    <option value="white">White</option>
                                                    <option value="hispanic-latino">Hispanic or Latino</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Location (City, State)</label>
                                                <input
                                                    type="text"
                                                    value={demographics.location}
                                                    onChange={(e) => setDemographics(prev => ({ ...prev, location: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                    placeholder="e.g., New York, NY"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
                                                <input
                                                    type="text"
                                                    value={demographics.country}
                                                    onChange={(e) => setDemographics(prev => ({ ...prev, country: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                    placeholder="e.g., United States"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-800 text-white py-4 px-6 rounded-lg hover:bg-blue-900 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-base"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>{isRegistering ? 'Creating Account...' : 'Signing In...'}</span>
                                        </div>
                                    ) : (
                                        isRegistering ? 'Create Account' : 'Sign In'
                                    )}
                                </button>
                            </form>

                            {/* Switch Mode & Links */}
                            <div className="mt-6 text-center space-y-3">
                                <button
                                    onClick={switchMode}
                                    className="text-blue-600 hover:text-blue-800 transition-colors text-sm font-medium"
                                >
                                    {isRegistering
                                        ? "Already have an account? Sign in here"
                                        : "Need an account? Register here"}
                                </button>

                                {!isRegistering && (
                                    <button
                                        onClick={() => setShowForgotPassword(true)}
                                        className="block w-full text-gray-500 hover:text-blue-600 transition-colors text-sm"
                                    >
                                        Forgot your password?
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Footer */}
                <div className="bg-white border-t border-gray-200 px-4 py-3">
                    <div className="flex flex-col items-center space-y-2 text-center">
                        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                            {programSettings?.aboutText && (
                                <button
                                    onClick={() => setShowProjectModal(true)}
                                    className="text-blue-600 hover:text-blue-800 underline"
                                >
                                    About This Project
                                </button>
                            )}
                            <button
                                onClick={() => setShowTOSModal(true)}
                                className="text-blue-600 hover:text-blue-800 underline"
                            >
                                Terms of Service
                            </button>
                            {programSettings?.staffEmail && (
                                <button
                                    onClick={handleContactUs}
                                    className="text-blue-600 hover:text-blue-800 underline"
                                >
                                    Contact Support
                                </button>
                            )}
                        </div>
                        <div className="text-xs text-gray-500">
                            <span>© 2025 Rutgers University</span>
                            <span className="mx-2">•</span>
                            <span>DSAP v0.9β</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgotPassword && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-sm">
                        <div className="px-4 py-3 border-b border-gray-200 bg-blue-800 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Reset Password</h3>
                            <button
                                onClick={() => setShowForgotPassword(false)}
                                className="text-white hover:text-gray-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4">
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                <input
                                    type="email"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    placeholder="Enter your email address"
                                    required
                                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                                />
                                {forgotMessage && (
                                    <p className="text-sm text-blue-600">{forgotMessage}</p>
                                )}
                                <div className="flex space-x-2">
                                    <button
                                        type="submit"
                                        disabled={forgotLoading}
                                        className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-base"
                                    >
                                        {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotPassword(false)}
                                        className="px-4 py-3 text-gray-600 hover:text-gray-800 text-base"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Modal */}
            {showProjectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200 bg-blue-800 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">About This Project</h3>
                            <button
                                onClick={() => setShowProjectModal(false)}
                                className="text-white hover:text-gray-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            <div className="space-y-4">
                                {programSettings?.welcomeText && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Welcome</h4>
                                        <p className="mt-1 text-gray-700 leading-relaxed text-sm">{programSettings.welcomeText}</p>
                                    </div>
                                )}

                                {programSettings?.overview && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Overview</h4>
                                        <p className="mt-1 text-gray-700 leading-relaxed text-sm">{programSettings.overview}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TOS Modal */}
            <TermsOfServiceModal
                isOpen={showTOSModal}
                onClose={() => setShowTOSModal(false)}
            />
        </div>
    );
};

export default LoginScreenMobile;