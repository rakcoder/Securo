import React, { useState, useEffect } from 'react';
import { database } from './firebase';
import { ref, onValue, off } from 'firebase/database';
import './Alerts.css';
import Headers from './Navbar';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL;

const Alerts = () => {
  const [sensorData, setSensorData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [simulationCoordinates, setSimulationCoordinates] = useState(null);
  const [tripData, setTripData] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [simulationStatus, setSimulationStatus] = useState({});
  const [isUsingSimCoordinates, setIsUsingSimCoordinates] = useState(false);

  // Thresholds for alerts
  const thresholds = {
    load: -20,        // Load < -20
    reedSwitch: 0,    // Reed switch == 0
    forceSensor: 900  // Force > 900
  };

  // Fetch trip data
  useEffect(() => {
    const fetchTripData = async () => {
      try {
        const response = await axios.get(`${apiUrl}/tripdata`, { withCredentials: true });
        setTripData(response.data);
      } catch (error) {
        console.error('Error fetching trip data:', error);
      }
    };

    fetchTripData();
  }, []);

  // Function to check thresholds and generate alerts
  const checkThresholds = (data) => {
    const newAlerts = [];
    
    if (data) {
      // Check Load
      if (parseFloat(data.Load) < thresholds.load) {
        newAlerts.push({ 
          type: 'Load', 
          value: data.Load, 
          message: `Warning: Load value below threshold (${data.Load} < ${thresholds.load})`,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'high'
        });
      }
      
      // Check Reed Switch
      if (parseInt(data['Reed switch']) === thresholds.reedSwitch) {
        newAlerts.push({ 
          type: 'Reed Switch', 
          value: data['Reed switch'], 
          message: `Warning: Reed switch triggered (${data['Reed switch']} = ${thresholds.reedSwitch})`,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'high'
        });
      }
      
      // Check Force Sensor
      if (parseInt(data['Force sensor']) > thresholds.forceSensor) {
        newAlerts.push({ 
          type: 'Force Sensor', 
          value: data['Force sensor'], 
          message: `Warning: Force sensor above threshold (${data['Force sensor']} > ${thresholds.forceSensor})`,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'high'
        });
      }
    }
    
    // Add new alerts to the existing alerts
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50)); // Limit to 50 alerts
    }
  };

  // Connect to Firebase and listen for sensor data changes
  useEffect(() => {
    const sensorsRef = ref(database, 'sensors');
    
    // Listen for changes to sensor data
    onValue(sensorsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Only update sensor data if we're not using simulation coordinates
        // or if we don't have simulation coordinates yet
        if (!isUsingSimCoordinates || !simulationCoordinates) {
          setSensorData(data);
          checkThresholds(data);
        } else if (isUsingSimCoordinates && simulationCoordinates) {
          // If using simulation coordinates, update only the non-coordinate fields
          setSensorData(prevData => ({
            ...data,
            Latitude: simulationCoordinates.latitude ? `${simulationCoordinates.latitude}° N` : data.Latitude,
            Longitude: simulationCoordinates.longitude ? `${simulationCoordinates.longitude}° E` : data.Longitude,
          }));
          checkThresholds(data);
        }
        
        setIsFetching(false);
      }
    }, (error) => {
      console.error("Error fetching sensor data:", error);
      setIsFetching(false);
    });
    
    // Cleanup listener when component unmounts
    return () => {
      off(sensorsRef);
    };
  }, [isUsingSimCoordinates, simulationCoordinates]);

  // Listen for simulation logs to update coordinates
  useEffect(() => {
    const simulationListener = (event) => {
      // Check if this is a coordinate update event
      if (event.data && typeof event.data === 'object' && event.data.type === 'SIMULATION_COORDINATES') {
        console.log('Received coordinates:', event.data);
        
        // Only update if we're monitoring this trip
        if (selectedTripId && event.data.tripId === selectedTripId) {
          const { latitude, longitude, timestamp } = event.data;
          
          // Set the simulation coordinates
          setSimulationCoordinates({ latitude, longitude });
          
          // If we're using simulation coordinates and we have sensor data, update it immediately
          if (isUsingSimCoordinates && sensorData) {
            setSensorData(prevData => ({
              ...prevData,
              Latitude: `${latitude}° N`,
              Longitude: `${longitude}° E`,
              timestamp: timestamp
            }));
          }
        }
      }
    };

    // Add event listener for simulation coordinates
    window.addEventListener('message', simulationListener);
    
    // Debug message to confirm listener is active
    console.log('Simulation coordinate listener activated, selectedTripId:', selectedTripId);
    
    // Cleanup
    return () => {
      window.removeEventListener('message', simulationListener);
    };
  }, [selectedTripId, isUsingSimCoordinates, sensorData]);

  // Check simulation status periodically
  useEffect(() => {
    if (!selectedTripId) return;

    const checkSimulationStatus = async () => {
      try {
        const response = await axios.get(
          `${apiUrl}/simulation/status/${selectedTripId}`,
          { withCredentials: true }
        );
        
        setSimulationStatus(prev => ({
          ...prev,
          [selectedTripId]: response.data
        }));
        
        // If the simulation is running, we should use its coordinates
        if (response.data && response.data.isRunning) {
          setIsUsingSimCoordinates(true);
        } else {
          setIsUsingSimCoordinates(false);
        }
      } catch (error) {
        console.error('Error checking simulation status:', error);
      }
    };

    // Check status immediately and then every 3 seconds
    checkSimulationStatus();
    const interval = setInterval(checkSimulationStatus, 3000);
    
    return () => clearInterval(interval);
  }, [selectedTripId]);

  // Handle trip selection change
  const handleTripChange = (e) => {
    const tripId = e.target.value;
    setSelectedTripId(tripId);
    
    // Reset simulation coordinates when changing trips
    setSimulationCoordinates(null);
    setIsUsingSimCoordinates(false);
  };

  // Function to clear all alerts
  const clearAlerts = () => {
    setAlerts([]);
  };

  // Function to format date/time from timestamp
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp; // Return the original if parsing fails
    }
  };
  
  // Function to format coordinates for display
  const formatCoordinate = (coord) => {
    if (!coord) return 'N/A';
    return coord;
  };

  return (
    <div className="alerts-container">
      <div className="dashNavbar">
        <Headers />
      </div>
      
      <div className="alerts-content">
        <h1>Security Alerts</h1>
        
        <div className="trip-selector">
          <label htmlFor="tripSelect">Select Trip to Monitor:</label>
          <select 
            id="tripSelect" 
            value={selectedTripId || ''}
            onChange={handleTripChange}
            className="trip-select"
          >
            <option value="">-- Choose a Trip --</option>
            {tripData.map((trip) => (
              <option key={trip._id} value={trip._id}>
                {trip.tripId} - {trip.routeName} ({trip.tripStatus})
              </option>
            ))}
          </select>
          
          {selectedTripId && (
            <div className="simulation-status">
              {simulationStatus[selectedTripId]?.isRunning ? (
                <span className="status running">
                  Simulation Running - Using Live Coordinates
                </span>
              ) : (
                <span className="status not-running">
                  Simulation Not Running - Using Firebase Coordinates
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="alerts-dashboard">
          {/* Sensor Data Panel */}
          <div className="sensor-panel">
            <h2>Sensor Readings</h2>
            
            {isFetching ? (
              <div className="loading">Loading sensor data...</div>
            ) : sensorData ? (
              <div className="sensor-data">
                <table>
                  <thead>
                    <tr>
                      <th>Sensor</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Force Sensor</td>
                      <td className={parseInt(sensorData['Force sensor']) > thresholds.forceSensor ? 'alert-value' : ''}>
                        {sensorData['Force sensor']}
                      </td>
                    </tr>
                    <tr>
                      <td>Load</td>
                      <td className={parseFloat(sensorData.Load) < thresholds.load ? 'alert-value' : ''}>
                        {sensorData.Load}
                      </td>
                    </tr>
                    <tr>
                      <td>Reed Switch</td>
                      <td className={parseInt(sensorData['Reed switch']) === thresholds.reedSwitch ? 'alert-value' : ''}>
                        {sensorData['Reed switch']}
                      </td>
                    </tr>
                    <tr>
                      <td>Latitude</td>
                      <td className={isUsingSimCoordinates ? 'sim-coordinate' : ''}>
                        {formatCoordinate(sensorData.Latitude)}
                        {isUsingSimCoordinates && <span className="sim-badge">LIVE</span>}
                      </td>
                    </tr>
                    <tr>
                      <td>Longitude</td>
                      <td className={isUsingSimCoordinates ? 'sim-coordinate' : ''}>
                        {formatCoordinate(sensorData.Longitude)}
                        {isUsingSimCoordinates && <span className="sim-badge">LIVE</span>}
                      </td>
                    </tr>
                    <tr>
                      <td>Last Updated</td>
                      <td>{formatDateTime(sensorData.timestamp)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="error">No sensor data available. Check your connection.</div>
            )}
          </div>
          
          {/* Alerts Panel */}
          <div className="alerts-panel">
            <div className="alerts-header">
              <h2>Security Alerts</h2>
              <button onClick={clearAlerts} className="clear-alerts-btn">Clear Alerts</button>
            </div>
            
            {alerts.length > 0 ? (
              <div className="alerts-list">
                {alerts.map((alert, index) => (
                  <div key={index} className={`alert-item severity-${alert.severity}`}>
                    <div className="alert-timestamp">{alert.timestamp}</div>
                    <div className="alert-type">{alert.type}</div>
                    <div className="alert-message">{alert.message}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-alerts">No alerts at this time.</div>
            )}
          </div>
        </div>
        
        <div className="alerts-info">
          <h3>Threshold Information</h3>
          <ul>
            <li><strong>Load:</strong> Alert triggered when load value is below -20</li>
            <li><strong>Reed Switch:</strong> Alert triggered when value equals 0 (open/disconnected)</li>
            <li><strong>Force Sensor:</strong> Alert triggered when value exceeds 900</li>
          </ul>
          <p className="alerts-note">
            These sensors act as protection against theft. Real-time monitoring helps prevent
            unauthorized access and tampering with vehicles.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Alerts;