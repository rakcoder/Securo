import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { database } from './firebase';
import { ref, onValue, off } from 'firebase/database';
import './Dashboard.css';
import Headers from './Navbar';
import ViewRoute from './ViewRoute';
import SimulationConfigPanel from './components/SimulationConfigPanel';

const apiUrl = process.env.REACT_APP_API_URL;

const Dashboard = () => {
  // State for tabs and UI organization
  const [activeTab, setActiveTab] = useState('trips');
  const [bottomActiveTab, setBottomActiveTab] = useState('logs');
  
  // Trip data state
  const [tripData, setTripData] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [routeId, setRouteId] = useState(null);
  const [vehicleId, setVehicleId] = useState(null);
  const [vehicleCoordinate, setVehicleCoordinate] = useState(null);
  const [vehicleData, setVehicleData] = useState(null);
  
  // Add trip form state
  const [showForm, setShowForm] = useState(false);
  const [tripVehicleData, setTripVehicleData] = useState(null);
  const [driverData, setDriverData] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [newTrip, setNewTrip] = useState({
    tripId: '',
    vehicleId: '',
    scheduled_date_time: '',
    trip_start_date_time: '',
    trip_end_date_time: '',
    routeName: '',
    driverId: '',
    info: '',
    routeId: '',
    distance_threshold_KM: 0.2,
    time_threshold: 10,
    alert_threshold: 10
  });
  
  // Simulation state
  const [showSimulationConfig, setShowSimulationConfig] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState({});
  const [simulationLogs, setSimulationLogs] = useState([]);
  
  // Sensor data state
  const [sensorData, setSensorData] = useState(null);
  const [isFetchingSensors, setIsFetchingSensors] = useState(true);
  const [dashboardAlerts, setDashboardAlerts] = useState([]);
  const [simulationCoordinates, setSimulationCoordinates] = useState(null);
  
  // Thresholds for sensor alerts (same as in Alerts page)
  const thresholds = {
    load: -20,        // Load < -20
    reedSwitch: 0,    // Reed switch == 0
    forceSensor: 900  // Force > 900
  };
  
  // Refs
  const logsContainerRef = useRef(null);
  const alertsContainerRef = useRef(null);

  // Fetch trip data on component mount
  useEffect(() => {
    fetchTripData().then(setTripData);
    
    // Listen for simulation coordinates from other components
    const simulationListener = (event) => {
      if (event.data && typeof event.data === 'object' && event.data.type === 'SIMULATION_COORDINATES') {
        console.log('Dashboard received coordinates:', event.data);
        
        // If this is for the selected trip, update the coordinates
        if (selectedTripId && event.data.tripId === selectedTripId) {
          const { latitude, longitude } = event.data;
          setSimulationCoordinates({ latitude, longitude });
        }
      }
    };
    
    window.addEventListener('message', simulationListener);
    
    return () => {
      window.removeEventListener('message', simulationListener);
    };
  }, [selectedTripId]);

  // Connect to Firebase for sensor data
  useEffect(() => {
    const sensorsRef = ref(database, 'sensors');
    
    onValue(sensorsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // If we have simulation coordinates for lat/long, use those instead
        if (simulationCoordinates && simulationStatus[selectedTripId]?.isRunning) {
          setSensorData(prevData => ({
            ...data,
            Latitude: `${simulationCoordinates.latitude}° N`,
            Longitude: `${simulationCoordinates.longitude}° E`,
            timestamp: new Date().toISOString()
          }));
        } else {
          setSensorData(data);
        }
        setIsFetchingSensors(false);
        checkThresholds(data);
      }
    }, (error) => {
      console.error("Error fetching sensor data:", error);
      setIsFetchingSensors(false);
    });
    
    // Cleanup Firebase listener on unmount
    return () => {
      off(sensorsRef);
    };
  }, [simulationCoordinates, selectedTripId, simulationStatus]);

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
      setDashboardAlerts(prev => [...newAlerts, ...prev].slice(0, 50)); // Limit to 50 alerts
      
      // Auto-switch to alerts tab when new alerts come in
      if (newAlerts.length > 0 && bottomActiveTab !== 'alerts') {
        // Optional: auto-switch to alerts tab
        // setBottomActiveTab('alerts');
      }
    }
  };

  // Fetch vehicle data periodically
  useEffect(() => {
    if (vehicleId) {
      fetchVehicleData().catch(console.error);
      
      const interval = setInterval(() => {
        fetchVehicleData().catch(console.error);
      }, 100000); 
      
      return () => clearInterval(interval);
    }
  }, [vehicleId]);
  
  // Auto-scroll logs and alerts to bottom when new entries are added
  useEffect(() => {
    if (logsContainerRef.current && bottomActiveTab === 'logs') {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
    
    if (alertsContainerRef.current && bottomActiveTab === 'alerts') {
      alertsContainerRef.current.scrollTop = alertsContainerRef.current.scrollHeight;
    }
  }, [simulationLogs, dashboardAlerts, bottomActiveTab]);

  // Helper function to format dates
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Data fetching functions
  const fetchTripData = async () => {
    try {
      const response = await axios.get(`${apiUrl}/tripdata`, { withCredentials: true });
      return response.data;
    } catch (error) {
      console.error('Error fetching trip data:', error);
      return [];
    }
  };

  const fetchVehicleData = async () => {
    try {
      const response = await axios.get(`${apiUrl}/vehicledata`, { withCredentials: true });
      setVehicleData(response.data);

      if (vehicleId) {
        const selectedVehicle = response.data.find(vehicle => vehicle.vehicleID === vehicleId);
        if (selectedVehicle) {
          setVehicleCoordinate(selectedVehicle.last_location);
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching vehicle data:', error);
      return [];
    }
  };

  const fetchDriverData = async () => {
    try {
      const response = await axios.get(`${apiUrl}/driverdata`, { withCredentials: true });
      setDriverData(response.data);
    } catch (error) {
      console.error('Error fetching driver data:', error);
    }
  };

  const fetchRoutesData = async () => {
    try {
      const response = await axios.get(`${apiUrl}/routenames`, { withCredentials: true });
      setRouteData(response.data);
    } catch (error) {
      console.error("Error fetching route names:", error);
    }
  };

  // Trip selection and actions
  const handleTripClick = (tripId, routeId, vehicleId) => {
    setSelectedTripId(tripId);
    setRouteId(routeId);
    setVehicleId(vehicleId);
    fetchVehicleData().catch(console.error);
  };

  const handleAddTripClick = () => {
    setShowForm(true);
    fetchDriverData();
    fetchVehicleData().then(setTripVehicleData);
    fetchRoutesData();
  };

  const handleCancelClick = () => {
    setShowForm(false);
  };

  const handleStartStopTripClick = async (tripId, status) => {
    try {
      const response = await axios.post(
        `${apiUrl}/updateTripStatus`,
        { tripId, tripStatus: status },
        { withCredentials: true }
      );
      
      console.log('Trip status updated:', response.data);
      fetchTripData().then(setTripData);
    } catch (error) {
      console.error('Error updating trip status:', error);
    }
  };
  
  // Form handling
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTrip({ ...newTrip, [name]: value });
  };

  const handleSaveClick = async () => {
    let maxTripId = 0;
    if(tripData.length > 0) {
      maxTripId = Math.max(...tripData.map(trip => trip.tripId));
    }
    
    const selectedRoute = routeData.find(route => route._id === newTrip.routeId);
    const estTime = selectedRoute ? selectedRoute.estimatedTime : 0;

    const newTripData = {
      ...newTrip,
      routeName: selectedRoute ? selectedRoute.name : '',
      time_threshold: newTrip.time_threshold * 60 * 1000,
      scheduled_date_time: new Date(newTrip.scheduled_date_time).getTime(),
      trip_start_date_time: new Date(newTrip.scheduled_date_time).getTime(),
      trip_end_date_time: new Date(newTrip.scheduled_date_time).getTime() + estTime * 1000,
      tripId: maxTripId + 1,
      alert_threshold: newTrip.alert_threshold * 60 * 1000
    };
    
    try {
      const response = await axios.post(`${apiUrl}/addTripData`, newTripData, { withCredentials: true });
      console.log('Trip saved successfully:', response.data);
      setShowForm(false);
      fetchTripData().then(setTripData);
    } catch (error) {
      console.error('Error saving new trip:', error);
    }
  };

  // Alert actions
  const clearDashboardAlerts = () => {
    setDashboardAlerts([]);
  };

  // Simulation functions
  const addSimulationLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setSimulationLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };
  
  const clearSimulationLogs = () => {
    setSimulationLogs([]);
  };
  
  const toggleSimulationConfig = () => {
    setShowSimulationConfig(!showSimulationConfig);
  };

  // Handle simulation start/stop
  const handleStartSimulation = async (tripId) => {
    try {
      addSimulationLog(`Starting simulation for trip ${tripId}...`);
      const response = await axios.post(
        `${apiUrl}/simulation/run`,
        { tripId },
        { withCredentials: true }
      );
      
      console.log('Simulation started:', response.data);
      addSimulationLog(`Simulation started for trip ${tripId}`);
      
      // Fetch vehicle data immediately to show initial position
      await fetchVehicleData();
      
      // Start polling for simulation status and logs
      const statusInterval = setInterval(async () => {
        try {
          // Fetch simulation status
          const statusRes = await axios.get(
            `${apiUrl}/simulation/status/${tripId}`,
            { withCredentials: true }
          );
          
          setSimulationStatus(prev => ({
            ...prev,
            [tripId]: statusRes.data
          }));
          
          // Fetch latest simulation logs
          await fetchSimulationLogs(tripId);
          
          // Fetch latest vehicle position
          await fetchVehicleData();
          
          if (statusRes.data.isRunning === false && simulationStatus[tripId]?.isRunning === true) {
            addSimulationLog(`Simulation completed for trip ${tripId}`);
            await fetchSimulationLogs(tripId);
            clearInterval(statusInterval);
          }
        } catch (error) {
          console.error('Error fetching simulation status or logs:', error);
        }
      }, 1000);
      
      setSimulationStatus(prev => ({
        ...prev,
        [tripId]: {
          ...prev[tripId],
          intervalId: statusInterval,
          isRunning: true
        }
      }));
      
    } catch (error) {
      console.error('Error starting simulation:', error);
      addSimulationLog(`Error starting simulation: ${error.message}`);
    }
  };
  
  const handleStopSimulation = async (tripId) => {
    try {
      addSimulationLog(`Stopping simulation for trip ${tripId}...`);
      
      const response = await axios.post(
        `${apiUrl}/simulation/stop`,
        { tripId },
        { withCredentials: true }
      );
      
      console.log('Simulation stopped:', response.data);
      addSimulationLog(`Simulation stop requested for trip ${tripId}`);
      
      if (simulationStatus[tripId]?.intervalId) {
        clearInterval(simulationStatus[tripId].intervalId);
      }
      
      setSimulationStatus(prev => ({
        ...prev,
        [tripId]: {
          ...prev[tripId],
          isRunning: false
        }
      }));
      
      // Reset simulation coordinates
      setSimulationCoordinates(null);
      
    } catch (error) {
      console.error('Error stopping simulation:', error);
      addSimulationLog(`Error stopping simulation: ${error.message}`);
    }
  };

  // Fetch simulation logs
  const fetchSimulationLogs = async (tripId) => {
    try {
      const response = await axios.get(
        `${apiUrl}/simulation/logs/${tripId}`,
        { withCredentials: true }
      );
      
      if (response.data && response.data.logs) {
        const formattedLogs = response.data.logs.map(log => {
          const timestamp = new Date(log.timestamp).toLocaleTimeString();
          const logMessage = `[${timestamp}] ${log.message}`;
          
          // Create a class for coordinate logs to style them differently
          let logClass = '';
          
          // Broadcast coordinates for internal use and Alerts page
          if (log.message.includes('Moving to waypoint')) {
            logClass = 'coordinate-log';
            const coordMatch = log.message.match(/\[(\d+\.\d+), (\d+\.\d+)\]/);
            if (coordMatch && coordMatch.length === 3) {
              const coordData = {
                type: 'SIMULATION_COORDINATES',
                tripId: tripId,
                latitude: coordMatch[1],
                longitude: coordMatch[2],
                timestamp: new Date().toISOString()
              };
              
              // Update local state
              setSimulationCoordinates({
                latitude: coordMatch[1],
                longitude: coordMatch[2]
              });
              
              // Broadcast to other components
              window.postMessage(coordData, window.location.origin);
            }
          }
          
          return { message: logMessage, class: logClass };
        });
        
        // Update logs, avoiding duplicates
        setSimulationLogs(prevLogs => {
          const existingLogTexts = new Set(prevLogs.map(log => 
            typeof log === 'string' ? log : log.message
          ));
          
          const newLogs = formattedLogs.filter(log => 
            !existingLogTexts.has(log.message)
          );
          
          if (newLogs.length > 0) {
            return [...prevLogs, ...newLogs];
          }
          
          return prevLogs;
        });
      }
    } catch (error) {
      console.error('Error fetching simulation logs:', error);
    }
  };
  
  // Get status display class based on trip status
  const getStatusClass = (status) => {
    switch(status) {
      case 'RUNNING': return 'status-running';
      case 'COMPLETED': return 'status-completed';
      default: return 'status-scheduled';
    }
  };

  // Add state for current date and time
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  
  // Update current date and time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Format current date and time in a readable format (e.g., "4/27/2025, 3:34:02 PM")
  const getCurrentDateTime = () => {
    return currentDateTime.toLocaleString();
  };

  return (
    <div className="Dashboard">
      <div className="dashNavbar">
        <Headers />
      </div>
      
      <div className="dashboard-main">
        {/* Left Panel - Trip List & Controls */}
        <div className="dashboard-left-panel">
          <div className="dashboard-tabs">
            <button 
              className={`dashboard-tab ${activeTab === 'trips' ? 'active' : ''}`}
              onClick={() => setActiveTab('trips')}
            >
              Trips
            </button>
            <button 
              className={`dashboard-tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
          </div>
          
          <div className="dashboard-tab-content">
            {activeTab === 'trips' && (
              <div className="trip-list">
                <div className="trip-list-header">
                  <h2>Trip List</h2>
                  <button className="btn btn-primary" onClick={handleAddTripClick}>
                    Add Trip
                  </button>
                </div>
                
                {tripData.length > 0 ? (
                  tripData.map((trip) => (
                    <div 
                      key={trip.tripId}
                      className={`trip-item ${selectedTripId === trip._id ? 'selected' : ''}`}
                    >
                      <div 
                        className="trip-item-header"
                        onClick={() => handleTripClick(trip._id, trip.routeId, trip.vehicleId)}
                      >
                        <span className="trip-name">{trip.tripId} - {trip.routeName}</span>
                        <span className={`trip-status ${getStatusClass(trip.tripStatus)}`}>
                          {trip.tripStatus}
                        </span>
                      </div>
                      
                      {selectedTripId === trip._id && (
                        <div className="trip-details">
                          <div className="trip-detail-row">
                            <span className="trip-detail-label">Vehicle ID:</span>
                            <span className="trip-detail-value">{trip.vehicleId}</span>
                          </div>
                          <div className="trip-detail-row">
                            <span className="trip-detail-label">Driver:</span>
                            <span className="trip-detail-value">{trip.driverId}</span>
                          </div>
                          <div className="trip-detail-row">
                            <span className="trip-detail-label">Start Time:</span>
                            <span className="trip-detail-value">{formatDateTime(trip.trip_start_date_time)}</span>
                          </div>
                          <div className="trip-detail-row">
                            <span className="trip-detail-label">End Time:</span>
                            <span className="trip-detail-value">{formatDateTime(trip.trip_end_date_time)}</span>
                          </div>
                          <div className="trip-detail-row">
                            <span className="trip-detail-label">Info:</span>
                            <span className="trip-detail-value">{trip.info || 'No additional info'}</span>
                          </div>
                          
                          <div className="trip-actions">
                            {(trip.tripStatus === "SCHEDULED" || trip.tripStatus === "PENDING") && (
                              <button 
                                className="btn btn-success" 
                                onClick={() => handleStartStopTripClick(trip._id, "RUNNING")}
                              >
                                Start Trip
                              </button>
                            )}
                            
                            {trip.tripStatus === 'RUNNING' && (
                              <>
                                <button 
                                  className="btn btn-danger" 
                                  onClick={() => handleStartStopTripClick(trip._id, "COMPLETED")}
                                >
                                  Stop Trip
                                </button>
                                
                                {simulationStatus[trip._id]?.isRunning ? (
                                  <button 
                                    className="btn btn-danger" 
                                    onClick={() => handleStopSimulation(trip._id)}
                                  >
                                    Stop Simulation
                                  </button>
                                ) : (
                                  <button 
                                    className="btn btn-primary" 
                                    onClick={() => handleStartSimulation(trip._id)}
                                  >
                                    Start Simulation
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                          
                          {simulationStatus[trip._id]?.isRunning && simulationStatus[trip._id]?.progress > 0 && (
                            <div className="progress-container">
                              <div className="trip-detail-row">
                                <span className="trip-detail-label">Progress:</span>
                                <span className="trip-detail-value">{simulationStatus[trip._id].progress}%</span>
                              </div>
                              <div className="progress-bar">
                                <div 
                                  className="progress-fill" 
                                  style={{width: `${simulationStatus[trip._id].progress}%`}}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="no-trips">No trips found. Add a trip to get started.</div>
                )}
              </div>
            )}
            
            {activeTab === 'settings' && (
              <div className="settings-tab">
                <button className="btn btn-outline btn-block" onClick={toggleSimulationConfig}>
                  <span className="icon">⚙️</span> Simulation Settings
                </button>
                
                <div className="settings-info">
                  <h3>Dashboard Settings</h3>
                  <p>
                    Configure your dashboard preferences and simulation parameters here.
                    Click on the Simulation Settings button to adjust speed, randomness, and more.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Panel - Map & Sensors side-by-side */}
        <div className="dashboard-right-panel">
          <div className="map-sensor-container">
            {/* Map Container */}
            <div className="map-container">
              {routeId ? (
                <ViewRoute 
                  key={`${routeId}-${vehicleCoordinate ? `${vehicleCoordinate[0]}-${vehicleCoordinate[1]}` : ''}`} 
                  routeId={routeId} 
                  vehicleCoordinate={vehicleCoordinate} 
                />
              ) : (
                <div className="no-route-selected">
                  <p>Select a trip to view its route on the map</p>
                </div>
              )}
            </div>
            
            {/* Right sidebar with sensor readings and bottom panel */}
            <div className="sensor-panel-container">
              {/* Sensor readings section */}
              <div className="sensor-readings">
                <div className="sensor-readings-header">
                  <h3>Vehicle Sensor Readings</h3>
                  <span className="sensor-timestamp">
                    {getCurrentDateTime()}
                  </span>
                </div>
                
                {isFetchingSensors ? (
                  <div className="loading-sensors">Loading sensor data...</div>
                ) : sensorData ? (
                  <div className="sensor-data-grid">
                    <div className={`sensor-card ${parseInt(sensorData['Force sensor']) > thresholds.forceSensor ? 'alert-value' : ''}`}>
                      <div className="sensor-name">Force Sensor</div>
                      <div className="sensor-value">{sensorData['Force sensor']}</div>
                    </div>
                    
                    <div className={`sensor-card ${parseFloat(sensorData.Load) < thresholds.load ? 'alert-value' : ''}`}>
                      <div className="sensor-name">Load</div>
                      <div className="sensor-value">{sensorData.Load}</div>
                    </div>
                    
                    <div className={`sensor-card ${parseInt(sensorData['Reed switch']) === thresholds.reedSwitch ? 'alert-value' : ''}`}>
                      <div className="sensor-name">Reed Switch</div>
                      <div className="sensor-value">{sensorData['Reed switch']}</div>
                    </div>
                    
                    <div className="sensor-card sim-coordinate">
                      <div className="sensor-name">Latitude</div>
                      <div className="sensor-value">
                        {sensorData.Latitude}
                        {selectedTripId && simulationStatus[selectedTripId]?.isRunning && (
                          <span className="sensor-badge">LIVE</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="sensor-card sim-coordinate">
                      <div className="sensor-name">Longitude</div>
                      <div className="sensor-value">
                        {sensorData.Longitude}
                        {selectedTripId && simulationStatus[selectedTripId]?.isRunning && (
                          <span className="sensor-badge">LIVE</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="no-sensor-data">No sensor data available</div>
                )}
              </div>
              
              {/* Bottom panel for logs & alerts */}
              <div className="dashboard-bottom-panel">
                <div className="bottom-panel-tabs">
                  <button 
                    className={`bottom-panel-tab ${bottomActiveTab === 'logs' ? 'active' : ''}`}
                    onClick={() => setBottomActiveTab('logs')}
                  >
                    Simulation Logs
                  </button>
                  <button 
                    className={`bottom-panel-tab ${bottomActiveTab === 'alerts' ? 'active' : ''}`}
                    onClick={() => setBottomActiveTab('alerts')}
                  >
                    Alerts {dashboardAlerts.length > 0 && `(${dashboardAlerts.length})`}
                  </button>
                </div>
                
                <div className="bottom-panel-content">
                  {bottomActiveTab === 'logs' && (
                    <div className="simulation-logs">
                      <div className="log-actions">
                        <button className="clear-logs-btn" onClick={clearSimulationLogs}>
                          Clear Logs
                        </button>
                      </div>
                      
                      <div className="logs-container" ref={logsContainerRef}>
                        {simulationLogs.length > 0 ? (
                          simulationLogs.map((log, index) => (
                            <div 
                              key={index} 
                              className={`log-entry ${typeof log === 'object' ? log.class : ''}`}
                            >
                              {typeof log === 'object' ? log.message : log}
                            </div>
                          ))
                        ) : (
                          <div className="no-logs">No simulation logs yet. Start a simulation to see logs.</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {bottomActiveTab === 'alerts' && (
                    <div className="alerts-tab">
                      <div className="alerts-header">
                        <h4>Security Alerts</h4>
                        <button className="clear-alerts-btn" onClick={clearDashboardAlerts}>
                          Clear Alerts
                        </button>
                      </div>
                      
                      <div className="dashboard-alerts-list" ref={alertsContainerRef}>
                        {dashboardAlerts.length > 0 ? (
                          dashboardAlerts.map((alert, index) => (
                            <div key={index} className={`dashboard-alert-item severity-${alert.severity}`}>
                              <div className="dashboard-alert-timestamp">{alert.timestamp}</div>
                              <div className="dashboard-alert-type">{alert.type}</div>
                              <div className="dashboard-alert-message">{alert.message}</div>
                            </div>
                          ))
                        ) : (
                          <div className="no-alerts-message">No alerts at this time.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add Trip Form Modal */}
      {showForm && (
        <div className="trip-form-modal">
          <div className="trip-form">
            <div className="trip-form-header">
              <h2>Add New Trip</h2>
              <button className="trip-form-close" onClick={handleCancelClick}>&times;</button>
            </div>
            
            <div className="trip-form-body">
              <div className="form-group">
                <label className="form-label" htmlFor="scheduled_date_time">Trip Start Date/Time</label>
                <input
                  type="datetime-local"
                  id="scheduled_date_time"
                  name="scheduled_date_time"
                  className="form-control"
                  value={newTrip.scheduled_date_time}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="driverId">Driver</label>
                <select 
                  id="driverId"
                  name="driverId" 
                  className="form-control"
                  value={newTrip.driverId} 
                  onChange={handleInputChange}
                >
                  <option value="">Select Driver</option>
                  {driverData && driverData.map((driver) => (
                    <option key={driver._id} value={driver._id}>{driver.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="vehicleId">Vehicle</label>
                <select 
                  id="vehicleId"
                  name="vehicleId" 
                  className="form-control"
                  value={newTrip.vehicleId} 
                  onChange={handleInputChange}
                >
                  <option value="">Select Vehicle</option>
                  {tripVehicleData && tripVehicleData.map((vehicle) => (
                    <option key={vehicle._id} value={vehicle._id}>{vehicle.vehicleID}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="routeId">Route</label>
                <select 
                  id="routeId"
                  name="routeId" 
                  className="form-control"
                  value={newTrip.routeId} 
                  onChange={handleInputChange}
                >
                  <option value="">Select Route</option>
                  {routeData && routeData.map((route) => (
                    <option key={route._id} value={route._id}>{route.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="distance_threshold_KM">Distance Threshold (KM)</label>
                <input 
                  type="number" 
                  id="distance_threshold_KM"
                  name="distance_threshold_KM" 
                  className="form-control"
                  value={newTrip.distance_threshold_KM} 
                  onChange={handleInputChange} 
                  placeholder="Distance Threshold (KM)"
                  step="0.1"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="time_threshold">Time Threshold (Minutes)</label>
                <input 
                  type="number" 
                  id="time_threshold"
                  name="time_threshold" 
                  className="form-control"
                  value={newTrip.time_threshold} 
                  onChange={handleInputChange} 
                  placeholder="Time Threshold (Minutes)"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="alert_threshold">Alert Threshold (Minutes)</label>
                <input 
                  type="number" 
                  id="alert_threshold"
                  name="alert_threshold" 
                  className="form-control"
                  value={newTrip.alert_threshold} 
                  onChange={handleInputChange} 
                  placeholder="Alert Threshold (Minutes)"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label" htmlFor="info">Additional Information</label>
                <input 
                  type="text" 
                  id="info"
                  name="info" 
                  className="form-control"
                  value={newTrip.info} 
                  onChange={handleInputChange} 
                  placeholder="Additional information"
                />
              </div>
            </div>
            
            <div className="trip-form-footer">
              <button className="btn btn-outline" onClick={handleCancelClick}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveClick}>Save Trip</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Simulation Configuration Panel */}
      {showSimulationConfig && (
        <SimulationConfigPanel onClose={toggleSimulationConfig} />
      )}
    </div>
  );
};

export default Dashboard;