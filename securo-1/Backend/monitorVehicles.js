const Vehicle = require('./models/vehicle.js');
const User = require('./models/user.js');
const Trip = require('./models/trip.js');
const Route = require('./models/route.js');
const sendEmail = require('./sendMail');
const minimumDistanceInKm = require('./geofencing.js');

// Keep track of recent logins to avoid immediate alerts
const recentLogins = new Map(); // Maps userID to login time
const LOGIN_GRACE_PERIOD = 10 * 1000; // Reduced to 10 seconds for quicker testing (from 3 minutes)
const ENABLE_GRACE_PERIOD = false; // Set to false to disable the login grace period completely

// Keep track of vehicle positions for drift detection
const vehiclePositions = new Map(); // Maps vehicleID to last processed position

const updateIndex = async (tripId, new_index) => {
    try {
        await Trip.findOneAndUpdate(
            { tripId: tripId },
            { last_route_point_index: new_index },
            { new: true }
        );
        console.log('Saved!');
    } catch (error) {
        console.error(`Error updating trip index: ${error.message}`);
        // Continue execution even if this fails
    }
}

// Register user login to prevent immediate alerts
const registerUserLogin = (userId) => {
    if (ENABLE_GRACE_PERIOD) {
        recentLogins.set(userId, new Date().getTime());
        console.log(`User ${userId} login registered for alert grace period`);
    } else {
        console.log(`Login grace period disabled, not registering login for user ${userId}`);
    }
};

const monitorVehicles = async (recentAlerts) => {
    // iterates through all the vehicles and checks if the update time is exceeding the threshold
    // under the specified user
    const currentTime = new Date().getTime();
    console.log("=== Starting Vehicle Monitoring Cycle ===");
    
    try {
        const trips = await Trip.find({ tripStatus: { $eq: 'RUNNING' } }).select('_id tripId routeName vehicleId userID time_threshold distance_threshold_KM alert_threshold routeId last_route_point_index driverId info');
        console.log(`Found ${trips.length} running trips to monitor`);
        
        for(const trip of trips){
            try {
                await processTripMonitoring(trip, currentTime, recentAlerts);
            } catch (tripError) {
                console.error(`Error processing trip ${trip.tripId || trip._id}: ${tripError.message}`);
                // Continue with next trip
            }
        }
    } catch (error) {
        console.error(`Error in monitoring vehicles: ${error.message}`);
        // Don't rethrow the error to prevent crashes
    }
}

// Separate function to process each trip for better error handling
async function processTripMonitoring(trip, currentTime, recentAlerts) {
    let vehicle;
    try {
        vehicle = await Vehicle.findOne({ _id: trip.vehicleId });
    } catch (error) {
        console.error(`Database error finding vehicle: ${error.message}`);
        return; // Skip this trip
    }
    
    const t_threshold = trip.time_threshold;
    const d_threshold = trip.distance_threshold_KM;
    const a_threshold = trip.alert_threshold;
    
    if (!vehicle) {
        console.log(`Vehicle not found for trip ID: ${trip._id}`);
        return;
    }

    console.log(`\nChecking Trip ${trip.tripId} with Vehicle ${vehicle.vehicleID || 'Unknown'}`);
    console.log(`Thresholds: Distance=${d_threshold}KM, Time=${t_threshold}ms, Alert=${a_threshold}ms`);

    // Check if user recently logged in (within grace period)
    const userLoginTime = recentLogins.get(trip.userID);
    const isRecentLogin = ENABLE_GRACE_PERIOD && userLoginTime && (currentTime - userLoginTime < LOGIN_GRACE_PERIOD);
    if (isRecentLogin) {
        console.log(`User ${trip.userID} recently logged in, in grace period (${Math.round((currentTime - userLoginTime)/1000)}s / ${Math.round(LOGIN_GRACE_PERIOD/1000)}s)`);
    }
    
    // Check if simulation is running for this trip - check by all possible ID formats
    const isSimulationRunningById = global.runningSimulations && global.runningSimulations[trip._id];
    const isSimulationRunningByStringId = global.runningSimulations && global.runningSimulations[trip._id.toString()];
    const isSimulationRunningByTripId = global.runningSimulations && global.runningSimulations[trip.tripId];
    const isSimulationRunning = isSimulationRunningById || isSimulationRunningByStringId || isSimulationRunningByTripId;
    
    // Debug the simulation status
    console.log(`Vehicle ${vehicle.vehicleID} Trip ${trip.tripId} (${trip._id}): Running simulation: ${isSimulationRunning ? 'YES' : 'NO'}`);

    // If no simulation is running, skip all alert processing for this vehicle
    if (!isSimulationRunning) {
        console.log(`No active simulation for vehicle ${vehicle.vehicleID} - skipping alerts`);
        return;
    }
    
    const location = vehicle.last_location;
    
    // Skip geofence checks if no valid location
    if (!location || !Array.isArray(location) || location.length !== 2) {
        console.log(`Skipping geofence check for vehicle ${vehicle.vehicleID} - invalid location`);
        return;
    }
    
    // Log position drift for debugging
    const lastPos = vehiclePositions.get(vehicle.vehicleID);
    if (lastPos) {
        const [lastLat, lastLng] = lastPos;
        const [newLat, newLng] = location;
        const latDiff = Math.abs(newLat - lastLat);
        const lngDiff = Math.abs(newLng - lastLng);
        console.log(`Vehicle position change: Lat Δ${latDiff.toFixed(6)}, Lng Δ${lngDiff.toFixed(6)}`);
    }
    
    // Store current position for next comparison
    vehiclePositions.set(vehicle.vehicleID, [...location]);
    
    const last_index = trip.last_route_point_index || 0;
    let routeData;
    
    try {
        routeData = await Route.findOne({ _id: trip.routeId });
        console.log(`Route data loaded for trip ${trip.tripId}: ${routeData ? 'Success' : 'Failed'}`);
    } catch (error) {
        console.error(`Failed to load route data for trip ${trip.tripId}: ${error.message}`);
        return;
    }
    
    // Skip checks if route data is invalid
    if (!routeData || !routeData.coords || routeData.coords.length === 0) {
        console.log(`Skipping geofence check for vehicle ${vehicle.vehicleID} - invalid route data`);
        return;
    }
    
    console.log(`Starting geofence check for vehicle ${vehicle.vehicleID} at route index ${last_index} of ${routeData.coords.length} points`);
    
    // Perform the geofence check
    let isValid, new_index;
    try {
        [isValid, new_index] = await minimumDistanceInKm(location, last_index, routeData.coords, d_threshold);
        await updateIndex(trip.tripId, new_index);
    } catch (error) {
        console.error(`Error in geofence check: ${error.message}`);
        return;
    }

    // Prepare trip details for alert context
    const tripDetails = {
        tripId: trip.tripId,
        routeName: trip.routeName,
        driverId: trip.driverId,
        info: trip.info,
        thresholds: {
            time: t_threshold,
            distance: d_threshold,
            alert: a_threshold
        }
    };

    if (recentAlerts.get(vehicle.vehicleID) === undefined) {
        recentAlerts.set(vehicle.vehicleID, currentTime - a_threshold - 1);
        console.log(`Initialized alert tracking for vehicle ${vehicle.vehicleID}`);
        return;
    }

    // For debugging: Check if this vehicle has already been alerted recently
    const lastAlertTime = recentAlerts.get(vehicle.vehicleID);
    const timeSinceLastAlert = currentTime - lastAlertTime;
    const canSendNewAlert = timeSinceLastAlert > a_threshold;
    
    console.log(`Last alert was ${Math.floor(timeSinceLastAlert/1000)} seconds ago (threshold: ${Math.floor(a_threshold/1000)}s). Can send new alert: ${canSendNewAlert ? 'YES' : 'NO'}`);

    // Only proceed with alert if the vehicle has not been alerted recently
    if (canSendNewAlert) {
        // Geofence alerts - vehicle is outside route threshold
        if (!isValid) {
            console.log(`!!! Vehicle ${vehicle.vehicleID} IS OUTSIDE geofence threshold !!!`);
            
            // Update the recent alerts time to prevent alert flooding
            recentAlerts.set(vehicle.vehicleID, currentTime);
            
            // Only send alerts if not in login grace period (to avoid immediate alerts at login)
            if (isRecentLogin) {
                console.log(`Skipping geofence alert for vehicle ${vehicle.vehicleID} - within login grace period`);
            } else {
                // Simulation is running and we're outside the threshold - send an alert!
                try {
                    const email = await User.findOne({ googleId: trip.userID }).select('email');
                    if (email && email.email) {
                        await sendAlert(vehicle, email, "geofence_alert", tripDetails);
                    } else {
                        console.error(`Cannot send alert: No email found for user ${trip.userID}`);
                    }
                } catch (err) {
                    console.error(`Error sending geofence alert: ${err.message}`);
                }
            }
        } else {
            console.log(`Vehicle ${vehicle.vehicleID} is within geofence threshold`);
        }
        
        // Time threshold alerts - only send if significant time has passed since last location update
        if (currentTime - vehicle.last_location_date_time > t_threshold) {
            console.log(`!!! Vehicle ${vehicle.vehicleID} HAS NOT UPDATED location for too long !!!`);
            
            // Only send time alerts if not in login grace period
            if (isRecentLogin) {
                console.log(`Skipping time alert for vehicle ${vehicle.vehicleID} - within login grace period`);
            } else {
                try {
                    const email = await User.findOne({ googleId: trip.userID }).select('email');
                    if (email && email.email) {
                        await sendAlert(vehicle, email, "time_alert", tripDetails);
                        recentAlerts.set(vehicle.vehicleID, currentTime);
                    } else {
                        console.error(`Cannot send time alert: No email found for user ${trip.userID}`);
                    }
                } catch (err) {
                    console.error(`Error sending time alert: ${err.message}`);
                }
            }
        }
        
        // Destination alerts - only check if near end of route
        if (new_index >= routeData.coords.length - 5) {
            console.log(`!!! Vehicle ${vehicle.vehicleID} IS APPROACHING destination !!!`);
            
            // Only send destination alerts if not in login grace period
            if (isRecentLogin) {
                console.log(`Skipping destination alert for vehicle ${vehicle.vehicleID} - within login grace period`);
            } else {
                try {
                    const email = await User.findOne({ googleId: trip.userID }).select('email');
                    if (email && email.email) {
                        await sendAlert(vehicle, email, "trip_alert", tripDetails);
                        recentAlerts.set(vehicle.vehicleID, currentTime);
                    } else {
                        console.error(`Cannot send destination alert: No email found for user ${trip.userID}`);
                    }
                } catch (err) {
                    console.error(`Error sending destination alert: ${err.message}`);
                }
            }
        }
    }
}

const sendAlert = async (vehicle, email, Type, tripDetails = null) => {
    // sends an alert to the user that the vehicle has not been updated for a long time
    try {
        console.log(`Attempting to send ${Type} alert to ${email.email} for vehicle ${vehicle.vehicleID}`);
        await sendEmail(vehicle.userID, vehicle.vehicleID, email.email, Type, tripDetails);
        console.log(`Alert sent successfully to ${email.email} about vehicle ${vehicle.vehicleID} | Type -> ${Type}`);
        return true;
    } catch (error) {
        console.error(`Failed to send email alert: ${error.message}`);
        return false;
    }
}

module.exports = { monitorVehicles, registerUserLogin };