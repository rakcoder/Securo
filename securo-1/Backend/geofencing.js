function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const r = 6371; // km
    const p = Math.PI / 180;
    const a = 0.5 - Math.cos((lat2 - lat1) * p) / 2
        + Math.cos(lat1 * p) * Math.cos(lat2 * p) *
        (1 - Math.cos((lon2 - lon1) * p)) / 2;
    return parseFloat((2 * r * Math.asin(Math.sqrt(a))).toFixed(6));
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

function rad2deg(rad) {
    return rad * (180 / Math.PI)
}

const minimumDistanceInKm = async (position, lastIndex, routeData, threshold) => {
    // Normalize the position format
    // Check if position is in [lat, lng] format or {lat, lng} format
    let posLat, posLng;
    if (Array.isArray(position)) {
        posLat = position[0];
        posLng = position[1];
    } else if (position && 'lat' in position && 'lng' in position) {
        posLat = position.lat;
        posLng = position.lng;
    } else {
        console.error("Invalid position format:", position);
        return [false, lastIndex]; // Default to not valid if position format is unexpected
    }
    
    console.log(`Geofence check - Position: [${posLat}, ${posLng}], Threshold: ${threshold} KM`);
    
    // get the minimum distance from -10 to +10 of last index, in kilometers
    let minDistance = 1000000;
    let min_Distance_Index = lastIndex || 0;  // Default to 0 if lastIndex is undefined/null

    // First check around the last known position on the route
    const searchRange = 10;
    for (let i = -searchRange; i <= searchRange; i++) {
        const checkIndex = min_Distance_Index + i;
        if (checkIndex < 0 || checkIndex >= routeData.length) {
            continue;
        }
        
        const routePoint = routeData[checkIndex];
        if (!Array.isArray(routePoint) || routePoint.length < 2) {
            continue; // Skip invalid route points
        }
        
        const distance = getDistanceFromLatLonInKm(posLat, posLng, routePoint[0], routePoint[1]);
        
        if (distance < minDistance) {
            minDistance = distance;
            min_Distance_Index = checkIndex;
        }
    }
    
    if (minDistance < threshold) {
        console.log(`Vehicle is within threshold (${minDistance.toFixed(4)} KM < ${threshold} KM) at route index ${min_Distance_Index}`);
        return [true, min_Distance_Index];
    }
    
    // If not found within the local search range, check the entire route
    for (let i = 0; i < routeData.length; i++) {
        const routePoint = routeData[i];
        if (!Array.isArray(routePoint) || routePoint.length < 2) {
            continue; // Skip invalid route points
        }
        
        const distance = getDistanceFromLatLonInKm(posLat, posLng, routePoint[0], routePoint[1]);
        
        if (distance < minDistance) {
            minDistance = distance;
            min_Distance_Index = i;
        }
    }
    
    const isWithinThreshold = minDistance < threshold;
    console.log(`Vehicle ${isWithinThreshold ? 'IS' : 'IS NOT'} within threshold (${minDistance.toFixed(4)} KM ${isWithinThreshold ? '<' : '>='} ${threshold} KM) at route index ${min_Distance_Index}`);
    
    return [isWithinThreshold, min_Distance_Index];
}

const convertToCartesian = (lat, long) => {
    const x = Math.cos(lat) * Math.cos(long);
    const y = Math.cos(lat) * Math.sin(long);
    const z = Math.sin(lat);
    return { x, y, z };
}

module.exports = minimumDistanceInKm;