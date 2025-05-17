import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import PreferencesModal from './PreferencesModal';
import { usePreferences } from '../context/PreferencesContext';

interface TopBarProps {
  onRepoUrlChange?: (url: string) => void;
}

const TopBar: React.FC<TopBarProps> = ({ onRepoUrlChange }) => {
  const location = useLocation();
  const [showPrefs, setShowPrefs] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { preferences } = usePreferences();

  const handleRepoUrlChange = (url: string) => {
    if (onRepoUrlChange) {
      onRepoUrlChange(url);
    }
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary w-100 px-0 mx-0" style={{ minHeight: '56px' }}>
        <div className="container-fluid px-3">
          {/* Branding/Logo (left) */}
          <Link className="navbar-brand mb-0 h1" to="/">
            <span role="img" aria-label="logo">⏱️</span> Timeline
          </Link>
          {/* Toggler for mobile */}
          <button
            className="navbar-toggler"
            type="button"
            aria-controls="navbarNav"
            aria-expanded={expanded}
            aria-label="Toggle navigation"
            onClick={() => setExpanded((prev) => !prev)}
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className={`collapse navbar-collapse justify-content-between${expanded ? ' show' : ''}`} id="navbarNav">
            {/* Navigation Menu (center) */}
            <div className="navbar-nav mx-lg-auto text-center gap-2">
              <Link className={`nav-link text-white${location.pathname === '/' ? ' active' : ''}`} to="/">Timeline</Link>
              <Link className={`nav-link text-white${location.pathname === '/about' ? ' active' : ''}`} to="/about">About</Link>
            </div>
            {/* Quick Action Buttons (right) */}
            <div className="d-flex align-items-center gap-2 justify-content-end mt-2 mt-lg-0">
              {preferences.repoUrl && (
                <span className="text-light me-2 d-none d-lg-inline">
                  <small>{preferences.repoUrl}</small>
                </span>
              )}
              <Button
                variant="outline-light"
                size="sm"
                title="Repository Settings"
                aria-label="Repository Settings"
                onClick={() => setShowPrefs(true)}
              >
                <i className="bi bi-gear" />
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <PreferencesModal
        show={showPrefs}
        onClose={() => setShowPrefs(false)}
        onRepoUrlChange={handleRepoUrlChange}
      />
    </>
  );
};

export default TopBar;