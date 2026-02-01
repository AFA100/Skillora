import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { enrollmentAPI } from '../../services/api';

const CoursePlayer = () => {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const progressUpdateRef = useRef(null);
  
  const [courseData, setCourseData] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoProgress, setVideoProgress] = useState({ currentTime: 0, duration: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [studySessionId, setStudySessionId] = useState(null);

  useEffect(() => {
    fetchCourseData();
    startStudySession();
    
    return () => {
      if (studySessionId) {
        endStudySession();
      }
    };
  }, [enrollmentId]);

  useEffect(() => {
    if (currentLesson) {
      fetchNotes();
      fetchBookmarks();
    }
  }, [currentLesson]);

  const fetchCourseData = async () => {
    try {
      const response = await enrollmentAPI.getCoursePlayer(enrollmentId);
      setCourseData(response.data);
      
      if (response.data.current_lesson) {
        setCurrentLesson(response.data.current_lesson);
      } else {
        // Start with first lesson
        const firstSection = response.data.sections[0];
        if (firstSection && firstSection.lessons.length > 0) {
          const firstLesson = firstSection.lessons[0];
          await startLesson(firstLesson.id);
        }
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startStudySession = async () => {
    try {
      const response = await enrollmentAPI.startStudySession(enrollmentId, {
        device_type: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop'
      });
      setStudySessionId(response.data.session_id);
    } catch (error) {
      console.error('Error starting study session:', error);
    }
  };

  const endStudySession = async () => {
    if (studySessionId) {
      try {
        await enrollmentAPI.endStudySession(enrollmentId, studySessionId);
      } catch (error) {
        console.error('Error ending study session:', error);
      }
    }
  };

  const startLesson = async (lessonId) => {
    try {
      const response = await enrollmentAPI.startLesson(enrollmentId, lessonId);
      
      // Find lesson data
      let lessonData = null;
      for (const section of courseData.sections) {
        const lesson = section.lessons.find(l => l.id === lessonId);
        if (lesson) {
          lessonData = lesson;
          break;
        }
      }
      
      if (lessonData) {
        setCurrentLesson({
          ...lessonData,
          video_url: response.data.video_url || lessonData.video_url
        });
        
        // Set video progress
        if (response.data.current_time) {
          setVideoProgress(prev => ({
            ...prev,
            currentTime: response.data.current_time
          }));
        }
      }
    } catch (error) {
      console.error('Error starting lesson:', error);
    }
  };

  const fetchNotes = async () => {
    try {
      const response = await enrollmentAPI.getNotes(enrollmentId, {
        lesson_id: currentLesson.id
      });
      setNotes(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const response = await enrollmentAPI.getBookmarks(enrollmentId, {
        lesson_id: currentLesson.id
      });
      setBookmarks(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      
      setVideoProgress({ currentTime, duration });
      
      // Throttle progress updates
      if (progressUpdateRef.current) {
        clearTimeout(progressUpdateRef.current);
      }
      
      progressUpdateRef.current = setTimeout(() => {
        updateVideoProgress(currentTime, duration);
      }, 5000); // Update every 5 seconds
    }
  };

  const updateVideoProgress = async (currentTime, duration) => {
    try {
      await enrollmentAPI.updateVideoProgress(enrollmentId, currentLesson.id, {
        current_time: Math.floor(currentTime),
        duration: Math.floor(duration)
      });
    } catch (error) {
      console.error('Error updating video progress:', error);
    }
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    // Update progress immediately on pause
    if (videoRef.current) {
      updateVideoProgress(videoRef.current.currentTime, videoRef.current.duration);
    }
  };

  const createNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      const noteData = {
        lesson: currentLesson.id,
        content: newNote,
        timestamp_seconds: Math.floor(videoProgress.currentTime)
      };
      
      await enrollmentAPI.createNote(enrollmentId, noteData);
      setNewNote('');
      fetchNotes();
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const createBookmark = async () => {
    const title = prompt('Bookmark title:');
    if (!title) return;
    
    try {
      const bookmarkData = {
        lesson: currentLesson.id,
        title,
        timestamp_seconds: Math.floor(videoProgress.currentTime)
      };
      
      await enrollmentAPI.createBookmark(enrollmentId, bookmarkData);
      fetchBookmarks();
    } catch (error) {
      console.error('Error creating bookmark:', error);
    }
  };

  const jumpToBookmark = (timestamp) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
    }
  };

  const getNextLesson = () => {
    if (!courseData || !currentLesson) return null;
    
    for (const section of courseData.sections) {
      const currentIndex = section.lessons.findIndex(l => l.id === currentLesson.id);
      if (currentIndex !== -1) {
        // Next lesson in same section
        if (currentIndex < section.lessons.length - 1) {
          return section.lessons[currentIndex + 1];
        }
        // First lesson of next section
        const sectionIndex = courseData.sections.findIndex(s => s.id === section.id);
        if (sectionIndex < courseData.sections.length - 1) {
          const nextSection = courseData.sections[sectionIndex + 1];
          return nextSection.lessons[0];
        }
      }
    }
    return null;
  };

  const getPreviousLesson = () => {
    if (!courseData || !currentLesson) return null;
    
    for (const section of courseData.sections) {
      const currentIndex = section.lessons.findIndex(l => l.id === currentLesson.id);
      if (currentIndex !== -1) {
        // Previous lesson in same section
        if (currentIndex > 0) {
          return section.lessons[currentIndex - 1];
        }
        // Last lesson of previous section
        const sectionIndex = courseData.sections.findIndex(s => s.id === section.id);
        if (sectionIndex > 0) {
          const prevSection = courseData.sections[sectionIndex - 1];
          return prevSection.lessons[prevSection.lessons.length - 1];
        }
      }
    }
    return null;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading course...</p>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Course not found</h2>
        <button onClick={() => navigate('/app/learner')} className="btn btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#000' }}>
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Video Player */}
        <div style={{ flex: 1, position: 'relative', backgroundColor: '#000' }}>
          {currentLesson && currentLesson.lesson_type === 'video' && currentLesson.video_url ? (
            <video
              ref={videoRef}
              src={currentLesson.video_url}
              controls
              style={{ width: '100%', height: '100%' }}
              onTimeUpdate={handleVideoTimeUpdate}
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              onLoadedMetadata={() => {
                if (videoProgress.currentTime > 0) {
                  videoRef.current.currentTime = videoProgress.currentTime;
                }
              }}
            />
          ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              color: 'white',
              fontSize: '18px'
            }}>
              {currentLesson?.lesson_type === 'text' ? (
                <div style={{ padding: '40px', maxWidth: '800px' }}>
                  <h2>{currentLesson.title}</h2>
                  <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                    {currentLesson.text_content || currentLesson.description}
                  </div>
                </div>
              ) : (
                <p>No video available for this lesson</p>
              )}
            </div>
          )}
          
          {/* Video Controls Overlay */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            display: 'flex',
            gap: '10px'
          }}>
            <button
              onClick={createBookmark}
              style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              📌 Bookmark
            </button>
            <button
              onClick={() => setShowNotes(!showNotes)}
              style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              📝 Notes
            </button>
          </div>
        </div>

        {/* Lesson Info */}
        <div style={{ 
          backgroundColor: '#1a1a1a', 
          color: 'white', 
          padding: '20px' 
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>
            {currentLesson?.title}
          </h3>
          <p style={{ margin: '0', color: '#ccc' }}>
            {currentLesson?.description}
          </p>
          
          {/* Navigation */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: '20px' 
          }}>
            <button
              onClick={() => {
                const prevLesson = getPreviousLesson();
                if (prevLesson) startLesson(prevLesson.id);
              }}
              disabled={!getPreviousLesson()}
              className="btn btn-secondary"
            >
              ← Previous
            </button>
            
            <button
              onClick={() => navigate('/app/learner')}
              className="btn btn-primary"
            >
              Back to Dashboard
            </button>
            
            <button
              onClick={() => {
                const nextLesson = getNextLesson();
                if (nextLesson) startLesson(nextLesson.id);
              }}
              disabled={!getNextLesson()}
              className="btn btn-secondary"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ 
        width: '350px', 
        backgroundColor: '#f8f9fa', 
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100vh'
      }}>
        {/* Course Info */}
        <div style={{ padding: '20px', borderBottom: '1px solid #ddd' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>{courseData.course_title}</h4>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Progress: {courseData.progress_percentage}%
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#e9ecef',
            borderRadius: '3px',
            marginTop: '5px'
          }}>
            <div
              style={{
                width: `${courseData.progress_percentage}%`,
                height: '100%',
                backgroundColor: '#007bff',
                borderRadius: '3px'
              }}
            />
          </div>
        </div>

        {/* Lessons List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {courseData.sections.map(section => (
            <div key={section.id} style={{ marginBottom: '10px' }}>
              <div style={{ 
                padding: '15px 20px', 
                backgroundColor: '#e9ecef',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                {section.title}
              </div>
              
              {section.lessons.map(lesson => (
                <div
                  key={lesson.id}
                  onClick={() => startLesson(lesson.id)}
                  style={{
                    padding: '12px 20px',
                    cursor: 'pointer',
                    backgroundColor: currentLesson?.id === lesson.id ? '#007bff' : 'transparent',
                    color: currentLesson?.id === lesson.id ? 'white' : '#333',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>
                    {lesson.is_completed ? '✅' : 
                     lesson.lesson_type === 'video' ? '▶️' : '📄'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>
                      {lesson.title}
                    </div>
                    {lesson.duration_minutes && (
                      <div style={{ fontSize: '12px', opacity: 0.7 }}>
                        {lesson.duration_minutes} min
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Notes Panel */}
        {showNotes && (
          <div style={{ 
            borderTop: '1px solid #ddd',
            maxHeight: '300px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '15px', borderBottom: '1px solid #ddd' }}>
              <h5 style={{ margin: '0 0 10px 0' }}>Notes</h5>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && createNote()}
                />
                <button
                  onClick={createNote}
                  className="btn btn-primary"
                  style={{ padding: '8px 12px', fontSize: '14px' }}
                >
                  Add
                </button>
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {notes.map(note => (
                <div key={note.id} style={{ 
                  marginBottom: '10px',
                  padding: '10px',
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  border: '1px solid #eee'
                }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                    {note.timestamp_seconds && formatTime(note.timestamp_seconds)}
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    {note.content}
                  </div>
                </div>
              ))}
              
              {bookmarks.map(bookmark => (
                <div key={bookmark.id} style={{ 
                  marginBottom: '10px',
                  padding: '10px',
                  backgroundColor: '#fff3cd',
                  borderRadius: '4px',
                  border: '1px solid #ffeaa7',
                  cursor: 'pointer'
                }}
                onClick={() => jumpToBookmark(bookmark.timestamp_seconds)}
                >
                  <div style={{ fontSize: '12px', color: '#856404', marginBottom: '5px' }}>
                    📌 {formatTime(bookmark.timestamp_seconds)}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>
                    {bookmark.title}
                  </div>
                  {bookmark.description && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      {bookmark.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursePlayer;