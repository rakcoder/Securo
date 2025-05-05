const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const { connectToDb } = require('../connectToDb');
const { randomizeCoordByPercent } = require('../geocalcUtils');

// Configuration for simulation
const config = {
    interval: 250, // ms - reduced from 500ms to 250ms for smoother updates
    randomness: 0, // 0-100%
    chance: 1
};

// New endpoint to get current configuration
router.get('/config', async (req, res) => {
    return res.json({ config });
});

// New endpoint to update configuration
router.post('/config', async (req, res) => {
    const { interval, randomness, chance } = req.body;
    
    if (interval !== undefined) {
        // Validate interval (minimum 100ms, maximum 5000ms)
        config.interval = Math.max(100, Math.min(5000, parseInt(interval)));
    }
    
    if (randomness !== undefined) {
        // Validate randomness (0-100%)
        config.randomness = Math.max(0, Math.min(100, parseFloat(randomness)));
    }
    
    if (chance !== undefined) {
        // Validate chance (0-1)
        config.chance = Math.max(0, Math.min(1, parseFloat(chance)));
    }
    
    return res.json({ 
        status: 'success', 
        message: 'Simulation configuration updated', 
        config 
    });
});

// Endpoint to run simulation for a specific trip
router.post('/run', async (req, res) => {
    const { tripId } = req.body;
    if (!tripId) {
        return res.status(400).json({ error: 'Trip ID is required' });
    }

    try {
        // Start simulation in the background
        runSimulation(tripId)
            .then(() => console.log(`Simulation for trip ${tripId} completed`))
            .catch(err => console.error(`Simulation error for trip ${tripId}:`, err));

        // Return success immediately (simulation runs in background)
        return res.json({ 
            status: 'success', 
            message: 'Simulation started successfully', 
            tripId 
        });
    } catch (error) {
        console.error('Error starting simulation:', error);
        return res.status(500).json({ error: 'Failed to start simulation' });
    }
});

// Route to get simulation status
router.get('/status/:tripId', async (req, res) => {
    const { tripId } = req.params;
    // Check if simulation is running for this trip
    const isRunning = global.runningSimulations && global.runningSimulations[tripId];
    return res.json({ 
        isRunning: !!isRunning,
        progress: isRunning ? isRunning.progress : 0,
        tripId
    });
});

// Route to stop simulation
router.post('/stop', async (req, res) => {
    const { tripId } = req.body;
    if (!tripId) {
        return res.status(400).json({ error: 'Trip ID is required' });
    }

    if (global.runningSimulations && global.runningSimulations[tripId]) {
        global.runningSimulations[tripId].shouldStop = true;
        return res.json({ status: 'success', message: 'Simulation stop requested', tripId });
    } else {
        return res.json({ status: 'warning', message: 'No simulation running for this trip', tripId });
    }
});

// Track running simulations globally
if (!global.runningSimulations) {
    global.runningSimulations = {};
}

// Track simulation logs globally
if (!global.simulationLogs) {
    global.simulationLogs = {};
}

// Add a new route to get simulation logs
router.get('/logs/:tripId', async (req, res) => {
    const { tripId } = req.params;
    const logs = global.simulationLogs[tripId] || [];
    return res.json({ logs });
});

// Function to add a log entry
function addSimulationLog(tripId, message) {
    if (!global.simulationLogs[tripId]) {
        global.simulationLogs[tripId] = [];
    }
    
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        message
    };
    
    global.simulationLogs[tripId].push(logEntry);
    // console.log(`[${timestamp}] ${message}`);

    
}

async function runSimulation(tripId) {
    let db;
    let coords;
    let vehicleId;

    try {
        db = await connectToDb();
        
        // Clear previous logs for this trip
        global.simulationLogs[tripId] = [];
        
        // Mark this simulation as running - store by both string ID and ObjectId
        global.runningSimulations[tripId] = {
            startTime: new Date(),
            progress: 0,
            shouldStop: false
        };

        addSimulationLog(tripId, `Starting simulation for trip ${tripId}`);

        // Find the trip
        const trip = await db.collection("trips").findOne(
            { _id: new ObjectId(tripId), tripStatus: "RUNNING" }
        );
        
        if (!trip) {
            addSimulationLog(tripId, `Trip ${tripId} not found or not running. Simulation cannot proceed.`);
            delete global.runningSimulations[tripId];
            return;
        }
        
        // Also store by MongoDB _id to ensure the monitoring system finds it
        global.runningSimulations[trip._id.toString()] = {
            startTime: new Date(),
            progress: 0,
            shouldStop: false,
            tripObjectId: trip._id.toString()
        };
        // console.log(`Registered simulation for trip ID ${tripId} and ObjectId ${trip._id.toString()}`);
        
        // Get the route for this trip
        const routeId = trip.routeId;
        vehicleId = trip.vehicleId;
        
        addSimulationLog(tripId, `Trip details - Route: ${trip.routeName}, Vehicle: ${vehicleId}`);
        
        const route = await db
            .collection("routes")
            .findOne({ _id: new ObjectId(routeId) });

        if (!route || !route.coords || route.coords.length === 0) {
            addSimulationLog(tripId, `No route coordinates found for trip with route ID ${routeId}`);
            delete global.runningSimulations[tripId];
            return;
        }

        addSimulationLog(tripId, `Found route: ${route.name} with ${route.coords.length} coordinates`);

        // Validate coordinates
        const isValidCoord = coord => Array.isArray(coord) && coord.length === 2 && 
                                  !isNaN(coord[0]) && !isNaN(coord[1]) &&
                                  coord[0] >= -90 && coord[0] <= 90 && 
                                  coord[1] >= -180 && coord[1] <= 180;
        
        const validCoords = route.coords.filter(isValidCoord);
        
        if (validCoords.length !== route.coords.length) {
            addSimulationLog(tripId, `Found ${route.coords.length - validCoords.length} invalid coordinates. Using only valid ones.`);
            coords = validCoords; // Use only valid coordinates
        } else {
            coords = route.coords;
        }
        
        if (coords.length === 0) {
            addSimulationLog(tripId, `No valid coordinates found for route. Simulation cannot proceed.`);
            delete global.runningSimulations[tripId];
            return;
        }
        
        addSimulationLog(tripId, `Starting vehicle movement with ${coords.length} waypoints`);
        
        // Simulate vehicle movement
        await simulateVehicle(db, coords, vehicleId, tripId);
        
        // Clean up after simulation
        delete global.runningSimulations[tripId];
        addSimulationLog(tripId, `Simulation completed`);
        
    } catch (error) {
        addSimulationLog(tripId, `Simulation error: ${error.message}`);
        if (global.runningSimulations[tripId]) {
            delete global.runningSimulations[tripId];
        }
    }
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateVehiclePos(db, lat, lng, vehicleId, tripId, pointIndex, totalPoints) {
    lat = randomizeCoordByPercent(lat, config.chance, config.randomness);
    lng = randomizeCoordByPercent(lng, config.chance, config.randomness);

    try {
        addSimulationLog(tripId, `Moving to waypoint ${pointIndex+1}/${totalPoints}: [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);
        
        // Try updating using ObjectId first
        const result = await db.collection("vehicles").updateOne(
            { _id: new ObjectId(vehicleId) },
            {
                $set: {
                    last_location: [lat, lng],
                    last_location_date_time: new Date().getTime()
                }
            }
        );
        
        if (result.matchedCount === 0) {
            addSimulationLog(tripId, `Vehicle not found by ID. Trying alternative lookup...`);
            // Try updating using vehicleID field instead
            const altResult = await db.collection("vehicles").updateOne(
                { vehicleID: vehicleId },
                {
                    $set: {
                        last_location: [lat, lng],
                        last_location_date_time: new Date().getTime()
                    }
                }
            );
            
            if (altResult.modifiedCount === 1) {
                addSimulationLog(tripId, `Vehicle position updated successfully (by vehicleID)`);
            } else {
                addSimulationLog(tripId, `Failed to update vehicle position`);
            }
        } else if (result.modifiedCount === 1) {
            addSimulationLog(tripId, `Vehicle position updated successfully`);
        }
    } catch (error) {
        addSimulationLog(tripId, `Error updating vehicle position: ${error.message}`);
    }
}

async function simulateVehicle(db, coords, vehicleId, tripId) {
    if (coords && coords.length > 0) {
        for (let i = 0; i < coords.length; i++) {
            // Check if simulation should be stopped
            if (global.runningSimulations[tripId] && global.runningSimulations[tripId].shouldStop) {
                addSimulationLog(tripId, `Simulation stopped as requested`);
                break;
            }
            
            await updateVehiclePos(db, coords[i][0], coords[i][1], vehicleId, tripId, i, coords.length);
            
            // Update progress
            if (global.runningSimulations[tripId]) {
                global.runningSimulations[tripId].progress = Math.round((i+1) / coords.length * 100);
            }
            
            // Use a shorter delay for smoother animation
            await delay(config.interval);
        }
    } else {
        addSimulationLog(tripId, `No coordinates found for the route.`);
    }
    console.log(`Trip ${tripId} simulation completed`);
}

module.exports = router;