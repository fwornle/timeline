import React, { useState } from 'react';
import { Navbar, Container, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PreferencesModal from './PreferencesModal';
import { LoggingControl } from './ui/LoggingControl';
import { useAppSelector } from '../store';
import { useLogger } from '../utils/logging/hooks/useLogger';

interface TopBarProps {
  onRepoUrlChange?: (url: string) => void;
  onReloadData?: () => void;
  onHardReload?: () => void;
  isLoading?: boolean;
}

const TopBar: React.FC<TopBarProps> = ({
  onRepoUrlChange,
  onReloadData,
  onHardReload,
  isLoading
}) => {
  const [showPrefs, setShowPrefs] = useState(false);
  const [showLoggingControl, setShowLoggingControl] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const repoUrl = useAppSelector(state => state.preferences.repoUrl);
  const logger = useLogger({ component: 'TopBar', topic: 'ui' });

  const handleRepoUrlChange = (url: string) => {
    if (onRepoUrlChange) {
      onRepoUrlChange(url);
    }
  };

  const collapseClassName = `collapse navbar-collapse justify-content-between${expanded ? ' show' : ''}`;

  return (
    <>
      <Navbar
        expand="lg"
        className="w-100 px-0 mx-0 shadow-sm"
        style={{
          minHeight: '64px',
          backgroundColor: 'var(--color-primary-800)',
          borderBottom: '1px solid var(--color-border-light)'
        }}
      >
        <Container fluid>
          {/* Branding/Logo (left) - Clickable to go to About */}
          <Navbar.Brand href="#" className="d-flex align-items-center">
            <span
              className="d-none d-sm-inline fw-semibold"
              style={{
                color: 'var(--color-primary-50)',
                fontSize: '1.25rem',
                letterSpacing: '-0.025em'
              }}
            >
              Timeline
            </span>
          </Navbar.Brand>

          {/* Toggler for mobile */}
          <button
            className="navbar-toggler border-0"
            type="button"
            aria-controls="navbarNav"
            aria-expanded={expanded}
            aria-label="Toggle navigation"
            onClick={() => setExpanded((prev) => !prev)}
            style={{
              backgroundColor: 'transparent',
              boxShadow: 'none'
            }}
          >
            <span
              className="navbar-toggler-icon"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%28248, 250, 252, 0.75%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e")`
              }}
            />
          </button>

          <div className={collapseClassName} id="navbarNav">
            {/* Center area - Display repo URL */}
            <div className="navbar-nav mx-lg-auto text-center">
              {repoUrl && (
                <span
                  className="d-none d-md-inline"
                  style={{
                    color: 'var(--color-primary-200)',
                    fontSize: '0.875rem',
                    fontFamily: 'monospace'
                  }}
                >
                  {repoUrl}
                </span>
              )}
            </div>

            {/* Quick Action Buttons (right) */}
            <div className="d-flex align-items-center gap-2 justify-content-end mt-2 mt-lg-0">
              {repoUrl && (
                <>
                  {/* Reload Data Button */}
                  <OverlayTrigger
                    placement="bottom"
                    overlay={<Tooltip>Reload data from cache or upstream repository</Tooltip>}
                  >
                    <button
                      className="btn btn-sm"
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid var(--color-primary-400)',
                        color: 'var(--color-primary-100)',
                        borderRadius: '6px',
                        padding: '0.375rem 0.75rem',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-primary-700)';
                        e.currentTarget.style.borderColor = 'var(--color-primary-300)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'var(--color-primary-400)';
                      }}
                      onClick={() => {
                        logger.info('Soft reload requested');
                        onReloadData?.();
                      }}
                      disabled={isLoading}
                    >
                      <i className={`bi ${isLoading ? 'bi-hourglass-split' : 'bi-arrow-clockwise'}`} />
                    </button>
                  </OverlayTrigger>

                  {/* Hard Reload Button */}
                  <OverlayTrigger
                    placement="bottom"
                    overlay={
                      <Tooltip>
                        <strong>Warning:</strong> This will delete the local repository clone and all cached data
                      </Tooltip>
                    }
                  >
                    <button
                      className="btn btn-sm"
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid var(--color-warning)',
                        color: 'var(--color-warning)',
                        borderRadius: '6px',
                        padding: '0.375rem 0.75rem',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-warning)';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--color-warning)';
                      }}
                      onClick={() => {
                        logger.info('Hard reload requested');
                        onHardReload?.();
                      }}
                      disabled={isLoading}
                    >
                      <i className={`bi ${isLoading ? 'bi-hourglass-split' : 'bi-exclamation-triangle'}`} />
                    </button>
                  </OverlayTrigger>
                </>
              )}

              {/* Logging Control Button */}
              <OverlayTrigger
                placement="bottom"
                overlay={<Tooltip>Logging Configuration</Tooltip>}
              >
                <button
                  className="btn btn-sm"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--color-primary-400)',
                    color: 'var(--color-primary-100)',
                    borderRadius: '6px',
                    padding: '0.375rem 0.75rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-700)';
                    e.currentTarget.style.borderColor = 'var(--color-primary-300)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--color-primary-400)';
                  }}
                  title="Logging Configuration"
                  aria-label="Logging Configuration"
                  onClick={() => setShowLoggingControl(true)}
                  disabled={isLoading}
                >
                  <i className="bi bi-file-text" />
                </button>
              </OverlayTrigger>

              {/* Settings Button */}
              <button
                className="btn btn-sm"
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid var(--color-primary-400)',
                  color: 'var(--color-primary-100)',
                  borderRadius: '6px',
                  padding: '0.375rem 0.75rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-700)';
                  e.currentTarget.style.borderColor = 'var(--color-primary-300)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--color-primary-400)';
                }}
                title="Repository Settings"
                aria-label="Repository Settings"
                onClick={() => setShowPrefs(true)}
                disabled={isLoading}
              >
                <i className="bi bi-gear" />
              </button>
            </div>
          </div>
        </Container>
      </Navbar>

      <PreferencesModal
        show={showPrefs}
        onClose={() => setShowPrefs(false)}
        onRepoUrlChange={handleRepoUrlChange}
      />

      <LoggingControl
        isOpen={showLoggingControl}
        onClose={() => setShowLoggingControl(false)}
      />
    </>
  );
};

export default TopBar;