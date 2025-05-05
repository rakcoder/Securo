const nodemailer = require("nodemailer");
const path = require('path');

// Format milliseconds to a human-readable duration (e.g., "10 minutes")
const formatDuration = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    if (minutes < 60) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else {
            return `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
        }
    }
};

const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
};

// Create reusable transporter object using the default SMTP transport
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD, // App password from Gmail account
        },
    });
};

const message_time = (vehicleID, email, tripDetails) => {
    const timeThreshold = tripDetails ? formatDuration(tripDetails.thresholds.time) : 'the set threshold';
    const tripInfo = tripDetails ? `
        <p><strong>Trip ID:</strong> ${tripDetails.tripId}</p>
        <p><strong>Route:</strong> ${tripDetails.routeName}</p>
        <p><strong>Driver:</strong> ${tripDetails.driverId}</p>
        <p><strong>Additional Info:</strong> ${tripDetails.info || 'None'}</p>
        <p><strong>Time Threshold:</strong> ${timeThreshold}</p>
    ` : '';
    
    return {
        from: {
            name: 'Securo Alert',
            address: process.env.EMAIL
        },
        to: [email],
        subject: "Securo | Time Threshold Alert",
        text: `Securo Alert for vehicle ${vehicleID}. Vehicle has not sent a location update for more than ${timeThreshold}.`,
        html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #d9534f;">⚠️ Time Threshold Alert for Vehicle ${vehicleID}</h2>
        <p>Vehicle ${vehicleID} has not sent a location update for more than ${timeThreshold}. This exceeds the configured time threshold for this trip.</p>
        
        <h3 style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">Trip Details</h3>
        ${tripInfo}
        
        <div style="margin-top: 20px; background-color: #f8f9fa; padding: 15px; border-radius: 4px;">
            <p><strong>Recommended Actions:</strong></p>
            <ul>
                <li>Contact the driver to confirm their status</li>
                <li>Check if there are technical issues with the vehicle's tracking device</li>
                <li>Consider sending assistance if needed</li>
            </ul>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #777;">This is an automated alert from Securo system. Please do not reply to this email.</p>
    </div>
        `
    };
}

const message_trip = (vehicleID, email, tripDetails) => {
    const tripInfo = tripDetails ? `
        <p><strong>Trip ID:</strong> ${tripDetails.tripId}</p>
        <p><strong>Route:</strong> ${tripDetails.routeName}</p>
        <p><strong>Driver:</strong> ${tripDetails.driverId}</p>
        <p><strong>Additional Info:</strong> ${tripDetails.info || 'None'}</p>
    ` : '';
    
    return {
        from: {
            name: 'Securo Alert',
            address: process.env.EMAIL
        },
        to: [email],
        subject: "Securo | Destination Alert",
        text: `Securo Alert for vehicle ${vehicleID}. Vehicle is approaching its destination.`,
        html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #5cb85c;">🏁 Destination Proximity Alert for Vehicle ${vehicleID}</h2>
        <p>Vehicle ${vehicleID} is approaching its destination. Please monitor the trip status and prepare for arrival procedures.</p>
        
        <h3 style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">Trip Details</h3>
        ${tripInfo}
        
        <div style="margin-top: 20px; background-color: #f8f9fa; padding: 15px; border-radius: 4px;">
            <p><strong>Recommended Actions:</strong></p>
            <ul>
                <li>Notify receiving personnel about the imminent arrival</li>
                <li>Prepare unloading facilities if applicable</li>
                <li>Consider updating the trip status when arrived</li>
            </ul>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #777;">This is an automated alert from Securo system. Please do not reply to this email.</p>
    </div>
        `
    };
}

const message_geofence = (vehicleID, email, tripDetails) => {
    const distanceThreshold = tripDetails ? `${tripDetails.thresholds.distance} KM` : 'the set distance';
    const tripInfo = tripDetails ? `
        <p><strong>Trip ID:</strong> ${tripDetails.tripId}</p>
        <p><strong>Route:</strong> ${tripDetails.routeName}</p>
        <p><strong>Driver:</strong> ${tripDetails.driverId}</p>
        <p><strong>Additional Info:</strong> ${tripDetails.info || 'None'}</p>
        <p><strong>Distance Threshold:</strong> ${distanceThreshold}</p>
    ` : '';
    
    return {
        from: {
            name: 'Securo Alert',
            address: process.env.EMAIL
        },
        to: [email],
        subject: "Securo | Geofence Alert",
        text: `Securo Alert for vehicle ${vehicleID}. Vehicle has deviated from its planned route by more than ${distanceThreshold}.`,
        html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #f0ad4e;">🚨 Geofence Violation Alert for Vehicle ${vehicleID}</h2>
        <p>Vehicle ${vehicleID} has deviated from its planned route by more than ${distanceThreshold}. This exceeds the configured geofence threshold for this trip.</p>
        
        <h3 style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">Trip Details</h3>
        ${tripInfo}
        
        <div style="margin-top: 20px; background-color: #f8f9fa; padding: 15px; border-radius: 4px;">
            <p><strong>Recommended Actions:</strong></p>
            <ul>
                <li>Contact the driver to confirm their current location</li>
                <li>Verify if there's a legitimate reason for the route deviation</li>
                <li>Check if a route recalculation is needed</li>
                <li>Consider security protocols if deviation is unexpected</li>
            </ul>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #777;">This is an automated alert from Securo system. Please do not reply to this email.</p>
    </div>
        `,
        attachments: [
            // Example of how to add logo attachment - uncomment and provide path if needed
            /*{
                filename: 'logo.png',
                path: path.join(__dirname, 'assets/logo.png'),
                cid: 'logo@securo' // same cid value as in the html img src
            }*/
        ]
    };
}

const sendEmail = async (userID, vehicleID, email, Type, tripDetails = null) => {
    console.log(`Attempting to send ${Type} alert to ${email} for vehicle ${vehicleID}`);

    // Debug email configuration
    if (!process.env.EMAIL || !process.env.PASSWORD) {
        console.error("EMAIL CONFIGURATION ERROR: Missing email credentials in environment variables");
        console.error(`EMAIL env var exists: ${!!process.env.EMAIL}, PASSWORD env var exists: ${!!process.env.PASSWORD}`);
        throw new Error("Email configuration error: Missing credentials");
    }

    let mailOptions;
    
    if (Type === "time_alert") {
        mailOptions = message_time(vehicleID, email, tripDetails);
    } else if (Type === "trip_alert") {
        mailOptions = message_trip(vehicleID, email, tripDetails);
    } else if (Type === "geofence_alert") {
        mailOptions = message_geofence(vehicleID, email, tripDetails);
    } else {
        console.log("Invalid alert type");
        return;
    }

    console.log(`Creating mail transport with sender: ${process.env.EMAIL?.substring(0,5)}...`);
    const transporter = createTransporter();
    
    try {
        console.log(`Sending ${Type} email to ${email}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully: ${info.messageId}`);
        console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        return info;
    } catch (error) {
        console.error(`ERROR SENDING EMAIL: ${error.message}`);
        console.error("Email configuration used:", {
            sender: process.env.EMAIL?.substring(0, 5) + '...',
            recipient: email,
            subject: mailOptions.subject
        });
        
        // Instead of throwing error, we'll log it but return a failure object
        // This prevents the monitoring loop from crashing
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = sendEmail;