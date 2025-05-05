import React, { useState } from 'react';
import './SimulationConfigPanel.css';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL;

const SimulationConfigPanel = ({ onClose }) => {
  const [interval, setInterval] = useState(250);
  const [randomness, setRandomness] = useState(0);
  const [chance, setChance] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  // Fetch current config when component mounts
  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get(`${apiUrl}/simulation/config`, { withCredentials: true });
        if (response.data && response.data.config) {
          setInterval(response.data.config.interval);
          setRandomness(response.data.config.randomness);
          setChance(response.data.config.chance);
        }
      } catch (error) {
        console.error('Error fetching simulation config:', error);
      }
    };
    
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSavedMessage('');
    
    try {
      await axios.post(
        `${apiUrl}/simulation/config`,
        { interval, randomness, chance },
        { withCredentials: true }
      );
      
      setSavedMessage('Configuration saved successfully!');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (error) {
      console.error('Error saving configuration:', error);
      setSavedMessage('Error saving configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRandomnessChange = (e) => {
    // Ensure the input is within range 0-100
    const value = Number(e.target.value);
    if (value >= 0 && value <= 100) {
      setRandomness(value);
    }
  };

  const intervalOptions = [
    { value: 100, label: 'Very Fast (100ms)' },
    { value: 250, label: 'Fast (250ms)' },
    { value: 500, label: 'Medium (500ms)' },
    { value: 1000, label: 'Slow (1000ms)' },
    { value: 2000, label: 'Very Slow (2000ms)' }
  ];

  return (
    <div className="simulation-config-panel">
      <div className="config-panel-header">
        <h2>Simulation Settings</h2>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>
      
      <div className="config-panel-body">
        <div className="config-section">
          <h3>Animation Speed</h3>
          <div className="config-control">
            <label>Update Interval</label>
            <select 
              value={interval} 
              onChange={(e) => setInterval(Number(e.target.value))}
            >
              {intervalOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="config-description">
              Controls how frequently the vehicle position updates (lower = smoother but more CPU intensive)
            </p>
          </div>
        </div>
        
        <div className="config-section">
          <h3>Randomness (Optional)</h3>
          <div className="config-control">
            <label>Position Randomness (%)</label>
            <input 
              type="number"
              min="0" 
              max="100" 
              value={randomness}
              onChange={handleRandomnessChange}
              className="input-field"
            />
            <span className="value-display">{randomness}%</span>
            <p className="config-description">
              Adds random deviation to vehicle positions (0% = exact route, 100% = high deviation)
            </p>
          </div>
          
          <div className="config-control">
            <label>Random Event Chance</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.1" 
              value={chance} 
              onChange={(e) => setChance(Number(e.target.value))}
            />
            <span className="value-display">{chance}</span>
            <p className="config-description">
              Probability of random position changes (1 = always, 0 = never)
            </p>
          </div>
        </div>
      </div>
      
      <div className="config-panel-footer">
        {savedMessage && <div className="save-message">{savedMessage}</div>}
        <button 
          className="save-btn" 
          onClick={handleSave} 
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};

export default SimulationConfigPanel;