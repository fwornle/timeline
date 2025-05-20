import React, { useState } from 'react';
import { Button, Navbar, Container, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PreferencesModal from './PreferencesModal';
import { usePreferences } from '../context/PreferencesContext';
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
  const [expanded, setExpanded] = useState(false);
  const { preferences } = usePreferences();
  const logger = useLogger({ component: 'TopBar', topic: 'ui' });

  const handleRepoUrlChange = (url: string) => {
    if (onRepoUrlChange) {
      onRepoUrlChange(url);
    }
  };

  const collapseClassName = `collapse navbar-collapse justify-content-between${expanded ? ' show' : ''}`;

  return (
    <>
      <Navbar bg="primary" variant="dark" expand="lg" className="w-100 px-0 mx-0" style={{ minHeight: '56px' }}>
        <Container fluid>
          {/* Branding/Logo (left) - Clickable to go to About */}
          <Navbar.Brand href="#" className="d-flex align-items-center">
            <span className="text-light d-none d-sm-inline">Timeline</span>
          </Navbar.Brand>

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

          <div className={collapseClassName} id="navbarNav">
            {/* Center area - Display repo URL */}
            <div className="navbar-nav mx-lg-auto text-center">
              {preferences.repoUrl && (
                <span className="text-light d-none d-md-inline">
                  {preferences.repoUrl}
                </span>
              )}
            </div>

            {/* Quick Action Buttons (right) */}
            <div className="d-flex align-items-center gap-2 justify-content-end mt-2 mt-lg-0">
              {preferences.repoUrl && (
                <>
                  {/* Reload Data Button */}
                  <OverlayTrigger
                    placement="bottom"
                    overlay={<Tooltip>Reload data from cache or upstream repository</Tooltip>}
                  >
                    <Button
                      variant="outline-light"
                      size="sm"
                      onClick={() => {
                        logger.info('Soft reload requested');
                        onReloadData?.();
                      }}
                      disabled={isLoading}
                    >
                      <i className={`bi ${isLoading ? 'bi-hourglass-split' : 'bi-arrow-clockwise'}`} />
                    </Button>
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
                    <Button
                      variant="outline-warning"
                      size="sm"
                      onClick={() => {
                        logger.info('Hard reload requested');
                        onHardReload?.();
                      }}
                      disabled={isLoading}
                    >
                      <i className={`bi ${isLoading ? 'bi-hourglass-split' : 'bi-exclamation-triangle'}`} />
                    </Button>
                  </OverlayTrigger>
                </>
              )}

              {/* Settings Button */}
              <Button
                variant="outline-light"
                size="sm"
                title="Repository Settings"
                aria-label="Repository Settings"
                onClick={() => setShowPrefs(true)}
                disabled={isLoading}
              >
                <i className="bi bi-gear" />
              </Button>
            </div>
          </div>
        </Container>
      </Navbar>

      <PreferencesModal
        show={showPrefs}
        onClose={() => setShowPrefs(false)}
        onRepoUrlChange={handleRepoUrlChange}
      />
    </>
  );
};

export default TopBar;