import React, { useState } from 'react';
import emailjs from 'emailjs-com';
import './Contact.css';
import contactimg from './assets/contactus.png';
import Headers from './Navbar';

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  
  const [formStatus, setFormStatus] = useState({
    submitted: false,
    success: false,
    message: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormStatus({ ...formStatus, submitted: true });
  
    emailjs.init("userid");
  
    const emailData = {
      from_name: formData.name,
      from_email: formData.email,
      message: formData.message,
    };
  
    emailjs.send("serviceid", "templateid", emailData)
      .then((result) => {
        console.log(result.text);
        setFormStatus({
          submitted: false,
          success: true,
          message: 'Thank you for contacting us! We will get back to you soon.'
        });
      }, (error) => {
        console.error('Failed to send email:', error.text);
        setFormStatus({
          submitted: false,
          success: false,
          message: 'Failed to send your message. Please try again later.'
        });
      });
  };

  const contactInfo = [
    { icon: "📍", title: "Address", content: "123 Fleet Street, Tech Park, CA 94103" },
    { icon: "📞", title: "Phone", content: "+1 (555) 123-4567" },
    { icon: "✉️", title: "Email", content: "support@securo.com" }
  ];

  return (
    <div className="contact-page">
      <div className="dashNavbar"><Headers /></div>
      
      <div className="contact-hero">
        <div className="contact-hero-content">
          <h1>Get in <span className="highlight">Touch</span></h1>
          <p>Have questions about our fleet management solutions? We're here to help you optimize your operations.</p>
        </div>
        <img src={contactimg} alt="Contact us" className="contact-hero-image" />
      </div>
      
      <div className="contact-container">
        <div className="contact-info">
          <h2>Contact Information</h2>
          <div className="contact-info-items">
            {contactInfo.map((item, index) => (
              <div className="contact-info-item" key={index}>
                <div className="contact-icon">{item.icon}</div>
                <div className="contact-details">
                  <h3>{item.title}</h3>
                  <p>{item.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="contact-form-container">
          <h2>Send us a Message</h2>
          {formStatus.message && (
            <div className={`form-message ${formStatus.success ? 'success' : 'error'}`}>
              {formStatus.message}
            </div>
          )}
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                placeholder="Your name"
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                placeholder="your.email@example.com"
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea 
                id="message" 
                name="message" 
                value={formData.message} 
                onChange={handleChange} 
                placeholder="How can we help you?"
                rows="5"
                required 
              />
            </div>
            <button 
              type="submit" 
              className="submit-button"
              disabled={formStatus.submitted}
            >
              {formStatus.submitted ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;