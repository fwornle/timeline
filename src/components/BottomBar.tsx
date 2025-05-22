import React from 'react';
import { Container, Row, Col, Form } from 'react-bootstrap';
import { usePreferences } from '../context/PreferencesContext';
import type { CameraState } from './three/TimelineCamera';
import { Vector3 } from 'three';

interface BottomBarProps {
  gitCount?: number;
  specCount?: number;
  isLoading?: boolean;
  isGitHistoryMocked?: boolean;
  isSpecHistoryMocked?: boolean;
  currentPosition?: number;
  cameraPosition?: { x: number, y: number, z: number };
  cameraState?: CameraState;
  animationSpeed?: number;
  autoDrift?: boolean;
  debugMode?: boolean;
  startDate?: Date;
  endDate?: Date;
  timelineLength?: number;
  onAnimationSpeedChange?: (speed: number) => void;
  onAutoDriftChange?: (enabled: boolean) => void;
  onViewAllClick?: () => void;
  onFocusCurrentClick?: () => void;
  onDebugModeChange?: (enabled: boolean) => void;
  onResetTimeline?: () => void;
  onSaveCameraState?: (state: CameraState) => void;
}

const BottomBar: React.FC<BottomBarProps> = ({
  gitCount = 0,
  specCount = 0,
  isLoading = false,
  isGitHistoryMocked = false,
  isSpecHistoryMocked = false,
  currentPosition = 0,
  cameraPosition = { x: -35, y: 30, z: -50 }, // Default camera position
  cameraState,
  animationSpeed = 1,
  autoDrift = false,
  debugMode = false,
  startDate,
  endDate,
  timelineLength = 100,
  onAnimationSpeedChange,
  onAutoDriftChange,
  onViewAllClick,
  onFocusCurrentClick,
  onDebugModeChange,
  onResetTimeline,
  onSaveCameraState
}) => {
  const { preferences } = usePreferences();
  const repoUrl = preferences.repoUrl || '';
  const showControls = !!repoUrl;

  // Force re-render on debug mode changes
  const [lastDebugModeChange, setLastDebugModeChange] = React.useState(Date.now());

  // Log when camera state changes (for debugging)
  React.useEffect(() => {
    if (cameraState && debugMode) {
      console.log('[BottomBar] Camera state received:', {
        id: Date.now(),
        position: { 
          x: cameraState.position.x.toFixed(2), 
          y: cameraState.position.y.toFixed(2), 
          z: cameraState.position.z.toFixed(2) 
        },
        target: { 
          x: cameraState.target.x.toFixed(2), 
          y: cameraState.target.y.toFixed(2), 
          z: cameraState.target.z.toFixed(2) 
        },
        zoom: cameraState.zoom.toFixed(2),
        isZoomDefault: cameraState.zoom === 1,
        isTargetZero: cameraState.target.x === 0 && cameraState.target.y === 0 && cameraState.target.z === 0,
        hasPosition: !!cameraState.position,
        hasTarget: !!cameraState.target
      });
    }
  }, [cameraState, debugMode]);

  // Log when debug mode changes
  React.useEffect(() => {
    if (debugMode) {
      console.log('BottomBar: Debug mode changed to:', debugMode);
    }
    // Force component re-render when debug mode changes
    setLastDebugModeChange(Date.now());
  }, [debugMode]);

  // Conditional logging inside the component
  React.useEffect(() => {
    if (debugMode) {
      console.log('BottomBar rendering with debugMode:', debugMode, 'lastChange:', lastDebugModeChange);
    }
  }, [debugMode, lastDebugModeChange]);

  // Helper function to convert position to a date
  const positionToDate = (): string => {
    if (!startDate || !endDate) {
      return `Position: ${currentPosition.toFixed(2)}`;
    }

    try {
      // Get the full time range of the timeline
      const startTimestamp = startDate.getTime();
      const endTimestamp = endDate.getTime();
      const timeRange = endTimestamp - startTimestamp;

      // Use the actual timelineLength passed as a prop
      const actualTimelineLength = timelineLength;

      // Estimate the position range of the timeline in the scene
      // Timeline runs from -length/2 to +length/2
      const estimatedTimelineStartZ = -actualTimelineLength / 2;
      const estimatedTimelineEndZ = actualTimelineLength / 2;

      // Calculate the position's normalized location on the timeline (0 to 1)
      // Clamp value between 0 and 1 to handle edge cases
      const normalizedPosition = Math.max(0, Math.min(1,
        (currentPosition - estimatedTimelineStartZ) / (estimatedTimelineEndZ - estimatedTimelineStartZ)
      ));

      // Map the normalized position to a timestamp
      const currentTimestamp = startTimestamp + (normalizedPosition * timeRange);
      const currentDate = new Date(currentTimestamp);

      // Format the date
      return currentDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Error calculating date from position:', e);
      return `Position: ${currentPosition.toFixed(2)}`;
    }
  };

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

  const handleDebugModeChange = () => {
    if (debugMode) {
      console.log('Debug mode change requested, current value:', debugMode);
    }
    if (onDebugModeChange) {
      const newValue = !debugMode;
      if (debugMode) {
        console.log('Calling onDebugModeChange with new value:', newValue);
      }
      onDebugModeChange(newValue);
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
                <span className={`badge bg-secondary ${isGitHistoryMocked ? 'border border-warning' : ''}`}
                      style={{ borderWidth: isGitHistoryMocked ? '2px' : '0' }}>
                  <i className="bi bi-git me-1"></i>
                  {isLoading ? 'Loading...' : `${gitCount} commits`}
                </span>
                <span className={`badge bg-info ${isSpecHistoryMocked ? 'border border-warning' : ''}`}
                      style={{ borderWidth: isSpecHistoryMocked ? '2px' : '0' }}>
                  <i className="bi bi-chat-dots me-1"></i>
                  {isLoading ? 'Loading...' : `${specCount} prompts`}
                </span>
                {/* Debug info for troubleshooting */}
                {debugMode && (
                  <span className="badge bg-dark text-white ms-2">
                    <i className="bi bi-info-circle me-1"></i>
                    Debug: {gitCount}/{specCount}
                  </span>
                )}
                <span className="badge bg-primary">
                  <i className="bi bi-clock-history me-1"></i>
                  {positionToDate()}
                </span>
                <span
                  className="badge bg-primary text-white"
                  style={{
                    cursor: 'pointer',
                    padding: '8px',
                    display: 'inline-block',
                    lineHeight: '1.2',
                    transition: 'all 0.2s ease',
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  onClick={() => {
                    if (cameraState && onSaveCameraState) {
                      // Create a new camera state object with pristine Vector3 instances
                      const stateToSave: CameraState = {
                        position: new Vector3(
                          cameraState.position.x,
                          cameraState.position.y,
                          cameraState.position.z
                        ),
                        target: new Vector3(
                          cameraState.target.x,
                          cameraState.target.y,
                          cameraState.target.z
                        ),
                        zoom: cameraState.zoom
                      };
                      onSaveCameraState(stateToSave);
                    } else {
                      alert('Cannot save camera view - no camera state available.');
                    }
                  }}
                  title="Click to save this camera view"
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#0d6efd';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                >
                  <i className="bi bi-camera me-1"></i>
                  <div style={{ textAlign: 'left' }}>
                    {cameraState ? (
                      <>
                        <div><small>Pos: {cameraState.position.x.toFixed(1)}, {cameraState.position.y.toFixed(1)}, {cameraState.position.z.toFixed(1)}</small></div>
                        <div><small>Look: {cameraState.target.x.toFixed(1)}, {cameraState.target.y.toFixed(1)}, {cameraState.target.z.toFixed(1)}</small></div>
                        <div><small>Zoom: {cameraState.zoom.toFixed(2)}x</small></div>
                        <div><small style={{ color: '#aaffff' }}>Click to save view</small></div>
                      </>
                    ) : (
                      <>XYZ: {cameraPosition?.x?.toFixed(1) || '0.0'}, {cameraPosition?.y?.toFixed(1) || '0.0'}, {cameraPosition?.z?.toFixed(1) || '0.0'}</>
                    )}
                  </div>
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
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onFocusCurrentClick}
                    title="Focus on current position"
                  >
                    <i className="bi bi-bullseye"></i>
                  </button>
                  {/* Reset Timeline Position Button */}
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onResetTimeline}
                    title="Reset Timeline Position"
                    aria-label="Reset Timeline Position"
                  >
                    <i className="bi bi-arrow-counterclockwise" />
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
                  title={autoDrift ? 'Pause auto-drift' : 'Play auto-drift'}
                >
                  <i className={`bi ${autoDrift ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
                </button>

                {/* Debug mode toggle */}
                <button
                  className={`btn btn-sm ${debugMode ? 'btn-danger' : 'btn-outline-danger'}`}
                  onClick={handleDebugModeChange}
                  title="Toggle camera debug mode"
                  style={{ 
                    position: 'relative',
                    overflow: 'visible'
                  }}
                >
                  <i className="bi bi-camera"></i>
                  {debugMode && (
                    <span 
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        backgroundColor: 'red',
                        borderRadius: '50%',
                        width: '12px',
                        height: '12px',
                        border: '2px solid white'
                      }}
                    />
                  )}
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