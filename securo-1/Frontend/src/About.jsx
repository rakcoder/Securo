import React, { useEffect } from "react";
import "./About.css";
import { NavLink } from "react-router-dom";
import aboutImage from "./assets/aboutimg.avif";
import Navbar from "./Navbar";
import Footer from "./components/Footer";
import AOS from 'aos';
import 'aos/dist/aos.css';

const About = () => {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: 'ease-out'
    });
  }, []);

  const companyFeatures = [
    {
      title: "Real-time Tracking",
      description: "Monitor your fleet's location and status in real-time with our cutting-edge GPS technology",
      icon: "🛰️"
    },
    {
      title: "Data Analytics",
      description: "Powerful analytics to optimize your operations and make data-driven decisions",
      icon: "📊"
    },
    {
      title: "Route Optimization",
      description: "Save up to 20% on fuel and time with our AI-powered routing algorithms",
      icon: "🛣️"
    },
    {
      title: "24/7 Support",
      description: "Our dedicated team of experts is always ready to assist you with any issues",
      icon: "🛠️"
    }
  ];

  const teamMembers = [
    {
      name: "Alex Morgan",
      position: "CEO & Founder",
      bio: "With 15+ years in transportation technology, Alex founded Securo to revolutionize fleet management.",
      image: "https://randomuser.me/api/portraits/men/32.jpg"
    },
    {
      name: "Jessica Chen",
      position: "CTO",
      bio: "Former Google engineer with expertise in geospatial technology and machine learning algorithms.",
      image: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    {
      name: "Marcus Johnson",
      position: "Head of Customer Success",
      bio: "Dedicated to ensuring every client gets maximum value from the Securo platform.",
      image: "https://randomuser.me/api/portraits/men/67.jpg"
    },
    {
      name: "Sophia Rodriguez",
      position: "Lead UX Designer",
      bio: "Creates intuitive user experiences that make complex fleet management simple and accessible.",
      image: "https://randomuser.me/api/portraits/women/28.jpg"
    }
  ];

  const milestones = [
    { year: 2018, title: "Company Founded", description: "Securo was established with a mission to revolutionize fleet management" },
    { year: 2019, title: "First Major Client", description: "Partnered with a national logistics company to manage their 500+ vehicles" },
    { year: 2020, title: "Mobile App Launch", description: "Released our acclaimed mobile application for on-the-go fleet management" },
    { year: 2021, title: "International Expansion", description: "Expanded operations to Europe and Asia, serving global clients" },
    { year: 2022, title: "AI Integration", description: "Introduced machine learning algorithms for predictive maintenance and route optimization" },
    { year: 2023, title: "Sustainability Initiative", description: "Launched features to help fleets reduce carbon emissions and fuel consumption" },
    { year: 2024, title: "Industry Recognition", description: "Named 'Fleet Management Solution of the Year' by Transport Technology Awards" }
  ];

  return (
    <div className="about-page">
      <Navbar />
      
      {/* Hero Section */}
      <section className="about-hero">
        <div className="about-hero-content" data-aos="fade-right">
          <h1>About <span className="highlight">Securo</span></h1>
          <p>Your comprehensive solution for modern fleet management and vehicle tracking</p>
          <div className="about-stats">
            <div className="stat-item" data-aos="fade-up" data-aos-delay="100">
              <span className="stat-number">7+</span>
              <span className="stat-label">Years Experience</span>
            </div>
            <div className="stat-item" data-aos="fade-up" data-aos-delay="200">
              <span className="stat-number">800+</span>
              <span className="stat-label">Happy Clients</span>
            </div>
            <div className="stat-item" data-aos="fade-up" data-aos-delay="300">
              <span className="stat-number">25k+</span>
              <span className="stat-label">Vehicles Tracked</span>
            </div>
          </div>
        </div>
        <div className="about-image-container" data-aos="fade-left">
          <img src={aboutImage} alt="About Securo" className="about-hero-image" />
        </div>
      </section>
      
      {/* Mission Section */}
      <section className="about-mission">
        <div className="container">
          <div className="mission-content" data-aos="fade-up">
            <span className="section-label">OUR MISSION</span>
            <h2>Transforming Fleet Management for a Connected World</h2>
            <p>
              At Securo, we're driven by a singular purpose: to revolutionize how businesses manage their vehicle fleets. 
              We combine cutting-edge technology with intuitive design to create solutions that save time, reduce costs, 
              and improve efficiency for fleet operators worldwide.
            </p>
            <div className="mission-values">
              <div className="value-item" data-aos="fade-up" data-aos-delay="100">
                <div className="value-icon">💡</div>
                <h3>Innovation</h3>
                <p>Constantly improving our technology to stay ahead of industry needs</p>
              </div>
              <div className="value-item" data-aos="fade-up" data-aos-delay="200">
                <div className="value-icon">🤝</div>
                <h3>Reliability</h3>
                <p>Building trusted solutions that businesses can depend on every day</p>
              </div>
              <div className="value-item" data-aos="fade-up" data-aos-delay="300">
                <div className="value-icon">🌿</div>
                <h3>Sustainability</h3>
                <p>Helping fleets reduce their environmental impact through optimization</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="about-cta" data-aos="fade-up">
        <div className="container" style={{maxHeight: '100px'}}>
          <h2>Ready to transform your fleet management?</h2>
          <p>Take your fleet management to the next level with our innovative solutions.</p>
          <div className="cta-buttons">
            <NavLink to="/services" className="primary-button">
              Our Services
            </NavLink>
            <NavLink to="/contact" className="secondary-button">
              Contact Us
            </NavLink>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default About;
