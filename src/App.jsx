import { useState, useEffect } from 'react'

const API_BASE = 'https://audioroad-webrtc-system.onrender.com'

function App() {
  const [callers, setCallers] = useState([])
  const [currentCaller, setCurrentCaller] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [uploadedDocuments, setUploadedDocuments] = useState([])
  const [activeTab, setActiveTab] = useState('screening') // 'screening' or 'queue'

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    location: '',
    email: '',
    topic: '',
    notes: '',
    priority: 'normal',
    status: 'screening'
  })

  const fetchCallers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/callers`)
      if (!response.ok) {
        throw new Error('Failed to fetch callers')
      }
      const data = await response.json()
      setCallers(data)
      setError(null)
      setLastUpdate(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCallers()
    const interval = setInterval(fetchCallers, 5000)
    return () => clearInterval(interval)
  }, [])

  const detectPriority = (topic, notes) => {
    const highPriorityKeywords = ['emergency', 'urgent', 'accident', 'breakdown', 'stuck', 'immediate', 'help']
    const mediumPriorityKeywords = ['problem', 'issue', 'concern', 'question', 'advice']
    
    const text = `${topic} ${notes}`.toLowerCase()
    
    if (highPriorityKeywords.some(keyword => text.includes(keyword))) {
      return 'high'
    }
    if (mediumPriorityKeywords.some(keyword => text.includes(keyword))) {
      return 'medium'
    }
    return 'normal'
  }

  const getCallerHistory = (phone) => {
    const history = callers.filter(caller => 
      caller.phone === phone && caller.id !== currentCaller?.id
    ).map(caller => ({
      date: new Date(caller.last_call_date).toLocaleDateString(),
      topic: extractTopicFromNotes(caller.notes),
      notes: caller.notes
    }))
    
    return history.slice(0, 3)
  }

  const extractTopicFromNotes = (notes) => {
    if (!notes) return 'No topic'
    const parts = notes.split('|')
    return parts[0]?.replace('Topic:', '').trim() || notes.substring(0, 50) + '...'
  }

  const extractPriorityFromNotes = (notes) => {
    if (!notes) return 'normal'
    const priorityMatch = notes.match(/Priority: (\w+)/i)
    return priorityMatch ? priorityMatch[1].toLowerCase() : 'normal'
  }

  const isReturningCaller = (phone) => {
    return callers.some(caller => caller.phone === phone)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    const updatedData = { ...formData, [name]: value }
    
    if (name === 'topic' || name === 'notes') {
      updatedData.priority = detectPriority(updatedData.topic, updatedData.notes)
    }
    
    setFormData(updatedData)
  }

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    const newDocuments = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString()
    }))
    setUploadedDocuments(prev => [...prev, ...newDocuments])
  }

  const removeDocument = (docId) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== docId))
  }

  const submitCaller = async (targetStatus = 'active') => {
    try {
      console.log('Submitting caller with status:', targetStatus)
      
      const detailedNotes = [
        `Topic: ${formData.topic}`,
        formData.notes ? `Notes: ${formData.notes}` : '',
        `Priority: ${formData.priority.toUpperCase()}`,
        uploadedDocuments.length > 0 ? `Documents: ${uploadedDocuments.map(d => d.name).join(', ')}` : ''
      ].filter(Boolean).join(' | ')

      const callerData = {
        name: formData.name,
        phone: formData.phone,
        location: formData.location || '',
        email: formData.email || '',
        notes: detailedNotes,
        caller_type: isReturningCaller(formData.phone) ? "regular" : "new",
        status: targetStatus
      }

      console.log('Caller data being sent:', callerData)

      const response = await fetch(`${API_BASE}/api/callers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(callerData)
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', errorText)
        
        // Close modal before showing error
        setShowForm(false)
        setError(`Failed to add caller: ${response.status} - ${errorText}`)
        return
      }

      const result = await response.json()
      console.log('Successfully added caller:', result)

      // Success - close modal and reset form
      setShowForm(false)
      setFormData({
        name: '',
        phone: '',
        location: '',
        email: '',
        topic: '',
        notes: '',
        priority: 'normal',
        status: 'screening'
      })
      setUploadedDocuments([])
      setCurrentCaller(null)
      
      // Refresh caller list
      await fetchCallers()

      // Switch to queue tab after adding caller
      if (targetStatus === 'active') {
        setActiveTab('queue')
      }

    } catch (err) {
      console.error('Submit caller error:', err)
      // Close modal before showing error
      setShowForm(false)
      setError(`Error adding caller: ${err.message}`)
    }
  }

  const addToQueue = async () => {
    console.log('Add to Queue clicked')
    await submitCaller('active')  // Use 'active' instead of 'waiting'
  }
  
  const sendToHost = async () => {
    console.log('Send to Host clicked')
    await submitCaller('active')  // Use 'active' instead of 'ready'
  }

  const startNewCall = () => {
    setCurrentCaller({
      id: 'new-' + Date.now(),
      startTime: new Date()
    })
    setShowForm(true)
    setFormData({
      name: '',
      phone: '',
      location: '',
      email: '',
      topic: '',
      notes: '',
      priority: 'normal',
      status: 'screening'
    })
    setUploadedDocuments([])
    setActiveTab('screening')
  }

  const updateCallerStatus = async (callerId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE}/api/callers/${callerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        fetchCallers()
      }
    } catch (err) {
      console.error('Error updating caller status:', err)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#dc3545'
      case 'medium': return '#ffc107'
      default: return '#6c757d'
    }
  }

  // Filter callers for different tabs
  const screeningCallers = callers.filter(caller => caller.status === 'screening')
  const queueCallers = callers.filter(caller => caller.status === 'active')  // All active callers go to queue
  const onAirCallers = callers.filter(caller => caller.status === 'on-air')
  const completedCallers = callers.filter(caller => caller.status === 'completed')

  if (loading) {
    return (
      <div className="screener-container">
        <div className="loading">
          <h2>Loading Screener...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="screener-container">
      {/* Header */}
      <div className="screener-header">
        <div className="header-title">
          <h1>📞 Radio Show Screener</h1>
          <div className="screener-status">
            <div className="status-dot connected"></div>
            Connected
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span>Screening: {screeningCallers.length}</span>
          </div>
          <div className="stat-item">
            <span>Queue: {queueCallers.length}</span>
          </div>
          <div className="stat-item">
            <span>On Air: {onAirCallers.length}</span>
          </div>
          <div className="stat-item">
            <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Screening Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="screening-form">
            <div className="form-header">
              <h2>📋 Screening Call</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <div className="form-content">
              {/* Caller Information */}
              <div className="form-section">
                <h3>Caller Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Caller Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter caller's name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="555-123-4567"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="City, State"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email (optional)</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="caller@email.com"
                    />
                  </div>
                </div>

                {/* Caller History */}
                {formData.phone && isReturningCaller(formData.phone) && (
                  <div className="caller-history-section">
                    <h4>📋 Previous Calls</h4>
                    <div className="history-list">
                      {getCallerHistory(formData.phone).map((call, index) => (
                        <div key={index} className="history-item">
                          <div className="history-date">{call.date}</div>
                          <div className="history-topic">{call.topic}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Call Details */}
              <div className="form-section">
                <h3>Call Details</h3>
                <div className="form-group">
                  <label>Topic/Question *</label>
                  <textarea
                    name="topic"
                    value={formData.topic}
                    onChange={handleInputChange}
                    placeholder="What does the caller want to discuss?"
                    rows="3"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Screening Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Additional notes, background info, specific questions..."
                    rows="4"
                  />
                </div>
                
                {/* Auto-detected Priority */}
                <div className="priority-display">
                  <label>Auto-Detected Priority</label>
                  <div className={`priority-indicator priority-${formData.priority}`}>
                    <span className="priority-dot" style={{ backgroundColor: getPriorityColor(formData.priority) }}></span>
                    {formData.priority.toUpperCase()}
                    {formData.priority === 'high' && ' - Urgent/Emergency detected'}
                    {formData.priority === 'medium' && ' - Issue/Problem detected'}
                  </div>
                </div>
              </div>

              {/* Document Upload */}
              <div className="form-section">
                <h3>Documents</h3>
                <div className="upload-area">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileUpload}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="file-upload" className="upload-button">
                    📎 Upload Documents
                  </label>
                  <p className="upload-hint">
                    Oil samples, health assessments, photos, etc.
                  </p>
                </div>

                {/* Uploaded Documents */}
                {uploadedDocuments.length > 0 && (
                  <div className="uploaded-docs">
                    <h4>Uploaded Documents ({uploadedDocuments.length})</h4>
                    {uploadedDocuments.map(doc => (
                      <div key={doc.id} className="doc-item">
                        <div className="doc-info">
                          <span className="doc-name">{doc.name}</span>
                          <span className="doc-size">{formatFileSize(doc.size)}</span>
                        </div>
                        <button className="doc-remove" onClick={() => removeDocument(doc.id)}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button 
                  className="btn-queue" 
                  onClick={addToQueue}
                  disabled={!formData.name || !formData.phone || !formData.topic}
                >
                  Add to Queue
                </button>
                <button 
                  className="btn-ready" 
                  onClick={sendToHost}
                  disabled={!formData.name || !formData.phone || !formData.topic}
                >
                  Send to Host
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'screening' ? 'active' : ''}`}
          onClick={() => setActiveTab('screening')}
        >
          📞 Screening ({screeningCallers.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          📺 Queue & Live ({queueCallers.length + onAirCallers.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'screening' && (
          <div className="screening-tab">
            {/* New Call Button */}
            <div className="action-section">
              <button className="new-call-btn" onClick={startNewCall}>
                📞 Screen New Caller
              </button>
            </div>

            {/* Active Screening Sessions */}
            {screeningCallers.length > 0 && (
              <div className="section">
                <h2>🔄 Active Screening Sessions</h2>
                <div className="calls-grid">
                  {screeningCallers.map(caller => (
                    <div key={caller.id} className="caller-card screening">
                      <div className="caller-header">
                        <div className="caller-info">
                          <div className="caller-name">{caller.name}</div>
                          <div className="caller-phone">{caller.phone}</div>
                          {caller.location && (
                            <div className="caller-location">📍 {caller.location}</div>
                          )}
                        </div>
                        <div className="status-badge status-screening">SCREENING</div>
                      </div>
                      
                      <div className="caller-topic">
                        <strong>Topic:</strong> {extractTopicFromNotes(caller.notes)}
                      </div>
                      
                      <div className="caller-actions">
                        <button 
                          className="btn-queue"
                          onClick={() => updateCallerStatus(caller.id, 'waiting')}
                        >
                          → Queue
                        </button>
                        <button 
                          className="btn-ready"
                          onClick={() => updateCallerStatus(caller.id, 'ready')}
                        >
                          → Host
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {screeningCallers.length === 0 && !showForm && (
              <div className="empty-state">
                <h3>No Active Screening Sessions</h3>
                <p>Ready to screen new callers!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="queue-tab">
            {/* On Air Section */}
            {onAirCallers.length > 0 && (
              <div className="section">
                <h2>🔴 Currently On Air</h2>
                <div className="calls-grid">
                  {onAirCallers.map(caller => (
                    <div key={caller.id} className="caller-card on-air">
                      <div className="caller-header">
                        <div className="caller-info">
                          <div className="caller-name">{caller.name}</div>
                          <div className="caller-phone">{caller.phone}</div>
                          {caller.location && (
                            <div className="caller-location">📍 {caller.location}</div>
                          )}
                        </div>
                        <div className="status-badge status-on-air">🔴 ON AIR</div>
                      </div>
                      
                      <div className="caller-topic">
                        <strong>Topic:</strong> {extractTopicFromNotes(caller.notes)}
                      </div>
                      
                      <div className="priority-indicator">
                        Priority: {extractPriorityFromNotes(caller.notes).toUpperCase()}
                      </div>
                      
                      <div className="caller-actions">
                        <button 
                          className="btn-complete"
                          onClick={() => updateCallerStatus(caller.id, 'completed')}
                        >
                          Complete Call
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Queue Section */}
            <div className="section">
              <h2>⏳ Caller Queue ({queueCallers.length})</h2>
              {queueCallers.length === 0 ? (
                <div className="empty-state">
                  <p>No callers in queue</p>
                </div>
              ) : (
                <div className="calls-grid">
                  {queueCallers.map(caller => (
                    <div key={caller.id} className="caller-card queue">
                      <div className="caller-header">
                        <div className="caller-info">
                          <div className="caller-name">{caller.name}</div>
                          <div className="caller-phone">{caller.phone}</div>
                          {caller.location && (
                            <div className="caller-location">📍 {caller.location}</div>
                          )}
                          {caller.caller_type === 'regular' && (
                            <div className="returning-badge">Returning Caller</div>
                          )}
                        </div>
                        <div className={`status-badge status-${caller.status}`}>
                          {caller.status === 'ready' ? '✅ READY' : '⏳ WAITING'}
                        </div>
                      </div>
                      
                      <div className="caller-topic">
                        <strong>Topic:</strong> {extractTopicFromNotes(caller.notes)}
                      </div>
                      
                      <div className="priority-indicator">
                        Priority: {extractPriorityFromNotes(caller.notes).toUpperCase()}
                      </div>
                      
                      <div className="caller-meta">
                        <span className="caller-time">
                          📅 {new Date(caller.last_call_date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="caller-actions">
                        <button 
                          className="btn-secondary"
                          onClick={() => updateCallerStatus(caller.id, 'screening')}
                        >
                          Back to Screening
                        </button>
                        {caller.status === 'waiting' && (
                          <button 
                            className="btn-ready"
                            onClick={() => updateCallerStatus(caller.id, 'ready')}
                          >
                            Mark Ready
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
