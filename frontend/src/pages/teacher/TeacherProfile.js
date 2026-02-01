import React, { useState, useEffect } from 'react';
import { teacherAPI } from '../../services/api';
import FileUpload from '../../components/FileUpload/FileUpload';

const TeacherProfile = () => {
  const [profile, setProfile] = useState({
    bio: '',
    skills: '',
    years_of_experience: 0,
    education: '',
    certifications: '',
    hourly_rate: '',
    profile_photo: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await teacherAPI.getProfile();
      setProfile(response.data);
    } catch (error) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoUpload = (s3Key, file) => {
    setProfile(prev => ({
      ...prev,
      profile_photo: s3Key
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await teacherAPI.updateProfile(profile);
      setProfile(response.data);
      setMessage('Profile updated successfully!');
    } catch (error) {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2>Teacher Profile</h2>
      <p>Complete your teaching profile to attract more students.</p>

      {message && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          {message}
        </div>
      )}

      {error && (
        <div className="error" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            name="bio"
            value={profile.bio}
            onChange={handleChange}
            rows="4"
            placeholder="Tell students about yourself, your teaching philosophy, and what makes you unique..."
          />
          <small style={{ color: '#666' }}>
            A compelling bio helps students connect with you and understand your teaching approach.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="skills">Skills & Expertise</label>
          <textarea
            id="skills"
            name="skills"
            value={profile.skills}
            onChange={handleChange}
            rows="3"
            placeholder="List your skills, expertise areas, and subjects you can teach (e.g., JavaScript, React, Web Development, Data Science)..."
          />
          <small style={{ color: '#666' }}>
            Separate skills with commas. This helps students find you when searching for specific topics.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="years_of_experience">Years of Experience</label>
          <input
            type="number"
            id="years_of_experience"
            name="years_of_experience"
            value={profile.years_of_experience}
            onChange={handleChange}
            min="0"
            max="50"
            placeholder="0"
          />
        </div>

        <div className="form-group">
          <label htmlFor="education">Education</label>
          <textarea
            id="education"
            name="education"
            value={profile.education}
            onChange={handleChange}
            rows="3"
            placeholder="List your educational background, degrees, certifications..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="certifications">Certifications</label>
          <textarea
            id="certifications"
            name="certifications"
            value={profile.certifications}
            onChange={handleChange}
            rows="3"
            placeholder="List any relevant certifications, awards, or professional achievements..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="hourly_rate">Hourly Rate (USD)</label>
          <input
            type="number"
            id="hourly_rate"
            name="hourly_rate"
            value={profile.hourly_rate}
            onChange={handleChange}
            min="0"
            step="0.01"
            placeholder="0.00"
          />
          <small style={{ color: '#666' }}>
            Optional: Set your hourly rate for one-on-one tutoring sessions.
          </small>
        </div>

        <FileUpload
          uploadType="profile_photo"
          label="Profile Photo"
          description="Upload a professional photo that represents you as an educator."
          accept="image/*"
          maxSize={5 * 1024 * 1024} // 5MB
          onUploadComplete={handlePhotoUpload}
          onUploadError={(error) => setError(error)}
        />

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={saving}
          style={{ width: '100%', padding: '12px' }}
        >
          {saving ? 'Saving Profile...' : 'Save Profile'}
        </button>
      </form>

      {/* Profile Preview */}
      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3>Profile Preview</h3>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
          This is how your profile will appear to students:
        </p>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#ddd',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            flexShrink: 0
          }}>
            {profile.profile_photo ? '📷' : '👤'}
          </div>
          
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Your Name</h4>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
              {profile.years_of_experience} years of experience
              {profile.hourly_rate && ` • $${profile.hourly_rate}/hour`}
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
              {profile.bio || 'No bio added yet...'}
            </p>
            <p style={{ margin: '0', fontSize: '12px', color: '#007bff' }}>
              {profile.skills || 'No skills listed yet...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfile;