import React from "react";
import "./Services.css";
import serviceimg from "./assets/serviceimg.png";
import Headers from './Navbar';

const Services = () => {
    const services = [
        {
            title: "Real-time Tracking",
            description: "Monitor your fleet in real-time with our advanced GPS tracking system.",
            icon: "📍"
        },
        {
            title: "Route Optimization",
            description: "Optimize routes to save fuel and improve delivery times.",
            icon: "🛣️"
        },
        {
            title: "Driver Management",
            description: "Manage driver schedules, performance, and compliance from one dashboard.",
            icon: "👨‍✈️"
        },
        {
            title: "Analytics & Reporting",
            description: "Get detailed insights and reports on fleet performance and efficiency.",
            icon: "📊"
        }
    ];

    return (
        <div className="services-page">
            <div className="dashNavbar"><Headers /></div>
            
            <div className="services-hero">
                <div className="services-hero-content">
                    <h1>Our <span className="highlight">Services</span></h1>
                    <p>Comprehensive fleet management solutions designed to optimize your operations and maximize efficiency.</p>
                </div>
                <img src={serviceimg} alt="Fleet management services" className="services-hero-image" />
            </div>
            
            <div className="services-grid">
                {services.map((service, index) => (
                    <div className="service-card" key={index}>
                        <div className="service-icon">{service.icon}</div>
                        <h3>{service.title}</h3>
                        <p>{service.description}</p>
                    </div>
                ))}
            </div>
            
            <div className="services-cta">
                <h2>Ready to transform your fleet management?</h2>
                <button className="primary-button">Get Started Today</button>
            </div>
        </div>
    );
}

export default Services;