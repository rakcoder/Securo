import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import randomColor from 'randomcolor';
import "./FleetManagement.css";
import Headers from "./Navbar";
import ViewRoute from "./ViewRoute";

const apiUrl = process.env.REACT_APP_API_URL;

const FleetManagement = () => {
  const navigate = useNavigate();
  
  // Active tab state
  const [activeTab, setActiveTab] = useState('routes');
  
  // Routes state
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  
  // Vehicles state
  const [vehicleData, setVehicleData] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleCoordinate, setVehicleCoordinate] = useState(null);
  const [showAllVehicles, setShowAllVehicles] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [updateVehicleForm, setUpdateVehicleForm] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ 
    vehicleID: '', 
    max_load: '', 
    last_location: [], 
    last_location_date_time: '', 
    info: '' 
  });
  
  // Driver state
  const [driverData, setDriverData] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [updateDriverForm, setUpdateDriverForm] = useState(false);
  const [newDriver, setNewDriver] = useState({ 
    driverID: '', 
    name: '', 
    mobile: '', 
    info: '' 
  });
  
  // Map state
  const [map, setMap] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchRoutes().then(setRoutes);
    fetchVehicleData();
    fetchDriverData();
  }, []);

  // Load Bing Maps script if not already loaded
  useEffect(() => {
    const loadScript = () => {
      if (window.Microsoft && window.Microsoft.Maps) {
        return; // Script already loaded
      }
      let script = document.createElement("script");
      script.setAttribute("src", `https://www.bing.com/api/maps/mapcontrol?callback=loadMapModule&key=AhP_cuxI2i6AcohWfJLGvOobPxKH11eEfo0TeTDqcQ4PvapLEThf_FQ5OaMgAu-l`);
      document.body.appendChild(script);
    };
    loadScript();
  }, []);

  // Handle form animations
  useEffect(() => {
    const vehicleForm = document.querySelector('.vehicleForm');
    if (vehicleForm) {
      vehicleForm.style.transform = showVehicleForm ? 'translateY(0)' : 'translateY(100%)';
    }
    
    const driverForm = document.querySelector('.driverForm');
    if (driverForm) {
      driverForm.style.transform = showDriverForm ? 'translateY(0)' : 'translateY(100%)';
    }
  }, [showVehicleForm, showDriverForm]);

  // Map initialization callback
  window.loadMapModule = () => {
    if (activeTab === 'routes' && selectedRoute) {
      initializeMap();
    } else if (activeTab === 'vehicles' && (selectedVehicle || showAllVehicles)) {
      initializeVehicleMap();
    }
  };

  // Initialize route map
  const initializeMap = () => {
    if (!window.Microsoft || !window.Microsoft.Maps) return;
    
    if (selectedRoute) {
      // This will be handled by the ViewRoute component
    }
  };

  // Initialize vehicle map
  const initializeVehicleMap = () => {
    if (!window.Microsoft || !window.Microsoft.Maps || !vehicleData) return;
    
    let _map = new window.Microsoft.Maps.Map(document.getElementById('vehicleMapContainer'), {});
    setMap(_map);

    if (showAllVehicles) {
      vehicleData.forEach((vehicle) => {
        if (vehicle.last_location && vehicle.last_location.length > 0) {
          const vehicleLocation = new window.Microsoft.Maps.Location(vehicle.last_location[0], vehicle.last_location[1]);
          const vehiclePushpin = new window.Microsoft.Maps.Pushpin(vehicleLocation, { 
            title: vehicle.vehicleID, 
            color: randomColor() 
          });
          _map.entities.push(vehiclePushpin);
        }
      });
    } else if (selectedVehicle && selectedVehicle.last_location && selectedVehicle.last_location.length > 0) {
      const vehicleLocation = new window.Microsoft.Maps.Location(
        selectedVehicle.last_location[0], 
        selectedVehicle.last_location[1]
      );
      const vehiclePushpin = new window.Microsoft.Maps.Pushpin(vehicleLocation, { 
        title: selectedVehicle.vehicleID 
      });
      _map.entities.push(vehiclePushpin);
      _map.setView({ center: vehicleLocation, zoom: 12 });
    }
  };

  // Update maps when selection changes
  useEffect(() => {
    if (activeTab === 'vehicles' && (selectedVehicle || showAllVehicles)) {
      initializeVehicleMap();
    }
  }, [selectedVehicle, showAllVehicles, activeTab]);

  // Data fetching functions
  const fetchRoutes = async () => {
    try {
      const response = await axios.get(`${apiUrl}/routenames`, { withCredentials: true });
      return response.data;
    } catch (error) {
      console.error("Error fetching route names:", error);
      return [];
    }
  };

  const fetchVehicleData = async () => {
    try {
      const response = await axios.get(`${apiUrl}/vehicledata`, { withCredentials: true });
      setVehicleData(response.data);
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
      return response.data;
    } catch (error) {
      console.error('Error fetching driver data:', error);
      return [];
    }
  };

  // Helper functions
  const convertToHoursAndMinutes = (time) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    return `${hours > 0 ? hours + " hours " : ""}${minutes > 0 ? minutes + " minutes " : ""}`;
  };

  const formatDateTime = (date_time) => {
    if (date_time) {
      const date = new Date(date_time);
      return date.toLocaleString();
    }
    return "No details available";
  };

  // Route event handlers
  const handleRouteClick = (route) => {
    setSelectedRoute(route);
  };

  // Vehicle event handlers
  const handleVehicleClick = (vehicle) => {
    setSelectedVehicle(vehicle);
    setVehicleCoordinate(vehicle.last_location);
    setShowAllVehicles(false);
  };

  const handleAddVehicleClick = () => {
    setShowVehicleForm(true);
    setUpdateVehicleForm(false);
    setNewVehicle({ vehicleID: '', max_load: '', last_location: [], last_location_date_time: '', info: '' });
  };

  const handleVehicleInputChange = (event) => {
    setNewVehicle({ ...newVehicle, [event.target.name]: event.target.value });
  };

  const handleSaveVehicleClick = async () => {
    if (!newVehicle.vehicleID || !newVehicle.max_load) {
      alert('Vehicle ID and Max Load cannot be empty');
      return;
    }
    try {
      if (updateVehicleForm) {
        await axios.post(`${apiUrl}/updateVehicle`, newVehicle, { withCredentials: true });
      } else {
        await axios.post(`${apiUrl}/addVehicle`, newVehicle, { withCredentials: true });
      }
      await fetchVehicleData();
      setShowVehicleForm(false);
      setUpdateVehicleForm(false);
      setNewVehicle({ vehicleID: '', max_load: '', last_location: [], last_location_date_time: '', info: '' });
    } catch (error) {
      if (error.response && error.response.status === 400) {
        alert('Vehicle already exists');
      }
      console.error('Error adding/updating vehicle', error);
    }
  };

  const handleUpdateVehicleClick = (vehicle) => {
    setNewVehicle({ 
      _id: vehicle._id, 
      vehicleID: vehicle.vehicleID, 
      max_load: vehicle.max_load, 
      info: vehicle.info 
    });
    setUpdateVehicleForm(true);
    setShowVehicleForm(true);
  };

  const handleDeleteVehicleClick = (vehicleId) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      deleteVehicle(vehicleId);
    }
  };

  const deleteVehicle = async (vehicleId) => {
    try {
      await axios.post(`${apiUrl}/deleteVehicle`, { vehicleId }, { withCredentials: true });
      await fetchVehicleData();
      setSelectedVehicle(null);
    } catch (error) {
      console.error('Error deleting vehicle:', error);
    }
  };

  // Driver event handlers
  const handleDriverClick = (driver) => {
    setSelectedDriver(driver);
  };

  const handleAddDriverClick = () => {
    setShowDriverForm(true);
    setUpdateDriverForm(false);
    setNewDriver({ driverID: '', name: '', mobile: '', info: '' });
  };

  const handleDriverInputChange = (event) => {
    setNewDriver({ ...newDriver, [event.target.name]: event.target.value });
  };

  const handleSaveDriverClick = async () => {
    if (!newDriver.driverID || !newDriver.name || !newDriver.mobile) {
      alert('Driver ID, Name, and Mobile cannot be empty');
      return;
    }
    try {
      if (updateDriverForm) {
        await axios.post(`${apiUrl}/updateDriver`, newDriver, { withCredentials: true });
      } else {
        await axios.post(`${apiUrl}/addDriver`, newDriver, { withCredentials: true });
      }
      await fetchDriverData();
      setShowDriverForm(false);
      setUpdateDriverForm(false);
      setNewDriver({ driverID: '', name: '', mobile: '', info: '' });
    } catch (error) {
      if (error.response && error.response.status === 400) {
        alert('Driver already exists');
      }
      console.error('Error adding/updating driver', error);
    }
  };

  const handleUpdateDriverClick = (driver) => {
    setNewDriver({ 
      driverID: driver.driverID, 
      name: driver.name, 
      mobile: driver.mobileNumber, 
      info: driver.info 
    });
    setUpdateDriverForm(true);
    setShowDriverForm(true);
  };

  const handleDeleteDriverClick = (driverId) => {
    if (window.confirm('Are you sure you want to delete this driver?')) {
      deleteDriver(driverId);
    }
  };

  const deleteDriver = async (driverId) => {
    try {
      await axios.post(`${apiUrl}/deleteDriver`, { driverID: driverId }, { withCredentials: true });
      await fetchDriverData();
      setSelectedDriver(null);
    } catch (error) {
      console.error('Error deleting driver:', error);
    }
  };

  // Cancel form handlers
  const handleCancelVehicleClick = () => {
    setShowVehicleForm(false);
    setUpdateVehicleForm(false);
    setNewVehicle({ vehicleID: '', max_load: '', last_location: [], last_location_date_time: '', info: '' });
  };

  const handleCancelDriverClick = () => {
    setShowDriverForm(false);
    setUpdateDriverForm(false);
    setNewDriver({ driverID: '', name: '', mobile: '', info: '' });
  };

  return (
    <>
      <Headers />
      <div className="fleetManagement">
        <div className="tabsContainer">
          <div 
            className={`tab ${activeTab === 'routes' ? 'activeTab' : ''}`}
            onClick={() => setActiveTab('routes')}
          >
            Routes
          </div>
          <div 
            className={`tab ${activeTab === 'vehicles' ? 'activeTab' : ''}`}
            onClick={() => setActiveTab('vehicles')}
          >
            Vehicles
          </div>
          <div 
            className={`tab ${activeTab === 'drivers' ? 'activeTab' : ''}`}
            onClick={() => setActiveTab('drivers')}
          >
            Drivers
          </div>
        </div>

        <div className="contentContainer">
          {/* ROUTES TAB */}
          {activeTab === 'routes' && (
            <div className="routesTab">
              <div className="routesContainer">
                <h2>Routes</h2>
                <div className="routeList">
                  {routes && routes.map((route) => (
                    <div 
                      key={route.name} 
                      className={`routeItem ${selectedRoute && selectedRoute.name === route.name ? 'selected' : ''}`} 
                      onClick={() => handleRouteClick(route)}
                    >
                      <span className="routeName">{route.name}</span>
                      {selectedRoute && selectedRoute.name === route.name && (
                        <div className="routeDetails">
                          <p><strong>Distance:</strong> {route.distance} km</p>
                          <p><strong>Estimated Time:</strong> {convertToHoursAndMinutes(route.estimatedTime)}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="routeButtons">
                  <button id="addRoute" onClick={() => navigate('/AddRoute')}>Add Route</button>
                </div>
              </div>

              <div className="viewMapContainer">
                {selectedRoute && <ViewRoute routeId={selectedRoute._id} />}
              </div>
            </div>
          )}

          {/* VEHICLES TAB */}
          {activeTab === 'vehicles' && (
            <div className="vehiclesTab">
              <div className="vehicleDataContainer">
                <h2>Vehicle Data</h2>
                <div className="vehicleList">
                  {vehicleData && vehicleData.map((vehicle) => (
                    vehicle && (
                      <div 
                        key={vehicle.vehicleID} 
                        className={`vehicleItem ${selectedVehicle && selectedVehicle.vehicleID === vehicle.vehicleID ? 'selected' : ''}`} 
                        onClick={() => handleVehicleClick(vehicle)}
                      >
                        <span className="vehicleName">{vehicle.vehicleID}</span>
                        {selectedVehicle && selectedVehicle.vehicleID === vehicle.vehicleID && (
                          <div className="vehicleDetails">
                            <p><strong>Location:</strong> {vehicle.last_location && vehicle.last_location.length > 0 ? `${vehicle.last_location[0]}, ${vehicle.last_location[1]}` : 'No details available'}</p>
                            <p><strong>Max load:</strong> {vehicle.max_load}</p>
                            <p><strong>Extra info:</strong> {vehicle.info} </p>
                            <p><strong>Last Location Date and Time:</strong> {formatDateTime(vehicle.last_location_date_time)}</p>
                            <p><strong>Password:</strong> {vehicle.password}</p>
                            <p>
                              <button onClick={() => handleUpdateVehicleClick(vehicle)}>Edit</button>
                              <button onClick={() => handleDeleteVehicleClick(vehicle._id)}>Delete</button>
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  ))}
                </div>
                <div className="buttonsContainer">
                  <button id='showAllBtn' onClick={() => setShowAllVehicles(!showAllVehicles)}>
                    {showAllVehicles ? 'Hide All' : 'Show All'}
                  </button>
                  <button id='addVehicleBtn' onClick={handleAddVehicleClick}>Add Vehicle</button>
                </div>
                {showVehicleForm && (
                  <div className="vehicleForm">
                    <input 
                      name="vehicleID" 
                      value={newVehicle.vehicleID} 
                      onChange={handleVehicleInputChange} 
                      placeholder="Vehicle ID" 
                    />
                    <input 
                      name="max_load" 
                      value={newVehicle.max_load} 
                      onChange={handleVehicleInputChange} 
                      placeholder="Max Load" 
                    />
                    <input 
                      name="info" 
                      value={newVehicle.info} 
                      onChange={handleVehicleInputChange} 
                      placeholder="Extra info" 
                    />
                    <button onClick={handleSaveVehicleClick} className="saveButton">Save</button>
                    <button onClick={handleCancelVehicleClick} className="cancelButton">Cancel</button>
                  </div>
                )}
              </div>
              <div className="vehicleDataMapContainer">
                <div id="vehicleMapContainer" />
              </div>
            </div>
          )}

          {/* DRIVERS TAB */}
          {activeTab === 'drivers' && (
            <div className="driversTab">
              <div className="driverDataContainer">
                <h2>Driver Data</h2>
                <div className="driverList">
                  {driverData && driverData.map((driver, index) => (
                    <div 
                      key={index} 
                      className={`driverItem ${selectedDriver && selectedDriver.name === driver.name ? 'selected' : ''}`} 
                      onClick={() => handleDriverClick(driver)}
                    >
                      <span className="driverName">{driver.name}</span>
                      {selectedDriver && selectedDriver.name === driver.name && (
                        <div className="driverDetails">
                          <p><strong>Driver ID:</strong> {driver.driverID}</p>
                          <p><strong>Mobile:</strong> {driver.mobileNumber}</p>
                          <p><strong>Extra info:</strong> {driver.info}</p>
                          <p><strong>Password:</strong> {driver.password}</p>
                          <p>
                            <button onClick={() => handleUpdateDriverClick(driver)}>Edit</button>
                            <button onClick={() => handleDeleteDriverClick(driver.driverID)}>Delete</button>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="buttonsContainer">
                  <button id="addDriverBtn" onClick={handleAddDriverClick}>Add Driver</button>
                </div>
                {showDriverForm && (
                  <div className="driverForm">
                    <input 
                      name="driverID" 
                      value={newDriver.driverID} 
                      onChange={handleDriverInputChange} 
                      placeholder="Driver ID" 
                    />
                    <input 
                      name="name" 
                      value={newDriver.name} 
                      onChange={handleDriverInputChange} 
                      placeholder="Driver Name" 
                    />
                    <input 
                      name="mobile" 
                      value={newDriver.mobile} 
                      onChange={handleDriverInputChange} 
                      placeholder="Mobile Number" 
                    />
                    <input 
                      name="info" 
                      value={newDriver.info} 
                      onChange={handleDriverInputChange} 
                      placeholder="Extra info" 
                    />
                    <button onClick={handleSaveDriverClick} className="saveButton">Save</button>
                    <button onClick={handleCancelDriverClick} className="cancelButton">Cancel</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FleetManagement;