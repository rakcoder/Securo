const { MongoClient } = require('mongodb');
require('dotenv').config();

// Database connection function
async function connectToDb() {
    const client = new MongoClient(process.env.DB_URL || "mongodb+srv://dipandhali2021:8240054421@cluster0.biu4xlo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");
    await client.connect();
    const db = client.db("Securo");
    console.log("Connected to database");
    return db;
}

module.exports = { connectToDb };