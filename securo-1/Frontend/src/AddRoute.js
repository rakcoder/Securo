import './AddRoute.css';
import React, { useEffect, useState, useRef } from 'react';
import Headers from './Navbar';


const apiUrl = process.env.REACT_APP_API_URL;
const loadScript = () => {
  let script = document.createElement("script");
  script.setAttribute("src", `https://www.bing.com/api/maps/mapcontrol?callback=loadMapModule&key=AhP_cuxI2i6AcohWfJLGvOobPxKH11eEfo0TeTDqcQ4PvapLEThf_FQ5OaMgAu-l`);
  document.body.appendChild(script);
}

const AddRoute = () => {
  const [map, setMap] = useState(null);
  const [showDirections, setShowDirections] = useState(true);
  const [routePointsArray, setRoutePointsArray] = useState([[0, 0]]);
  const [routeSelected, setRouteSelected] = useState(false);
  const [routeEstimatedTime, setRouteEstimatedTime] = useState(null);
  const [routeDistance, setRouteDistance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState({
    startLocation: '',
    endLocation: '',
    time: '',
    distance: ''
  });
  
  const directionsRef = useRef(null);
  let directionsManager;

  useEffect(() => {
    loadScript();
    
    // Check window size for responsive behavior
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setShowDirections(false);
      } else {
        setShowDirections(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  window.loadMapModule = async () => {
    GetMap();
  }

  const GetMap = () => {
    let _map = new window.Microsoft.Maps.Map('#myMap', {
      mapTypeId: window.Microsoft.Maps.MapTypeId.road,
      zoom: 5
    });
    setMap(_map);
    
    // Load the directions module.
    window.Microsoft.Maps.loadModule(['Microsoft.Maps.Directions', 'Microsoft.Maps.Search'], () => {
      //Create an instance of the directions manager.
      directionsManager = new window.Microsoft.Maps.Directions.DirectionsManager(_map);

      //Specify where to display the route instructions.
      directionsManager.setRenderOptions({ 
        itineraryContainer: '#directionsItinerary',
        firstWaypointPushpinOptions: {
          color: '#4A6FFF'
        },
        lastWaypointPushpinOptions: {
          color: '#6C63FF'
        },
        waypointPushpinOptions: {
          color: '#2a2a2a'
        }
      });

      //Specify the where to display the input panel
      directionsManager.showInputPanel('directionsPanel');

      // Add event handler for directions updated event.
      window.Microsoft.Maps.Events.addHandler(directionsManager, 'directionsUpdated', function (e) {
        try {
          const routePath = e.route[0].routePath;
          const time = e.route[0].routeLegs[0].summary.time;
          setRouteEstimatedTime(time);
          const distance = e.route[0].routeLegs[0].summary.distance;
          setRouteDistance(distance);
          
          const routePoints = [];
          for (var i = 0; i < routePath.length; i++) {
            routePoints.push([routePath[i].latitude, routePath[i].longitude]);
          }
          setRoutePointsArray(routePoints);
          
          if (routePoints.length > 0) {
            setRouteSelected(true);
            
            // Get start and end locations
            updateRouteInfo(routePoints, time, distance);
          }
        } catch (error) {
          console.error("Error processing route data:", error);
        }
      });
    });
  }

  // Add new function to update route info separately
  const updateRouteInfo = async (routePoints, time, distance) => {
    try {
      const startLoc = await getName(routePoints[0][0], routePoints[0][1]);
      const endLoc = await getName(routePoints[routePoints.length - 1][0], routePoints[routePoints.length - 1][1]);
      
      if (startLoc && endLoc) {
        setRouteInfo({
          startLocation: `${startLoc.city || 'Unknown'}, ${startLoc.state || ''}`,
          endLocation: `${endLoc.city || 'Unknown'}, ${endLoc.state || ''}`,
          time: formatTime(time),
          distance: `${distance.toFixed(1)} km`
        });
      }
    } catch (error) {
      console.error("Error updating route info:", error);
    }
  }

  const formatTime = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hrs}h ${mins}m`;
  }

  const toggleDirectionsPanel = () => {
    setShowDirections(!showDirections);
  }

  const SaveRoutePoints = async () => {
    try {
      setLoading(true);
      const startingPoint = await getName(routePointsArray[0][0], routePointsArray[0][1]);
      const endingPoint = await getName(routePointsArray[routePointsArray.length - 1][0], routePointsArray[routePointsArray.length - 1][1]);

      const data = {
        "name": startingPoint.city + "_" + startingPoint.state + "_" + startingPoint.zipCode + "_to_" + endingPoint.city + "_" + endingPoint.state + "_" + endingPoint.zipCode,
        "coords": routePointsArray,
        "estimatedTime": routeEstimatedTime,
        "distance": routeDistance
      }

      const response = await fetch(`${apiUrl}/addRoute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      const responseData = await response.json();
      console.log(responseData);
      alert("Route points saved successfully");
      //redirect to dashboard
      window.location.href = "/ViewRoutes";

    } catch (error) {
      console.error(error);
      alert("Error saving route. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const getNamePromise = async (latitude, longitude) => {
    let searchManager = new window.Microsoft.Maps.Search.SearchManager(map);
    let requestOptions = {
      location: new window.Microsoft.Maps.Location(latitude, longitude)
    };

    return new Promise((resolve, reject) => {
      requestOptions.callback = function (answer, userData) {
        let city = answer.address.locality;
        let state = answer.address.adminDistrict;
        let zipCode = answer.address.postalCode;
        resolve({ city, state, zipCode });
      };
      requestOptions.errorCallback = function (e) {
        reject(e);
      };
      searchManager.reverseGeocode(requestOptions);
    });
  };

  const getName = async (latitude, longitude) => {
    const loc = await getNamePromise(latitude, longitude).then(location => {
      return location
    }).catch(error => console.log(error));
    return loc
  }

  return (
    <>
      <div className="dashNavbar">
        <Headers />
      </div>
      <div className="container">
        <div className={`directionsContainer ${showDirections ? 'active' : ''}`} ref={directionsRef}>
          <div id="directionsPanel"></div>
          <div id="directionsItinerary"></div>
        </div>
        
        <div className='map'>
          <div id="myMap"></div>
        </div>
      </div>
      
      <button 
        className="toggle-directions" 
        onClick={toggleDirectionsPanel}
        aria-label="Toggle directions panel"
      >
        {showDirections ? '✕' : '≡'}
      </button>
      
      {routeSelected && (
        <button 
          id="saveButton" 
          onClick={SaveRoutePoints}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Route'}
        </button>
      )}
    </>
  );
};

export default AddRoute;