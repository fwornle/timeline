import React from 'react';
import { Container, Row, Col, Form } from 'react-bootstrap';
import { usePreferences } from '../context/PreferencesContext';

interface BottomBarProps {
  gitCount?: number;
  specCount?: number;
  isLoading?: boolean;
  isCached?: boolean;
  currentPosition?: number;
  animationSpeed?: number;
  autoDrift?: boolean;
  onAnimationSpeedChange?: (speed: number) => void;
  onAutoDriftChange?: (enabled: boolean) => void;
  onViewAllClick?: () => void;
  onFocusCurrentClick?: () => void;
}

const BottomBar: React.FC<BottomBarProps> = ({
  gitCount = 0,
  specCount = 0,
  isLoading = false,
  isCached = false,
  currentPosition = 0,
  animationSpeed = 1,
  autoDrift = false,
  onAnimationSpeedChange,
  onAutoDriftChange,
  onViewAllClick,
  onFocusCurrentClick
}) => {
  const { preferences } = usePreferences();
  const repoUrl = preferences.repoUrl || '';
  const showControls = !!repoUrl;

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onAnimationSpeedChange) {
      onAnimationSpeedChange(parseFloat(e.target.value));
    }
  };

  const handleAutoDriftChange = () => {
    if (onAutoDriftChange) {
      onAutoDriftChange(!autoDrift);
    }
  };

  return (
    <div className="bg-light border-top py-2">
      <Container fluid>
        <Row className="align-items-center">
          {/* Repository Status (left) */}
          <Col xs={12} md={6} className="text-md-start text-center mb-2 mb-md-0">
            {showControls ? (
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <span className="badge bg-secondary">
                  <i className="bi bi-git me-1"></i>
                  {isLoading ? 'Loading...' : `${gitCount} commits`}
                </span>
                <span className="badge bg-info">
                  <i className="bi bi-chat-dots me-1"></i>
                  {isLoading ? 'Loading...' : `${specCount} prompts`}
                </span>
                {isCached && (
                  <span className="badge bg-warning text-dark">
                    <i className="bi bi-database me-1"></i>
                    Mocked
                  </span>
                )}
                <span className="badge bg-primary">
                  <i className="bi bi-clock-history me-1"></i>
                  Position: {currentPosition.toFixed(2)}
                </span>
              </div>
            ) : (
              <span className="text-muted">Enter a repository URL to begin</span>
            )}
          </Col>

          {/* Animation Controls (right) */}
          {showControls && (
            <Col xs={12} md={6} className="text-md-end text-center mt-2 mt-md-0">
              <div className="d-flex align-items-center justify-content-md-end justify-content-center gap-3">
                {/* Camera control buttons */}
                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onViewAllClick}
                    title="View all events"
                  >
                    <i className="bi bi-arrows-fullscreen"></i>
                    <span className="ms-1 d-none d-md-inline">View All</span>
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onFocusCurrentClick}
                    title="Focus on current position"
                  >
                    <i className="bi bi-bullseye"></i>
                    <span className="ms-1 d-none d-md-inline">Focus</span>
                  </button>
                </div>

                {/* Speed control */}
                <div className="d-flex align-items-center gap-2" style={{ minWidth: '180px' }}>
                  <label htmlFor="speed-control" className="form-label mb-0 text-nowrap">Speed:</label>
                  <Form.Range
                    id="speed-control"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={animationSpeed}
                    onChange={handleSpeedChange}
                    style={{ width: '100px' }}
                  />
                  <span className="text-nowrap">{animationSpeed.toFixed(1)}x</span>
                </div>

                {/* Auto-drift button */}
                <button
                  className={`btn btn-sm ${autoDrift ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={handleAutoDriftChange}
                >
                  <i className={`bi ${autoDrift ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
                  {autoDrift ? ' Auto' : ' Play'}
                </button>
              </div>
            </Col>
          )}
        </Row>
      </Container>
    </div>
  );
};

export default BottomBar;