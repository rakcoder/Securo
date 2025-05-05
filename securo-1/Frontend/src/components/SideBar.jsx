import React from 'react'
import './SideBar.css'
import { NavLink } from 'react-router-dom'
import Home from '../assets/home.png'
import about from '../assets/about.webp'
import contact from '../assets/contacts.png'
import services from '../assets/services.png'
import LoginBtn from './LoginBtn'
const Sidebar = () => {
    return (
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>Securo</h1>
        </div>
        <div className="sidebar-options">
          <NavLink to="/home" className="sidebar-option">
            <img src={Home} alt="Securo" />
            <p>Home</p>
          </NavLink>
          <NavLink to="/about" className="sidebar-option">
            <img src={about} alt="Securo" />
            <p>About</p>
          </NavLink>
          <NavLink to="/contact" className="sidebar-option">
            <img src={contact} alt="Securo" />
            <p>Contact</p>
          </NavLink>
          <NavLink to="/services" className="sidebar-option">
            <img src={services} alt="Securo" />
            <p>Services</p>
          </NavLink>
          <div className="login">
            <LoginBtn />
          </div>
        </div>
      </div>
    );
}

export default Sidebar
