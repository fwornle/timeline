import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';

const About: React.FC = () => {
  const navigate = useNavigate();

  const handleDismiss = () => {
    navigate('/');
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">About Timeline</h1>
        <Button
          variant="primary"
          onClick={handleDismiss}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Dismiss
        </Button>
      </div>
      <p className="lead mb-4">
        Timeline is an interactive 3D visualization tool for Git repository history.
      </p>

      <div className="row mb-4">
        <div className="col-md-6 mb-4">
          <div className="border rounded p-3 h-100">
            <h2 className="h5 mb-3">Features</h2>
            <ul>
              <li>Interactive 3D visualization of Git commit history</li>
              <li>Support for both Git commits and specification/prompt history</li>
              <li>Automatic animation with adjustable speed</li>
              <li>Support for enterprise GitHub instances</li>
              <li>Secure credential storage for private repositories</li>
              <li>Responsive design that works on all screen sizes</li>
              <li>Local caching for improved performance</li>
            </ul>
          </div>
        </div>

        <div className="col-md-6 mb-4">
          <div className="border rounded p-3 h-100">
            <h2 className="h5 mb-3">How It Works</h2>
            <ol>
              <li>Enter your Git repository URL in the settings</li>
              <li>Timeline fetches the repository history</li>
              <li>Commits and prompts are displayed as cards in 3D space</li>
              <li>Navigate through time using the animation controls</li>
              <li>Click on cards to view detailed information</li>
              <li>Use the bottom bar controls to adjust animation speed</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6 mb-4">
          <div className="border rounded p-3 h-100">
            <h2 className="h5 mb-3">Technologies</h2>
            <p>Timeline is built with modern web technologies:</p>
            <ul>
              <li>React for the user interface</li>
              <li>Three.js for 3D visualization</li>
              <li>TypeScript for type safety</li>
              <li>Bootstrap for responsive design</li>
              <li>Local Node.js server for Git operations</li>
            </ul>
          </div>
        </div>

        <div className="col-md-6 mb-4">
          <div className="border rounded p-3 h-100">
            <h2 className="h5 mb-3">Getting Started</h2>
            <p>To get started with Timeline:</p>
            <ol>
              <li>Click the settings icon in the top right corner</li>
              <li>Enter your Git repository URL</li>
              <li>For private HTTPS repositories, provide your credentials</li>
              <li>Wait for the repository data to load</li>
              <li>Use the animation controls to navigate through time</li>
            </ol>
            <p className="mt-3">
              <strong>Note:</strong> SSH repositories require SSH keys to be set up on your system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;