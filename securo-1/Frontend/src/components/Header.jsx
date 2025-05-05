import React from "react";
import { Link } from "react-router-dom";
import "./Header.css";

const Header = () => {
  return (
    <div className="header">
      <div className="sidecontentryt">
        <h2>Track your fleet with ease</h2>
        <p>
          Monitor your vehicles in real-time and optimize your routes with
          Securo.
        </p>
        {/* <button className='getstr' onClick={() => window.location.href='../components/Extras'}>Get Started</button> */}
        {/* <Link to="/Extras" className='getstr'>Get Started</Link> */}
      </div>
      <div className="header-contents">
        <h2>Securo</h2>
      </div>
    </div>
  );
};

export default Header;
