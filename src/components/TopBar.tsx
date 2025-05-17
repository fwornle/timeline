import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import PreferencesModal from './PreferencesModal';
import { usePreferences } from '../context/PreferencesContext';

interface TopBarProps {
  onRepoUrlChange?: (url: string) => void;
  onRefreshTimeline?: () => void;
  onReloadData?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  onRepoUrlChange,
  onRefreshTimeline,
  onReloadData
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showPrefs, setShowPrefs] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { preferences } = usePreferences();

  const handleRepoUrlChange = (url: string) => {
    if (onRepoUrlChange) {
      onRepoUrlChange(url);
    }
  };

  const handleLogoClick = () => {
    navigate('/about');
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary w-100 px-0 mx-0" style={{ minHeight: '56px' }}>
        <div className="container-fluid px-3">
          {/* Branding/Logo (left) - Clickable to go to About */}
          <div
            className="navbar-brand mb-0 h1 cursor-pointer"
            onClick={handleLogoClick}
            style={{ cursor: 'pointer' }}
          >
            <span role="img" aria-label="logo">⏱️</span> Timeline
          </div>

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
            {/* Center area - Display repo URL */}
            <div className="navbar-nav mx-lg-auto text-center">
              {preferences.repoUrl && (
                <span className="text-light d-none d-lg-inline">
                  {preferences.repoUrl}
                </span>
              )}
            </div>

            {/* Quick Action Buttons (right) */}
            <div className="d-flex align-items-center gap-2 justify-content-end mt-2 mt-lg-0">
              {preferences.repoUrl && (
                <>
                  {/* Reset Timeline Position Button */}
                  <Button
                    variant="outline-light"
                    size="sm"
                    title="Reset Timeline Position"
                    aria-label="Reset Timeline Position"
                    onClick={onRefreshTimeline}
                  >
                    <i className="bi bi-arrow-counterclockwise" />
                  </Button>

                  {/* Reload Data Button */}
                  <Button
                    variant="outline-light"
                    size="sm"
                    title="Reload Data from Repository"
                    aria-label="Reload Data from Repository"
                    onClick={onReloadData}
                  >
                    <i className="bi bi-cloud-arrow-down" />
                  </Button>
                </>
              )}

              {/* Settings Button */}
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