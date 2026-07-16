import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  Mail, 
  UploadCloud, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles 
} from 'lucide-react';

export default function App() {
  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Validation Errors
  const [errors, setErrors] = useState({});
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  // Submission Status: 'idle' | 'submitting' | 'success' | 'error'
  const [submissionStatus, setSubmissionStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const fileInputRef = useRef(null);

  // Clean up Object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  // Real-time Name Validation
  const validateName = (val) => {
    if (!val.trim()) {
      return 'Name is required.';
    }
    if (val.trim().length < 2) {
      return 'Name must be at least 2 characters.';
    }
    return '';
  };

  // Real-time Email Validation
  const validateEmail = (val) => {
    if (!val.trim()) {
      return 'Email is required.';
    }
    const regex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$";
    if (!regex.test(val.trim())) {
      return 'Please enter a valid email address.';
    }
    return '';
  };

  // Field change handlers with inline validation updates
  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    setErrors(prev => ({ ...prev, name: validateName(val) }));
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setErrors(prev => ({ ...prev, email: validateEmail(val) }));
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

    // Clear file errors and set states
    setErrors(prev => {
      const copy = { ...prev };
      delete copy.photo;
      return copy;
    });

    setPhoto(file);
    
    // Revoke old URL if it exists
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

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Perform final validations
    const nameErr = validateName(name);
    const emailErr = validateEmail(email);
    let photoErr = '';

    if (!photo) {
      photoErr = 'Profile photo is required.';
    }

    if (nameErr || emailErr || photoErr) {
      setErrors({
        name: nameErr,
        email: emailErr,
        photo: photoErr
      });
      return;
    }

    setSubmissionStatus('submitting');
    setStatusMessage('');

    // Prepare Multipart Form Data
    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('email', email.trim().toLowerCase());
    formData.append('photo', photo);

    // Determine the API URL dynamically at runtime based on the browser address bar
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiUrl = import.meta.env.VITE_API_URL || (isLocalhost ? 'http://localhost:8000' : '');

    try {
      const response = await fetch(`${apiUrl}/submit`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSubmissionStatus('success');
        setStatusMessage(data.message || 'Successfully registered!');
      } else {
        setSubmissionStatus('error');
        setStatusMessage(data.detail || 'An error occurred during registration.');
      }
    } catch (err) {
      console.error(err);
      setSubmissionStatus('error');
      setStatusMessage('Unable to connect to the server. Please check your network or server status.');
    }
  };

  // Form Reset
  const handleReset = () => {
    setName('');
    setEmail('');
    setPhoto(null);
    setPhotoPreview(null);
    setErrors({});
    setSubmissionStatus('idle');
    setStatusMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <main className="form-card">
      <div className="form-card::top-glow" />

      {submissionStatus === 'success' ? (
        <div className="status-content">
          <div className="status-icon-wrapper success">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="status-title">Done!</h2>
          <p className="status-message">{statusMessage}</p>
          <button className="btn-reset" onClick={handleReset}>
            Register Another User
          </button>
        </div>
      ) : submissionStatus === 'error' ? (
        <div className="status-content">
          <div className="status-icon-wrapper error">
            <AlertCircle size={40} />
          </div>
          <h2 className="status-title">Registration Failed</h2>
          <p className="status-message">{statusMessage}</p>
          <button className="btn-reset" onClick={handleReset}>
            Try Again
          </button>
        </div>
      ) : (
        <>
          <div className="form-header">
            <div className="form-logo">
              <Sparkles size={28} />
            </div>
            <h1 className="form-title">User Registration</h1>
            <p className="form-subtitle">Create a public profile instantly with secure upload</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Name Field */}
            <div className="form-group">
              <label htmlFor="name-input" className="form-label">
                Full Name
              </label>
              <div className="form-input-container">
                <input
                  id="name-input"
                  type="text"
                  className={`form-input ${errors.name ? 'error' : name && !errors.name ? 'success' : ''}`}
                  placeholder="John Doe"
                  value={name}
                  onChange={handleNameChange}
                  disabled={submissionStatus === 'submitting'}
                />
                <User size={18} className="form-input-icon" />
              </div>
              {errors.name && (
                <span className="error-message" id="name-error">
                  <AlertCircle size={14} /> {errors.name}
                </span>
              )}
            </div>

            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email-input" className="form-label">
                Email Address
              </label>
              <div className="form-input-container">
                <input
                  id="email-input"
                  type="email"
                  className={`form-input ${errors.email ? 'error' : email && !errors.email ? 'success' : ''}`}
                  placeholder="john@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  disabled={submissionStatus === 'submitting'}
                />
                <Mail size={18} className="form-input-icon" />
              </div>
              {errors.email && (
                <span className="error-message" id="email-error">
                  <AlertCircle size={14} /> {errors.email}
                </span>
              )}
            </div>

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
                    disabled={submissionStatus === 'submitting'}
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
                    disabled={submissionStatus === 'submitting'}
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

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn-submit" 
              disabled={submissionStatus === 'submitting'}
            >
              {submissionStatus === 'submitting' ? (
                <>
                  <span className="spinner"></span>
                  Registering...
                </>
              ) : (
                'Register Now'
              )}
            </button>
          </form>
        </>
      )}
    </main>
  );
}
