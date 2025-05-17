import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AppRoutes from './Routes';

const App: React.FC = () => (
  <BrowserRouter>
    <MainLayout>
      <AppRoutes />
    </MainLayout>
  </BrowserRouter>
);

export default App;
