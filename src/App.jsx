import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { AlertTriangle, Clock, User, Phone, MapPin, FileText, Plus, Send, RefreshCw, Settings, CheckCircle, XCircle } from 'lucide-react';

const ProductionScreenerApp = () => {
  const [callers, setCallers] = useState([]);
  const [readyCallers, setReadyCallers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    screenerName: 'Angie',
    apiUrl: 'https://audioroad-webrtc-system.onrender.com',
    showSettings: false
  });

  // Form refs for uncontrolled inputs
  const nameRef = useRef();
  const phoneRef = useRef();
  const locationRef = useRef();
  const topicRef = useRef();
  const notesRef = useRef();
  const priorityRef = useRef();

  // API base URL
  const API_BASE = settings.apiUrl;

  // Fetch data from API
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all callers
      const callersResponse = await fetch(`${API_BASE}/api/callers`);
      if (callersResponse.ok) {
        const callersData = await callersResponse.json();
        setCallers(callersData);
      }

      // Fetch ready calls
      const readyResponse = await fetch(`${API_BASE}/api/calls/ready`);
      if (readyResponse.ok) {
        const readyData = await readyResponse.json();
        setReadyCallers(readyData);
      }

      setIsConnected(true);
      setLastSync(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh every 10 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [settings.apiUrl]);

  // Add new caller
  const addCaller = async () => {
    const name = nameRef.current?.value;
    const phone = phoneRef.current?.value;
    const location = locationRef.current?.value;
    const topic = topicRef.current?.value;
    const notes = notesRef.current?.value;
    const priority = priorityRef.current?.value || 'medium';

    if (!name || !topic) {
      alert('Name and Topic are required');
      return;
    }

    try {
      setIsLoading(true);

      // First create caller
      const callerResponse = await fetch(`${API_BASE}/api/callers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          location,
          caller_type: 'new',
          status: 'active'
        })
      });

      if (!callerResponse.ok) throw new Error('Failed to create caller');
      const callerData = await callerResponse.json();

      // Then create call
      const callResponse = await fetch(`${API_BASE}/api/calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller_id: callerData.id,
          topic,
          screener_notes: notes,
          priority,
          screener_name: settings.screenerName,
          talking_points: generateTalkingPoints(topic, notes, priority)
        })
      });

      if (!callResponse.ok) throw new Error('Failed to create call');

      // Clear form
      if (nameRef.current) nameRef.current.value = '';
      if (phoneRef.current) phoneRef.current.value = '';
      if (locationRef.current) locationRef.current.value = '';
      if (topicRef.current) topicRef.current.value = '';
      if (notesRef.current) notesRef.current.value = '';
      if (priorityRef.current) priorityRef.current.value = 'medium';

      setShowAddForm(false);
      fetchData();
    } catch (error) {
      console.error('Error adding caller:', error);
      alert('Failed to add caller. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate AI talking points based on topic and notes
  const generateTalkingPoints = (topic, notes, priority) => {
    const points = [];
    
    if (priority === 'critical') {
      points.push('⚠️ CRITICAL PRIORITY - Handle with urgency');
    }

    if (topic.toLowerCase().includes('oil') || topic.toLowerCase().includes('analysis')) {
      points.push('Review oil analysis results in detail');
      points.push('Check iron, copper, and lead levels');
      points.push('Discuss maintenance recommendations');
      if (notes.includes('85') || notes.includes('high')) {
        points.push('🚨 EMERGENCY - Recommend immediate action');
      }
    } else if (topic.toLowerCase().includes('blood') || topic.toLowerCase().includes('pressure')) {
      points.push('Review current medication list');
      points.push('Discuss timing and interactions');
      points.push('Recommend physician consultation');
    } else if (topic.toLowerCase().includes('cdl') || topic.toLowerCase().includes('medical')) {
      points.push('Review DOT medical requirements');
      points.push('Discuss renewal timeline');
      points.push('Check for disqualifying conditions');
    } else {
      points.push('Listen carefully to caller concerns');
      points.push('Provide relevant expert advice');
      points.push('Offer practical solutions');
    }

    return points.join('\n');
  };

  const CallerCard = ({ call }) => (
    <Card className={`mb-4 ${call.priority === 'critical' ? 'border-red-500 bg-red-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-lg">{call.callers?.name}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
              {call.callers?.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {call.callers.phone}
                </div>
              )}
              {call.callers?.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {call.callers.location}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-col items-end">
            <Badge variant={call.priority === 'critical' ? 'destructive' : call.priority === 'high' ? 'default' : 'secondary'}>
              {call.priority?.toUpperCase()}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              Ready for host
            </div>
          </div>
        </div>
        
        <div className="space-y-3 text-sm">
          <div>
            <strong>Topic:</strong>
            <p className={call.priority === 'critical' ? 'text-red-700 font-medium' : ''}>{call.topic}</p>
          </div>
          
          {call.screener_notes && (
            <div>
              <strong>Screener Notes:</strong>
              <p className="text-gray-700">{call.screener_notes}</p>
            </div>
          )}
          
          {call.talking_points && (
            <div>
              <strong>Talking Points:</strong>
              <div className="bg-blue-50 p-2 rounded mt-1">
                {call.talking_points.split('\n').map((point, idx) => (
                  <div key={idx} className="text-blue-800 text-xs py-1">
                    • {point}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
          <span>Screened by: {call.screener_name}</span>
          <span>Status: Ready for Host</span>
        </div>
      </CardContent>
    </Card>
  );

  const AddCallerForm = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add New Caller
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Caller Name *</label>
            <input
              ref={nameRef}
              type="text"
              className="w-full p-2 border rounded"
              placeholder="Enter caller's full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              ref={phoneRef}
              type="tel"
              className="w-full p-2 border rounded"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            ref={locationRef}
            type="text"
            className="w-full p-2 border rounded"
            placeholder="City, State"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Topic *</label>
          <input
            ref={topicRef}
            type="text"
            className="w-full p-2 border rounded"
            placeholder="What does the caller want to discuss?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Priority Level</label>
          <select ref={priorityRef} className="w-full p-2 border rounded">
            <option value="low">Low - General questions</option>
            <option value="medium">Medium - Important but not urgent</option>
            <option value="high">High - Time sensitive</option>
            <option value="critical">Critical - Emergency/Safety issue</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Screening Notes</label>
          <textarea
            ref={notesRef}
            className="w-full p-2 border rounded h-24"
            placeholder="Detailed notes about the caller's situation, concerns, and any important context..."
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={addCaller} disabled={isLoading}>
            {isLoading ? 'Adding...' : 'Add Caller'}
          </Button>
          <Button variant="outline" onClick={() => setShowAddForm(false)}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const SettingsPanel = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Screener Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Screener Name:</label>
          <input
            type="text"
            value={settings.screenerName}
            onChange={(e) => setSettings(prev => ({ ...prev, screenerName: e.target.value }))}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">API Server URL:</label>
          <input
            type="text"
            value={settings.apiUrl}
            onChange={(e) => setSettings(prev => ({ ...prev, apiUrl: e.target.value }))}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Test Connection
          </Button>
          <Button 
            variant="outline"
            onClick={() => setSettings(prev => ({ ...prev, showSettings: false }))}
          >
            Close Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">📞 Radio Show Screener</h1>
          <p className="text-gray-600">Screener: {settings.screenerName}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm">
              {isConnected ? `Connected • Last sync: ${lastSync}` : 'Disconnected'}
            </span>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSettings(prev => ({ ...prev, showSettings: !prev.showSettings }))}
          >
            <Settings className="w-4 h-4 mr-1" />
            Settings
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {settings.showSettings && <SettingsPanel />}

      {/* Add Caller Button */}
      {!showAddForm && (
        <Button 
          onClick={() => setShowAddForm(true)}
          className="w-full"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Caller
        </Button>
      )}

      {/* Add Caller Form */}
      {showAddForm && <AddCallerForm />}

      {/* Ready Callers Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Ready for Host ({readyCallers.length})
          </h2>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {readyCallers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No callers ready for host</p>
              <p className="text-sm text-gray-400">
                Callers you screen will appear here before being sent to the host
              </p>
            </CardContent>
          </Card>
        ) : (
          <div>
            {readyCallers.map(call => (
              <CallerCard key={call.id} call={call} />
            ))}
          </div>
        )}
      </div>

      {/* Status Footer */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Connection</p>
              <p className={isConnected ? "text-green-600" : "text-red-600"}>
                {isConnected ? 'Online' : 'Offline'}
              </p>
            </div>
            <div>
              <p className="font-medium">Ready Callers</p>
              <p>{readyCallers.length}</p>
            </div>
            <div>
              <p className="font-medium">Total Callers</p>
              <p>{callers.length}</p>
            </div>
            <div>
              <p className="font-medium">Last Sync</p>
              <p>{lastSync || 'Never'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductionScreenerApp;
