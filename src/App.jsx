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

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
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
    const interval = setInterval(fetchCallers, 5000) // Poll every 5 seconds
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
    // Mock history data - replace with real API call
    const historyData = {
      '555-0123': [
        { date: '2024-12-15', topic: 'DEF fluid questions', notes: 'Resolved - advised on proper brand' },
        { date: '2024-11-20', topic: 'Transmission issues', notes: 'Follow-up needed' }
      ],
      '555-0456': [
        { date: '2024-12-10', topic: 'Fuel efficiency tips', notes: 'Provided driving recommendations' }
      ]
    }
    return historyData[phone] || []
  }

  const isReturningCaller = (phone) => {
    return getCallerHistory(phone).length > 0
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    const updatedData = { ...formData, [name]: value }
    
    // Auto-detect priority when topic or notes change
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

  const submitCaller = async () => {
    try {
      const callerData = {
        ...formData,
        timestamp: new Date().toISOString(),
        documents: uploadedDocuments
      }

      const response = await fetch(`${API_BASE}/api/callers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(callerData)
      })

      if (!response.ok) {
        throw new Error('Failed to add caller')
      }

      // Reset form
      setFormData({
        name: '',
        phone: '',
        topic: '',
        notes: '',
        priority: 'normal',
        status: 'screening'
      })
      setUploadedDocuments([])
      setShowForm(false)
      setCurrentCaller(null)
      fetchCallers()

    } catch (err) {
      setError(err.message)
    }
  }

  const addToQueue = () => {
    const updatedData = { ...formData, status: 'waiting' }
    setFormData(updatedData)
    submitCaller()
  }

  const markAsReady = () => {
    const updatedData = { ...formData, status: 'ready' }
    setFormData(updatedData)
    submitCaller()
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
      topic: '',
      notes: '',
      priority: 'normal',
      status: 'screening'
    })
    setUploadedDocuments([])
  }

  const resumeCaller = (caller) => {
    setCurrentCaller(caller)
    setFormData({
      name: caller.name || '',
      phone: caller.phone || '',
      topic: caller.topic || '',
      notes: caller.notes || '',
      priority: caller.priority || 'normal',
      status: caller.status || 'screening'
    })
    setUploadedDocuments(caller.documents || [])
    setShowForm(true)
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

  const activeCallers = callers.filter(caller => caller.status !== 'completed')
  const screeningCallers = callers.filter(caller => caller.status === 'screening')
  const waitingCallers = callers.filter(caller => caller.status === 'waiting')

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
            <span>Waiting: {waitingCallers.length}</span>
          </div>
          <div className="stat-item">
            <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ Connection Error: {error}</span>
          <button onClick={fetchCallers}>Retry</button>
        </div>
      )}

      {/* Main Content */}
      {!showForm ? (
        <div className="screener-main">
          {/* New Call Button */}
          <div className="action-section">
            <button className="new-call-btn" onClick={startNewCall}>
              📞 Screen New Caller
            </button>
          </div>

          {/* Active Calls Section */}
          {screeningCallers.length > 0 && (
            <div className="section">
              <h2>🔄 Calls in Progress</h2>
              <div className="calls-grid">
                {screeningCallers.map(caller => (
                  <div key={caller.id} className="caller-card resumable" onClick={() => resumeCaller(caller)}>
                    <div className="caller-header">
                      <div className="caller-info">
                        <div className="caller-name">{caller.name || 'Unnamed Caller'}</div>
                        <div className="caller-phone">{caller.phone}</div>
                      </div>
                      <div className="resume-badge">Resume</div>
                    </div>
                    <div className="caller-topic">{caller.topic || 'No topic specified'}</div>
                    <div className="caller-meta">
                      <span className="caller-time">⏱️ In progress</span>
                      <span className={`priority-indicator priority-${caller.priority}`}>
                        {caller.priority?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Waiting Queue */}
          <div className="section">
            <h2>⏳ Caller Queue ({waitingCallers.length})</h2>
            {waitingCallers.length === 0 ? (
              <div className="empty-state">
                <p>No callers in queue. Ready to screen new calls!</p>
              </div>
            ) : (
              <div className="calls-grid">
                {waitingCallers.map(caller => (
                  <div key={caller.id} className="caller-card">
                    <div className="caller-header">
                      <div className="caller-info">
                        <div className="caller-name">{caller.name}</div>
                        <div className="caller-phone">{caller.phone}</div>
                        {isReturningCaller(caller.phone) && (
                          <div className="returning-badge">Returning Caller</div>
                        )}
                      </div>
                      <div className={`priority-badge priority-${caller.priority}`}>
                        {caller.priority?.toUpperCase()}
                      </div>
                    </div>
                    <div className="caller-topic">
                      <strong>Topic:</strong> {caller.topic}
                    </div>
                    {caller.notes && (
                      <div className="caller-notes">
                        <strong>Notes:</strong> {caller.notes}
                      </div>
                    )}
                    <div className="caller-meta">
                      <span className="caller-time">
                        ⏱️ {Math.floor((new Date() - new Date(caller.timestamp)) / (1000 * 60))} min
                      </span>
                      {caller.documents && caller.documents.length > 0 && (
                        <span className="documents-indicator">
                          📎 {caller.documents.length} docs
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Screening Form */
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

              {/* Caller History */}
              {formData.phone && isReturningCaller(formData.phone) && (
                <div className="caller-history-section">
                  <h4>📋 Previous Calls</h4>
                  <div className="history-list">
                    {getCallerHistory(formData.phone).map((call, index) => (
                      <div key={index} className="history-item">
                        <div className="history-date">{call.date}</div>
                        <div className="history-topic">{call.topic}</div>
                        <div className="history-notes">{call.notes}</div>
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
                onClick={markAsReady}
                disabled={!formData.name || !formData.phone || !formData.topic}
              >
                Send to Host
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
