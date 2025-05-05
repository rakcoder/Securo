import React, { useEffect } from 'react';
import './Home.css';
import Navbar from './Navbar';
import Footer from './components/Footer';
import { Link } from 'react-router-dom';
import headerImg from './assets/headerimg.jpg';
import truckImg from './assets/truck.webp';
import AOS from 'aos';
import 'aos/dist/aos.css';

const Home = () => {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: 'ease-out'
    });
  }, []);

  const features = [
    {
      title: "Real-time Tracking",
      description: "Monitor your fleet's location and status in real-time with our advanced GPS technology",
      icon: "📍"
    },
    {
      title: "Route Optimization",
      description: "Save up to 20% on fuel and time with our AI-powered routing algorithms",
      icon: "🛣️"
    },
    {
      title: "Driver Management",
      description: "Track driver performance, compliance, and safety with comprehensive reporting",
      icon: "👨‍✈️"
    },
    {
      title: "Maintenance Alerts",
      description: "Proactive maintenance notifications to prevent breakdowns and extend vehicle life",
      icon: "🔧"
    },
    {
      title: "Fuel Monitoring",
      description: "Analyze fuel consumption patterns and identify opportunities for savings",
      icon: "⛽"
    },
    {
      title: "Geofencing",
      description: "Create virtual boundaries and receive alerts when vehicles enter or exit zones",
      icon: "🔍"
    }
  ];

  const testimonials = [
    {
      name: "John Carter",
      position: "Fleet Manager, LogiTech Transport",
      comment: "Securo has revolutionized how we manage our 50+ vehicles. The real-time tracking and route optimization have reduced our fuel costs by 18%.",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg"
    },
    {
      name: "Sarah Mitchell",
      position: "Operations Director, FastFreight Ltd",
      comment: "The geofencing and driver management features have improved our delivery accuracy and driver safety scores. Excellent ROI in just 3 months.",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    {
      name: "Michael Rodriguez",
      position: "CEO, Express Courier Services",
      comment: "We've been able to take on 30% more deliveries without adding vehicles thanks to Securo's optimization algorithms. Game-changing for our business.",
      avatar: "https://randomuser.me/api/portraits/men/67.jpg"
    }
  ];

  const stats = [
    { value: "20%", label: "Average Fuel Savings" },
    { value: "35%", label: "Improved Route Efficiency" },
    { value: "1,500+", label: "Active Fleets" },
    { value: "25,000+", label: "Vehicles Tracked" }
  ];

  return (
    <div className="home-page">
      <Navbar />
      
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content" data-aos="fade-right">
          <h1>Fleet Management <span className="highlight">Reimagined</span></h1>
          <p>Streamline your operations with our comprehensive fleet tracking and management solution powered by cutting-edge technology</p>
          <div className="hero-buttons">
            <Link to="/services" className="primary-button">Explore Services</Link>
            <Link to="/contact" className="secondary-button">Contact Us</Link>
          </div>
        </div>
        <div className="hero-image-container" data-aos="fade-left">
          <img src={headerImg} alt="Securo dashboard" className="hero-image" />
        </div>
      </section>
      
    
      
      {/* About Preview Section */}
      <section className="about-preview-section" style={{paddingTop: '-150px'}}>
        <div className="container">
          <div className="about-preview-content" data-aos="fade-right">
            <h2>Smart Fleet Management for Modern Businesses</h2>
            <p>Securo offers a comprehensive solution to monitor, manage, and optimize your vehicle fleet. Our platform combines cutting-edge GPS technology with powerful analytics to give you complete control over your operations.</p>
            <ul className="benefits-list">
              <li>Reduce fuel consumption by up to 20%</li>
              <li>Improve driver safety and compliance</li>
              <li>Optimize routes for maximum efficiency</li>
              <li>Enhance customer satisfaction with accurate ETAs</li>
              <li>Extend vehicle lifespan with preventative maintenance</li>
              <li>Gain actionable insights with advanced analytics</li>
            </ul>
            <Link to="/about" className="text-button">Learn more about us <span>&rarr;</span></Link>
          </div>
          <div className="about-preview-image" data-aos="fade-left">
            <img src={truckImg} alt="Fleet vehicle" />
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="cta-section" data-aos="fade-up"style={{maxHeight: '100px'}}>
        <div className="container" style={{maxHeight: '100px'}}>
          <h2>Ready to transform your fleet management?</h2>
          <p  style={{maxHeight: '50px'}}>Join thousands of businesses that trust Securo for their fleet management needs</p>
          <Link to="/contact" className="primary-button" style={{maxHeight: '50px'}} >Get Started Today</Link>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Home;