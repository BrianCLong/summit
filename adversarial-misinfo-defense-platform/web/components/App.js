/**
 * Main App Component for Adversarial Misinformation Defense Platform Web UI
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import { ToastContainer } from 'react-toastify';

// Styled components
const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
`;

const Header = styled.header`
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.5rem;
`;

const Main = styled.main`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
`;

const Footer = styled.footer`
  background-color: #34495e;
  color: white;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.8rem;
`;

// Navigation component
const Navigation = () => {
  return (
    <nav style={{ marginBottom: '1rem' }}>
      <ul style={{ 
        display: 'flex', 
        listStyle: 'none', 
        padding: 0, 
        margin: 0,
        backgroundColor: '#3498db',
        borderRadius: '4px'
      }}>
        <li><a href="/" style={navLinkStyle}>Dashboard</a></li>
        <li><a href="/scenarios" style={navLinkStyle}>Scenarios</a></li>
        <li><a href="/exercises" style={navLinkStyle}>Exercises</a></li>
        <li><a href="/validation" style={navLinkStyle}>Validation</a></li>
        <li><a href="/training" style={navLinkStyle}>Training</a></li>
        <li><a href="/evolution" style={navLinkStyle}>Evolution</a></li>
        <li><a href="/reports" style={navLinkStyle}>Reports</a></li>
      </ul>
    </nav>
  );
};

const navLinkStyle = {
  display: 'block',
  padding: '0.75rem 1rem',
  color: 'white',
  textDecoration: 'none',
  fontWeight: '500',
  transition: 'background-color 0.2s'
};

// App component
const App = () => {
  return (
    <AppContainer>
      <Header>
        <Title>🛡️ Adversarial Misinformation Defense Platform</Title>
      </Header>
      
      <Main>
        <Navigation />
        <Outlet />
      </Main>
      
      <Footer>
        <p>Adversarial Misinformation Defense Platform v1.0.0</p>
      </Footer>
      
      <ToastContainer />
    </AppContainer>
  );
};

export default App;