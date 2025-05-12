import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow">
        <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center">
          <h1 className="text-2xl font-bold text-gray-900">Timeline</h1>
        </nav>
      </header>
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto py-4 px-4">
          <p className="text-center text-gray-500">Timeline App</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;