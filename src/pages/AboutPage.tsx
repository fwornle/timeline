import React from 'react';

const AboutPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="max-w-2xl w-full bg-card/30 backdrop-blur-sm rounded-xl overflow-hidden relative border border-border shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 bg-indigo-500 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Timeline</h1>
          <p className="text-gray-400 mt-2">Version 1.0.0</p>
        </div>

        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">About</h2>
            <p>
              Timeline is an interactive 3D visualization tool for Git repository history. 
              It provides a unique way to explore the evolution of your codebase through time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Features</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>3D visualization of git commit history</li>
              <li>Interactive timeline navigation</li>
              <li>Automatic scrolling with adjustable speed</li>
              <li>Commit details on hover</li>
              <li>Support for enterprise GitHub instances</li>
              <li>Persistent repository data storage</li>
              <li>Responsive design</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">How to Use</h2>
            <p className="mb-2">
              To get started, click the settings icon in the top right corner and enter a Git repository URL.
              For private repositories, you'll need to provide authentication credentials.
            </p>
            <p>
              Once loaded, you can navigate the timeline using your mouse or trackpad. 
              Use the controls in the bottom bar to adjust animation speed and toggle auto-drift.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
