import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch, type RootState } from '../store';
import { closeDetails } from '../store/slices/uiSlice';
import { SpecTimelineEvent, GitTimelineEvent } from '../data/types/TimelineEvent';
import SpecDetailsView from './details/SpecDetailsView';
import GitDetailsView from './details/GitDetailsView';
import { Logger } from '../utils/logging/Logger';

const DetailsSidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { sidebarOpen, selectedEventForDetails } = useAppSelector((state: RootState) => state.ui);
  const [layoutDimensions, setLayoutDimensions] = useState({ topOffset: 60, bottomOffset: 60 });

  const handleClose = () => {
    dispatch(closeDetails());
  };

  // ESC key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && sidebarOpen) {
        handleClose();
      }
    };

    if (sidebarOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [sidebarOpen]);

  // Mouse click outside handler
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (sidebarOpen && !target.closest('[data-sidebar-content]')) {
        handleClose();
      }
    };

    if (sidebarOpen) {
      document.addEventListener('mousedown', handleMouseDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [sidebarOpen]);

  // Calculate responsive layout dimensions
  useEffect(() => {
    const updateDimensions = () => {
      // Try to find actual TopBar and BottomBar elements for dynamic sizing
      const topBarElement = document.querySelector('.main-layout > :first-child') as HTMLElement;
      const bottomBarElement = document.querySelector('.main-layout > :last-child:not([data-sidebar-content])') as HTMLElement;
      
      const topOffset = topBarElement?.offsetHeight || 60;
      const bottomOffset = bottomBarElement?.offsetHeight || 60;
      
      setLayoutDimensions({ topOffset, bottomOffset });
    };

    // Update on mount and window resize
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    // Update when sidebar opens/closes in case layout changes
    if (sidebarOpen) {
      const timeout = setTimeout(updateDimensions, 100);
      return () => {
        clearTimeout(timeout);
        window.removeEventListener('resize', updateDimensions);
      };
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [sidebarOpen]);

  const renderContent = () => {
    if (!selectedEventForDetails) {
      return (
        <div className="p-8 text-center">
          <div className="bg-slate-800 rounded-lg p-8 shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-2">No Event Selected</h2>
            <p className="text-gray-400">Click on a timeline event to view details</p>
          </div>
        </div>
      );
    }

    // Debug logging using proper Logger
    Logger.debug('UI', 'sidebar', 'DetailsSidebar renderContent', {
      eventType: selectedEventForDetails.type,
      eventId: selectedEventForDetails.id,
      hasStats: !!selectedEventForDetails.stats,
      hasFullPromptText: !!(selectedEventForDetails as SpecTimelineEvent).fullPromptText,
      hasToolTypes: !!(selectedEventForDetails.stats as any)?.toolTypes,
      statsToolInvocations: (selectedEventForDetails as SpecTimelineEvent).stats?.toolInvocations
    });

    switch (selectedEventForDetails.type) {
      case 'spec':
        return <SpecDetailsView event={selectedEventForDetails as SpecTimelineEvent} />;
      case 'git':
        return <GitDetailsView event={selectedEventForDetails as GitTimelineEvent} />;
      default:
        return (
          <div className="p-8 text-center">
            <div className="bg-slate-800 rounded-lg p-8 shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-2">Unknown Event Type</h2>
              <p className="text-gray-400">Event type: {(selectedEventForDetails as any).type}</p>
            </div>
          </div>
        );
    }
  };

  const actualWidth = sidebarOpen ? 'min(45vw, max(480px, 35vw))' : '0px';
  const maxWidth = '600px';
  const minWidth = sidebarOpen ? '400px' : '0px';

  return (
    <div
      className="fixed left-0"
      style={{
        top: `${layoutDimensions.topOffset}px`,
        bottom: `${layoutDimensions.bottomOffset}px`,
        height: `calc(100vh - ${layoutDimensions.topOffset}px - ${layoutDimensions.bottomOffset}px)`,
        width: actualWidth,
        maxWidth,
        minWidth,
        backgroundColor: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(12px)',
        borderRight: sidebarOpen ? '1px solid rgba(71, 85, 105, 0.4)' : 'none',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 1100, // Higher than metrics plot's 1000
        overflow: 'hidden',
        position: 'fixed'
      }}
      data-sidebar-content
    >
      {/* Header - similar to metrics plot */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{
          height: '60px',
          borderBottom: sidebarOpen ? '1px solid rgba(71, 85, 105, 0.2)' : 'none',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          <span style={{
            color: 'rgba(248, 250, 252, 0.9)',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            {selectedEventForDetails?.type === 'spec' ? 'Specification Details' : 
             selectedEventForDetails?.type === 'git' ? 'Commit Details' : 
             'Event Details'}
          </span>
        </div>
      </div>

      {/* Content area */}
      <div
        className="relative overflow-y-auto"
        style={{
          height: 'calc(100% - 60px)', // Remaining height after header
          opacity: sidebarOpen ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
      >
        {renderContent()}
      </div>
    </div>
  );
};

export default DetailsSidebar;