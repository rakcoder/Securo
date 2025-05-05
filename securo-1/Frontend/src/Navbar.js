import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Navbar.css';
import Hamburger from './components/Hamburger';
import securoLogo from './assets/securo.jpg';

const apiUrl = process.env.REACT_APP_API_URL;

const useUserData = () => {
  const [userdata, setUserdata] = useState({});

  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await axios.get(`${apiUrl}/login/success`, { withCredentials: true });
        setUserdata(response.data.user);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    getUser();
  }, []);

  return userdata;
};

const Navbar = () => {
  const userdata = useUserData();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navbarRef = useRef(null);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Handle click outside to close mobile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const loginwithgoogle = () => {
    window.open(`${apiUrl}/auth/google/callback`, "_self")
  }
  
  const logout = () => {
    window.open(`${apiUrl}/logout`, "_self")
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container" ref={navbarRef}>
        {Object.keys(userdata).length > 0 && <Hamburger />}
        <div className="navbar-brand">
          <NavLink to="/" className="nav-link">
            <img src={securoLogo} alt="Securo Logo" width={120} height={50} className="navbar-logo" />
          </NavLink>
        </div>
        
        <button className="mobile-menu-button" onClick={toggleMobileMenu}>
          <i className="fas fa-bars">☰</i>
        </button>
        
        <div className={`navbar-links ${mobileMenuOpen ? 'active' : ''}`}>
          {mobileMenuOpen && (
            <button className="close-menu" onClick={toggleMobileMenu}>
              <i className="fas fa-times">✕</i>
            </button>
          )}
          
          <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            Home
          </NavLink>
          <NavLink to="/about" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            About
          </NavLink>
          <NavLink to="/services" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            Services
          </NavLink>
          <NavLink to="/contact" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
            Contact
          </NavLink>
          
          {Object.keys(userdata).length > 0 ? (
            <>
              <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                Dashboard
              </NavLink>
              <NavLink to="/FleetManagement" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                Fleet Management
              </NavLink>
              <NavLink to="/alerts" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                Alerts
              </NavLink>
              
              <div className="nav-user">
                <span>{userdata.displayName}</span>
                {userdata.image && <img src={userdata.image} className="nav-user-image" alt="User" />}
              </div>
              
              <button onClick={logout} className="nav-button">
                <span>Logout</span>
                <span className="nav-button-icon">→</span>
              </button>
            </>
          ) : (
            <button onClick={loginwithgoogle} className="nav-button">
              <span>Login</span>
              <span className="nav-button-icon">→</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;