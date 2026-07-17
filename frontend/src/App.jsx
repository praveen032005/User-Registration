import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  UploadCloud, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Sun,
  Moon,
  Search,
  Phone,
  Calendar,
  Heart,
  BookOpen,
  Hash,
  ChevronDown
} from 'lucide-react';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Stage state: 'verify' | 'profile' | 'submitting' | 'success' | 'error'
  const [stage, setStage] = useState('verify');
  const [statusMessage, setStatusMessage] = useState('');

  // Verification Screen Input
  const [searchQuery, setSearchQuery] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetched Trainee details
  const [trainee, setTrainee] = useState({ id: '', name: '', phone: '', registrationId: '' });

  // Profile Form Fields
  const [bloodGroup, setBloodGroup] = useState('');
  const [dob, setDob] = useState('');
  const [dateOfJoin, setDateOfJoin] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Validation Errors
  const [errors, setErrors] = useState({});
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  const fileInputRef = useRef(null);

  // Clean up Object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  // Determine the API URL dynamically at runtime
  const getApiUrl = () => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return import.meta.env.VITE_API_URL || (isLocalhost ? 'http://localhost:8000' : '');
  };

  // Action 1: Handle Trainee Lookup Verification
  const handleVerify = async (e) => {
    e.preventDefault();
    const queryVal = searchQuery.trim();

    if (!queryVal) {
      setErrors({ search: 'Please enter your Registration ID or Phone Number.' });
      return;
    }

    setIsVerifying(true);
    setErrors({});

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/fetch?query=${encodeURIComponent(queryVal)}`);
      const data = await response.json();

      if (response.ok) {
        if (data.found) {
          setTrainee({
            id: data.id || '',
            name: data.name || 'Trainee',
            phone: data.phone || queryVal,
            registrationId: data.registrationId || queryVal
          });
          setStage('profile');
        } else {
          setErrors({ search: 'Trainee profile not found. Please verify your credentials.' });
        }
      } else {
        setErrors({ search: data.detail || 'An error occurred during lookup.' });
      }
    } catch (err) {
      console.error(err);
      setErrors({ search: 'Unable to connect to the server. Please check your connection.' });
    } finally {
      setIsVerifying(false);
    }
  };

  // Process selected file
  const processFile = (file) => {
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({ 
        ...prev, 
        photo: 'Invalid format. Only JPEG, JPG, and PNG images are allowed.' 
      }));
      return;
    }

    // Validate size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrors(prev => ({ 
        ...prev, 
        photo: `Image exceeds 5MB. Your image size: ${(file.size / (1024 * 1024)).toFixed(2)}MB` 
      }));
      return;
    }

    setErrors(prev => {
      const copy = { ...prev };
      delete copy.photo;
      return copy;
    });

    setPhoto(file);
    
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  const handleRemovePhoto = (e) => {
    e.stopPropagation();
    setPhoto(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and Drop Events
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggedOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggedOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggedOver(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  // Helper to format file sizes
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Action 2: Submit Profile Completion
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    let errs = {};
    if (!photo) errs.photo = 'Profile photo is required.';
    if (!bloodGroup) errs.bloodGroup = 'Please select your blood group.';
    if (!dob) errs.dob = 'Date of birth is required.';
    if (!dateOfJoin) errs.dateOfJoin = 'Date of joining is required.';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setStage('submitting');
    setStatusMessage('');

    // Prepare Form Data
    const formData = new FormData();
    formData.append('id', trainee.id);
    formData.append('bloodGroup', bloodGroup);
    formData.append('dob', dob);
    formData.append('dateOfJoin', dateOfJoin);
    formData.append('photo', photo);

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/submit`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setStage('success');
        setStatusMessage(data.message || 'Profile successfully updated!');
      } else {
        setStage('error');
        setStatusMessage(data.detail || 'An error occurred while saving details.');
      }
    } catch (err) {
      console.error(err);
      setStage('error');
      setStatusMessage('Unable to connect to the server. Please check your network or server status.');
    }
  };

  // Reset Form
  const handleReset = () => {
    setSearchQuery('');
    setTrainee({ id: '', name: '', phone: '' });
    setBloodGroup('');
    setDob('');
    setDateOfJoin('');
    setPhoto(null);
    setPhotoPreview(null);
    setErrors({});
    setStage('verify');
    setStatusMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <main className="form-card">
      <div className="form-card::top-glow" />

      {/* Theme Toggle Button */}
      <button 
        type="button" 
        className="theme-toggle-btn" 
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        aria-label="Toggle Theme"
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      {stage === 'success' ? (
        <div className="status-content">
          <div className="status-icon-wrapper success">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="status-title">Done!</h2>
          <p className="status-message">{statusMessage}</p>
          <button className="btn-reset" onClick={handleReset}>
            Complete Another Profile
          </button>
        </div>
      ) : stage === 'error' ? (
        <div className="status-content">
          <div className="status-icon-wrapper error">
            <AlertCircle size={40} />
          </div>
          <h2 className="status-title">Submission Failed</h2>
          <p className="status-message">{statusMessage}</p>
          <button className="btn-reset" onClick={handleReset}>
            Try Again
          </button>
        </div>
      ) : stage === 'verify' ? (
        <>
          <div className="form-header">
            <div className="form-logo">
              <BookOpen size={28} />
            </div>
            <h1 className="form-title">Adani Skills and Education</h1>
            <p className="form-subtitle">Enter your Registration ID or Phone Number to verify your profile</p>
          </div>

          <form onSubmit={handleVerify} noValidate>
            <div className="form-group">
              <label htmlFor="search-input" className="form-label">
                Registration ID / Phone Number
              </label>
              <div className="form-input-container">
                <input
                  id="search-input"
                  type="text"
                  className={`form-input ${errors.search ? 'error' : ''}`}
                  placeholder="Enter ID or Phone Number"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setErrors(prev => ({ ...prev, search: '' }));
                  }}
                  disabled={isVerifying}
                />
                <Search size={18} className="form-input-icon" />
              </div>
              {errors.search && (
                <span className="error-message" id="search-error">
                  <AlertCircle size={14} /> {errors.search}
                </span>
              )}
            </div>

            <button 
              type="submit" 
              className="btn-submit" 
              disabled={isVerifying || !searchQuery.trim()}
            >
              {isVerifying ? (
                <>
                  <span className="spinner"></span>
                  Verifying...
                </>
              ) : (
                'Verify Profile'
              )}
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="form-header">
            <div className="form-logo">
              <BookOpen size={28} />
            </div>
            <h1 className="form-title">Adani Skills and Education</h1>
            <div className="retrieved-info-bar">
              <span className="info-pill name-pill">
                <User size={14} />
                <strong>Name:</strong> {trainee.name}
              </span>
              <span className="info-pill id-pill">
                <Hash size={14} />
                <strong>Reg ID:</strong> {trainee.registrationId}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Photo Upload Field */}
            <div className="form-group">
              <label className="form-label">Profile Photo</label>
              
              {!photoPreview ? (
                <div 
                  className={`dropzone ${isDraggedOver ? 'active' : ''} ${errors.photo ? 'error' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    id="photo-input"
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    onChange={handleFileChange}
                    disabled={stage === 'submitting'}
                  />
                  
                  <div className="dropzone-icon-container">
                    <UploadCloud size={24} />
                  </div>
                  <div className="dropzone-title">Click to upload or drag & drop</div>
                  <div className="dropzone-subtitle">Supported formats: JPG, JPEG, PNG (max. 5MB)</div>
                </div>
              ) : (
                <div className="preview-container">
                  <div className="preview-image-wrapper">
                    <img src={photoPreview} alt="Profile preview" className="preview-image" />
                  </div>
                  <div className="preview-details">
                    <div className="preview-name">{photo?.name}</div>
                    <div className="preview-size">{formatFileSize(photo?.size || 0)}</div>
                  </div>
                  <button 
                    type="button" 
                    className="btn-remove-photo" 
                    onClick={handleRemovePhoto}
                    title="Remove Photo"
                    disabled={stage === 'submitting'}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {errors.photo && (
                <span className="error-message" id="photo-error">
                  <AlertCircle size={14} /> {errors.photo}
                </span>
              )}
            </div>

            {/* Blood Group Selection Dropdown */}
            <div className="form-group">
              <label htmlFor="blood-group-select" className="form-label">Blood Group</label>
              <div className="select-container">
                <select
                  id="blood-group-select"
                  className={`form-select ${errors.bloodGroup ? 'error' : ''}`}
                  value={bloodGroup}
                  onChange={(e) => {
                    setBloodGroup(e.target.value);
                    setErrors(prev => ({ ...prev, bloodGroup: '' }));
                  }}
                  disabled={stage === 'submitting'}
                >
                  <option value="">Select Blood Group</option>
                  {['O-', 'O+', 'A+', 'A-', 'B-', 'B+', 'AB-', 'AB+'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
                <ChevronDown className="select-arrow" size={18} />
              </div>
              {errors.bloodGroup && (
                <span className="error-message">
                  <AlertCircle size={14} /> {errors.bloodGroup}
                </span>
              )}
            </div>

            {/* Dates Row */}
            <div className="form-row">
              <div className="form-group half-width">
                <label htmlFor="dob-input" className="form-label">Date of Birth</label>
                <div className="form-input-container">
                  <input
                    id="dob-input"
                    type="date"
                    className={`form-input ${errors.dob ? 'error' : ''}`}
                    value={dob}
                    onChange={(e) => {
                      setDob(e.target.value);
                      setErrors(prev => ({ ...prev, dob: '' }));
                    }}
                    disabled={stage === 'submitting'}
                  />
                  <Calendar size={18} className="form-input-icon" />
                </div>
                {errors.dob && (
                  <span className="error-message">
                    <AlertCircle size={14} /> {errors.dob}
                  </span>
                )}
              </div>

              <div className="form-group half-width">
                <label htmlFor="doj-input" className="form-label">Date of Joining</label>
                <div className="form-input-container">
                  <input
                    id="doj-input"
                    type="date"
                    className={`form-input ${errors.dateOfJoin ? 'error' : ''}`}
                    value={dateOfJoin}
                    onChange={(e) => {
                      setDateOfJoin(e.target.value);
                      setErrors(prev => ({ ...prev, dateOfJoin: '' }));
                    }}
                    disabled={stage === 'submitting'}
                  />
                  <Calendar size={18} className="form-input-icon" />
                </div>
                {errors.dateOfJoin && (
                  <span className="error-message">
                    <AlertCircle size={14} /> {errors.dateOfJoin}
                  </span>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn-submit" 
              disabled={stage === 'submitting'}
            >
              {stage === 'submitting' ? (
                <>
                  <span className="spinner"></span>
                  Saving Profile...
                </>
              ) : (
                'Submit Profile'
              )}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
