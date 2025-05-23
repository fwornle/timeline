import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AppRoutes from './Routes';
import { Logger } from './utils/logging/Logger';

const App: React.FC = () => {
  useEffect(() => {
    // Test the logging system
    Logger.info(Logger.Categories.LIFECYCLE, 'Timeline app started');
    Logger.debug(Logger.Categories.UI, 'App component mounted');
    Logger.trace(Logger.Categories.CONFIG, 'Configuration loaded');

    // Make Logger available globally for console testing
    (window as any).Logger = Logger;

    Logger.info(Logger.Categories.LIFECYCLE, 'Logger is now available globally as window.Logger');
    Logger.info(Logger.Categories.LIFECYCLE, 'Try: Logger.info(Logger.Categories.UI, "Test message")');
  }, []);

  return (
    <BrowserRouter>
      <MainLayout>
        <AppRoutes />
      </MainLayout>
    </BrowserRouter>
  );
};

export default App;
