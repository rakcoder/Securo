import React, { useEffect, useState, useRef } from 'react';
import './ViewRoutes.css';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL;

// Helper function to validate coordinates
const isValidCoordinate = (coord) => {
  if (!coord || !Array.isArray(coord) || coord.length !== 2) return false;
  const [lat, lng] = coord;
  return typeof lat === 'number' && !isNaN(lat) && 
         typeof lng === 'number' && !isNaN(lng) &&
         lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

//this component will receive the route name from other component, it will fetch the route data from the server and display it on the map, also receive vehicle location
const ViewRoutes = ({ routeId, vehicleCoordinate, liveLocation }) => {
  const [map, setMap] = useState(null);
  const [routePointsArray, setRoutePointsArray] = useState([[0, 0]]);
  const [routeSelected, setRouteSelected] = useState(false);
  const [locationData, setLocationData] = useState([[0, 0]]);
  const [routeData, setRouteData] = useState(null);
  const [currentVehiclePushpin, setCurrentVehiclePushpin] = useState(null);
  const previousCoordinateRef = useRef(null);

  console.log("Route id: ", routeId);
  console.log("Vehicle coordinate: ", vehicleCoordinate);
  
  // Function to fetch route data from the API
  const fetchRouteData = async (routeId) => {
    // console.log("Route data requested")
    try {
      const response = await axios.get(`${apiUrl}/routedata/${routeId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching route data:', error);
    }
  };

  useEffect(() => {
    if (routeId) {
      fetchRouteData(routeId)
        .then((data) => {
          console.log("Route data: ", data);
          setRouteData(data);
          setLocationData(data.coords);
        })
        .catch(console.error);
      setRouteSelected(true);
    }
  }, [routeId]);


  window.loadMapModule = async () => {
    GetMap();
  }

  // Check if coordinates have actually changed
  const hasCoordinatesChanged = (prevCoord, newCoord) => {
    if (!prevCoord || !newCoord) return true;
    return prevCoord[0] !== newCoord[0] || prevCoord[1] !== newCoord[1];
  };

  // Re-render map when vehicle coordinates change
  useEffect(() => {
    if (locationData.length > 0 && vehicleCoordinate) {
      const coordinatesChanged = hasCoordinatesChanged(previousCoordinateRef.current, vehicleCoordinate);
      
      if (coordinatesChanged) {
        console.log("Updating vehicle position on map to:", vehicleCoordinate);
        updateVehiclePosition();
        previousCoordinateRef.current = [...vehicleCoordinate];
      }
    }
  }, [vehicleCoordinate, map]);

  useEffect(() => {
    if (locationData.length > 0) {
      GetMap();
    }
  }, [locationData]);

  // Function to update just the vehicle position without redrawing the entire map
  const updateVehiclePosition = () => {
    if (!map || !vehicleCoordinate) return;
    
    // Validate vehicle coordinates before creating the location
    if (!isValidCoordinate(vehicleCoordinate)) {
      console.error("Invalid vehicle coordinates:", vehicleCoordinate);
      return;
    }
    
    try {
      // Remove existing vehicle pushpin if it exists
      if (currentVehiclePushpin) {
        map.entities.remove(currentVehiclePushpin);
      }
      
      // Create new vehicle pushpin
      const vehicleLocation = new window.Microsoft.Maps.Location(vehicleCoordinate[0], vehicleCoordinate[1]);
      const newVehiclePushpin = new window.Microsoft.Maps.Pushpin(vehicleLocation, {
        color: 'blue',
        text: 'V',
      });
      
      // Add to map and store reference
      map.entities.push(newVehiclePushpin);
      setCurrentVehiclePushpin(newVehiclePushpin);
      
      // Center the map on the new position with smooth animation
      map.setView({ 
        center: vehicleLocation, 
        animate: true,
        zoom: map.getZoom() 
      });
      
      console.log("Vehicle position updated successfully");
    } catch (error) {
      console.error("Error updating vehicle position:", error);
    }
  };

  const GetMap = () => {
    if (locationData && locationData.length === 0) {
      console.warn('Route data is empty');
      return;
    }
    
    // Filter out invalid coordinates
    const validLocationData = locationData.filter(isValidCoordinate);
    
    if (validLocationData.length === 0) {
      console.error('No valid coordinates found in route data');
      return;
    }
    
    try {
      const locations = validLocationData.map(location => 
        new window.Microsoft.Maps.Location(location[0], location[1])
      );
      
      let mapOptions = {};
      if (!liveLocation) {
        mapOptions.center = locations[0];
      }

      let _map = new window.Microsoft.Maps.Map(document.getElementById('myMapView'), mapOptions)
      setMap(_map)

      const line = new window.Microsoft.Maps.Polyline(locations, {
        strokeColor: 'blue',
        strokeThickness: 3,
      });

      _map.entities.push(line);

      const startOptions = {
        color: 'green',
        text: 'S',
      };

      const endOptions = {
        color: 'red',
        text: 'E',
      };

      if (vehicleCoordinate && isValidCoordinate(vehicleCoordinate)) {
        const vehicleLocation = new window.Microsoft.Maps.Location(vehicleCoordinate[0], vehicleCoordinate[1]);
        const vehiclePushpin = new window.Microsoft.Maps.Pushpin(vehicleLocation, {
          color: 'blue',
          text: 'V',
        });
        _map.entities.push(vehiclePushpin);
        setCurrentVehiclePushpin(vehiclePushpin);
      }

      const startPushpin = new window.Microsoft.Maps.Pushpin(locations[0], startOptions);
      const endPushpin = new window.Microsoft.Maps.Pushpin(locations[locations.length - 1], endOptions);

      _map.entities.push(startPushpin);
      _map.entities.push(endPushpin);

      // Set zoom to fit the route
      if (locations.length > 1) {
        const bounds = window.Microsoft.Maps.LocationRect.fromLocations(locations);
        _map.setView({ bounds: bounds, padding: 50 });
      }
    } catch (error) {
      console.error('Error creating map:', error);
    }
  }

  return (
    <div id="myMapView" />
  );
};

export default ViewRoutes;