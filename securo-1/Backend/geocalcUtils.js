/**
 * Randomizes a coordinate by a percentage amount.
 * Used to add slight randomness to vehicle movement simulation.
 * 
 * @param {number} coord - The coordinate value (latitude or longitude)
 * @param {number} chance - The chance (0-1) that randomization will occur
 * @param {number} percentage - The maximum percentage change (0-100)
 * @returns {number} - The randomized coordinate
 */
function randomizeCoordByPercent(coord, chance, percentage) {
    // Only randomize based on chance
    if (Math.random() > chance) {
        return coord;
    }
    
    // Scale down the percentage to create much smaller variations
    // A value of 0.2 (20%) will now create a max variation of 0.002 degrees
    const scaledPercentage = percentage / 10000;
    
    // Calculate the maximum change (much smaller now)
    const maxChange = Math.abs(coord) * scaledPercentage;
    
    // Generate a random change between -maxChange and +maxChange
    const change = (Math.random() * 2 - 1) * maxChange;
    
    // Return the coordinate with the random change
    return coord + change;
}

module.exports = { randomizeCoordByPercent };