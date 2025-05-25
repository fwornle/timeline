import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form } from 'react-bootstrap';
import { useAppSelector } from '../store';
import type { CameraState } from './three/TimelineCamera';
import { useLogger } from '../utils/logging/hooks/useLogger';

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
  droneMode?: boolean;
  debugMode?: boolean;
  startDate?: Date;
  endDate?: Date;
  timelineLength?: number;
  onAnimationSpeedChange?: (speed: number) => void;
  onAutoDriftChange?: (enabled: boolean) => void;
  onDroneModeChange?: (enabled: boolean) => void;
  onViewAllClick?: () => void;
  onFocusCurrentClick?: () => void;
  onDebugModeChange?: (enabled: boolean) => void;
  onResetTimeline?: () => void;
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
  droneMode = false,
  debugMode = false,
  startDate,
  endDate,
  timelineLength = 100,
  onAnimationSpeedChange,
  onAutoDriftChange,
  onDroneModeChange,
  onViewAllClick,
  onFocusCurrentClick,
  onDebugModeChange,
  onResetTimeline
}) => {
  const logger = useLogger({ component: 'BottomBar', topic: 'ui' });
  const repoUrl = useAppSelector(state => state.preferences.repoUrl);
  const showControls = !!repoUrl;

  // Force re-render on debug mode changes
  const [lastDebugModeChange, setLastDebugModeChange] = React.useState(Date.now());

  // Log when camera state changes (for debugging)
  React.useEffect(() => {
    if (cameraState && debugMode) {
      logger.debug('Camera state received:', {
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
      logger.debug('Debug mode changed to:', { debugMode });
    }
    // Force component re-render when debug mode changes
    setLastDebugModeChange(Date.now());
  }, [debugMode]);

  // Conditional logging inside the component
  React.useEffect(() => {
    if (debugMode) {
      logger.debug('BottomBar rendering with debugMode:', { debugMode, lastChange: lastDebugModeChange });
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
      logger.error('Error calculating date from position:', { error: e });
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

  const handleDroneModeChange = () => {
    if (onDroneModeChange) {
      onDroneModeChange(!droneMode);
    }
  };

  const handleDebugModeChange = () => {
    if (debugMode) {
      logger.debug('Debug mode change requested, current value:', { debugMode });
    }
    if (onDebugModeChange) {
      const newValue = !debugMode;
      if (debugMode) {
        logger.debug('Calling onDebugModeChange with new value:', { newValue });
      }
      onDebugModeChange(newValue);
    }
  };

  // Helper function to convert camera target position to a date
  const targetPositionToDate = (targetZ: number): string => {
    if (!startDate || !endDate) {
      return `Z: ${targetZ.toFixed(2)}`;
    }

    try {
      // Get the full time range of the timeline
      const startTimestamp = startDate.getTime();
      const endTimestamp = endDate.getTime();
      const timeRange = endTimestamp - startTimestamp;

      // Estimate timeline bounds (same logic as positionToDate)
      const estimatedTimelineStartZ = -timelineLength / 2;
      const estimatedTimelineEndZ = timelineLength / 2;

      // Calculate the position's normalized location on the timeline (0 to 1)
      // Clamp value between 0 and 1 to handle edge cases
      const normalizedPosition = Math.max(0, Math.min(1,
        (targetZ - estimatedTimelineStartZ) / (estimatedTimelineEndZ - estimatedTimelineStartZ)
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
      logger.error('Error calculating date from target position:', { error: e });
      return `Z: ${targetZ.toFixed(2)}`;
    }
  };

  const [showCameraDetails, setShowCameraDetails] = useState(false);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const popover = document.getElementById('camera-details-popover');
      const button = document.getElementById('camera-details-button');
      if (popover && button &&
          !popover.contains(event.target as Node) &&
          !button.contains(event.target as Node)) {
        setShowCameraDetails(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      className="border-top py-3"
      style={{
        backgroundColor: 'var(--color-surface-elevated-light)',
        borderTopColor: 'var(--color-border-light)',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)'
      }}
    >
      <Container fluid>
        <Row className="align-items-center">
          {/* Repository Status (left) */}
          <Col xs={12} md={6} className="text-md-start text-center mb-2 mb-md-0">
            {showControls ? (
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <span
                  className={`badge ${isGitHistoryMocked ? 'border' : ''}`}
                  style={{
                    backgroundColor: 'var(--color-primary-600)',
                    color: 'white',
                    borderColor: isGitHistoryMocked ? 'var(--color-warning)' : 'transparent',
                    borderWidth: isGitHistoryMocked ? '2px' : '0',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}
                >
                  <i className="bi bi-git me-1"></i>
                  {isLoading ? 'Loading...' : `${gitCount} commits`}
                </span>
                <span
                  className={`badge ${isSpecHistoryMocked ? 'border' : ''}`}
                  style={{
                    backgroundColor: 'var(--color-accent-600)',
                    color: 'white',
                    borderColor: isSpecHistoryMocked ? 'var(--color-warning)' : 'transparent',
                    borderWidth: isSpecHistoryMocked ? '2px' : '0',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}
                >
                  <i className="bi bi-chat-dots me-1"></i>
                  {isLoading ? 'Loading...' : `${specCount} prompts`}
                </span>
                {/* Debug info for troubleshooting */}
                {debugMode && (
                  <span
                    className="badge ms-2"
                    style={{
                      backgroundColor: 'var(--color-primary-900)',
                      color: 'white',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}
                  >
                    <i className="bi bi-info-circle me-1"></i>
                    Debug: {gitCount}/{specCount}
                  </span>
                )}
                <span
                  className="badge"
                  style={{
                    backgroundColor: 'var(--color-accent-500)',
                    color: 'white',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}
                >
                  <i className="bi bi-clock-history me-1"></i>
                  {positionToDate()}
                </span>
              </div>
            ) : (
              <span
                style={{
                  color: 'var(--color-text-secondary-light)',
                  fontSize: '0.875rem'
                }}
              >
                Enter a repository URL to begin
              </span>
            )}
          </Col>

          {/* Animation Controls and Camera/Debug (right) */}
          {showControls && (
            <Col xs={12} md={6} className="text-md-end text-center mt-2 mt-md-0">
              <div className="d-flex flex-wrap align-items-center justify-content-md-end justify-content-center gap-2">
                {/* Camera control buttons */}
                <div className="d-flex align-items-center gap-1">
                  <button
                    className="btn btn-sm"
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--color-primary-400)',
                      color: 'var(--color-primary-700)',
                      borderRadius: '6px',
                      padding: '0.25rem 0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-primary-100)';
                      e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = 'var(--color-primary-400)';
                    }}
                    onClick={onViewAllClick}
                    title="View all events"
                  >
                    <i className="bi bi-arrows-fullscreen"></i>
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--color-primary-400)',
                      color: 'var(--color-primary-700)',
                      borderRadius: '6px',
                      padding: '0.25rem 0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-primary-100)';
                      e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = 'var(--color-primary-400)';
                    }}
                    onClick={onFocusCurrentClick}
                    title="Focus on current position"
                  >
                    <i className="bi bi-bullseye"></i>
                  </button>
                  {/* Reset Timeline Position Button */}
                  <button
                    className="btn btn-sm"
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--color-primary-400)',
                      color: 'var(--color-primary-700)',
                      borderRadius: '6px',
                      padding: '0.25rem 0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-primary-100)';
                      e.currentTarget.style.borderColor = 'var(--color-primary-500)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = 'var(--color-primary-400)';
                    }}
                    onClick={onResetTimeline}
                    title="Reset Timeline Position"
                    aria-label="Reset Timeline Position"
                  >
                    <i className="bi bi-arrow-counterclockwise" />
                  </button>
                </div>

                {/* Speed control */}
                <div className="d-flex align-items-center gap-1" style={{ minWidth: '140px' }}>
                  <label
                    htmlFor="speed-control"
                    className="form-label mb-0 text-nowrap d-none d-md-inline"
                    style={{
                      color: 'var(--color-text-secondary-light)',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}
                  >
                    Speed:
                  </label>
                  <Form.Range
                    id="speed-control"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={animationSpeed}
                    onChange={handleSpeedChange}
                    style={{
                      width: '80px',
                      accentColor: 'var(--color-accent-500)'
                    }}
                  />
                  <span
                    className="text-nowrap"
                    style={{
                      color: 'var(--color-text-primary-light)',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}
                  >
                    {animationSpeed.toFixed(1)}x
                  </span>
                </div>

                {/* Play button (timeline animation only) */}
                <button
                  className="btn btn-sm"
                  style={{
                    backgroundColor: autoDrift ? 'var(--color-accent-600)' : 'transparent',
                    border: '1px solid var(--color-accent-600)',
                    color: autoDrift ? 'white' : 'var(--color-accent-600)',
                    borderRadius: '6px',
                    padding: '0.25rem 0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!autoDrift) {
                      e.currentTarget.style.backgroundColor = 'var(--color-accent-50)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!autoDrift) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  onClick={handleAutoDriftChange}
                  title={autoDrift ? 'Pause timeline animation' : 'Play timeline animation'}
                >
                  <i className={`bi ${autoDrift ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
                </button>

                {/* Drone mode button */}
                <button
                  className="btn btn-sm"
                  style={{
                    backgroundColor: droneMode ? 'var(--color-primary-600)' : 'transparent',
                    border: '1px solid var(--color-primary-600)',
                    color: droneMode ? 'white' : 'var(--color-primary-600)',
                    borderRadius: '6px',
                    padding: '0.25rem 0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!droneMode) {
                      e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!droneMode) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  onClick={handleDroneModeChange}
                  title={droneMode ? 'Disable drone camera mode' : 'Enable drone camera mode'}
                >
                  <i className="bi bi-airplane"></i>
                </button>

                {/* Debug mode toggle - now a bug icon */}
                <button
                  className="btn btn-sm"
                  style={{
                    backgroundColor: debugMode ? 'var(--color-error)' : 'transparent',
                    border: '1px solid var(--color-error)',
                    color: debugMode ? 'white' : 'var(--color-error)',
                    borderRadius: '6px',
                    padding: '0.25rem 0.5rem',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'visible'
                  }}
                  onMouseEnter={(e) => {
                    if (!debugMode) {
                      e.currentTarget.style.backgroundColor = '#fef2f2';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!debugMode) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  onClick={handleDebugModeChange}
                  title="Toggle camera debug mode"
                >
                  <i className="bi bi-bug"></i>
                  {debugMode && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        backgroundColor: 'var(--color-error)',
                        borderRadius: '50%',
                        width: '12px',
                        height: '12px',
                        border: '2px solid white'
                      }}
                    />
                  )}
                </button>

                {/* Camera indicator - far right */}
                <div style={{ position: 'relative', marginLeft: '8px' }}>
                  <button
                    id="camera-details-button"
                    className="btn btn-sm"
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid var(--color-accent-600)',
                      color: 'var(--color-accent-600)',
                      borderRadius: '6px',
                      padding: '0.375rem 0.5rem',
                      transition: 'all 0.2s ease',
                      minWidth: '36px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-accent-50)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => setShowCameraDetails(!showCameraDetails)}
                    title="Show camera view details"
                  >
                    <i className="bi bi-camera"></i>
                    {cameraState && (
                      <span className="d-none d-lg-inline" style={{ marginLeft: 4, fontSize: '0.85em' }}>
                        {cameraState.zoom.toFixed(1)}x
                      </span>
                    )}
                  </button>
                  {showCameraDetails && (
                    <div
                      id="camera-details-popover"
                      style={{
                        position: 'absolute',
                        right: 0,
                        bottom: 'calc(100% + 8px)',
                        background: 'var(--color-surface-light)',
                        color: 'var(--color-text-primary-light)',
                        border: '1px solid var(--color-border-light)',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                        padding: '12px',
                        minWidth: '280px',
                        maxWidth: '90vw',
                        zIndex: 99999,
                      }}
                    >
                      <div style={{
                        fontWeight: 600,
                        fontSize: '1.05em',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'var(--color-primary-700)'
                      }}>
                        <i className="bi bi-camera"></i> Camera View Details
                      </div>
                      <div style={{ textAlign: 'left', fontSize: '0.875rem' }}>
                        {cameraState ? (
                          <>
                            <div style={{ marginBottom: '6px' }}>
                              <small style={{ color: 'var(--color-text-secondary-light)' }}>
                                <b>Position:</b> {cameraState.position.x.toFixed(1)}, {cameraState.position.y.toFixed(1)}, {cameraState.position.z.toFixed(1)}
                              </small>
                            </div>
                            <div style={{ marginBottom: '6px' }}>
                              <small style={{ color: 'var(--color-text-secondary-light)' }}>
                                <b>Target:</b> {cameraState.target.x.toFixed(1)}, {cameraState.target.y.toFixed(1)}, {cameraState.target.z.toFixed(1)}
                              </small>
                            </div>
                            <div style={{ marginBottom: '6px' }}>
                              <small style={{ color: 'var(--color-text-secondary-light)' }}>
                                <b>Target Date:</b> {targetPositionToDate(cameraState.target.z)}
                              </small>
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                              <small style={{ color: 'var(--color-text-secondary-light)' }}>
                                <b>Zoom:</b> {cameraState.zoom.toFixed(2)}x
                              </small>
                            </div>
                            <div style={{
                              marginTop: '12px',
                              color: 'var(--color-accent-600)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px',
                              backgroundColor: 'var(--color-accent-50)',
                              borderRadius: '4px',
                              fontSize: '0.8rem'
                            }}>
                              <i className="bi bi-info-circle"></i>
                              <span>View is auto-saved and restored on restart.</span>
                            </div>
                          </>
                        ) : (
                          <div style={{ color: 'var(--color-text-secondary-light)' }}>
                            XYZ: {cameraPosition?.x?.toFixed(1) || '0.0'}, {cameraPosition?.y?.toFixed(1) || '0.0'}, {cameraPosition?.z?.toFixed(1) || '0.0'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Col>
          )}
        </Row>
      </Container>
    </div>
  );
};

export default BottomBar;