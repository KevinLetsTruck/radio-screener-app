import { useState } from 'react';

const ProductionScreenerApp = () => {
  const [callers, setCallers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#1e40af' }}>📞 Radio Show Screener</h1>
      <p>System Status: <span style={{ color: 'green' }}>✅ Connected</span></p>
      
      {!showAddForm && (
        <button 
          onClick={() => setShowAddForm(true)}
          style={{
            backgroundColor: '#1e40af',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Add New Caller
        </button>
      )}

      {showAddForm && (
        <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px' }}>
          <h3>Add New Caller</h3>
          <input type="text" placeholder="Caller Name" style={{ margin: '5px', padding: '8px', width: '200px' }} />
          <br />
          <input type="text" placeholder="Topic" style={{ margin: '5px', padding: '8px', width: '200px' }} />
          <br />
          <button 
            onClick={() => setShowAddForm(false)}
            style={{ margin: '5px', padding: '8px 15px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '3px' }}
          >
            Add Caller
          </button>
          <button 
            onClick={() => setShowAddForm(false)}
            style={{ margin: '5px', padding: '8px 15px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '3px' }}
          >
            Cancel
          </button>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <h3>Ready Callers ({callers.length})</h3>
        <p>No callers ready for host</p>
      </div>
    </div>
  );
};

export default ProductionScreenerApp;
