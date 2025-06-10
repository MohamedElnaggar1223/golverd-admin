// components/FlutterView.tsx

import React from 'react';

interface FlutterViewProps {
  src: string;
}

const FlutterView: React.FC<FlutterViewProps> = ({ src }) => {
  if (!src) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">Configuration Error</p>
          <p className="mt-2">The Flutter app URL (src) is missing.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <iframe
        src={src}
        style={{
          width: '100%',
          height: '100%',
          border: 'none', // Hides the default iframe border
        }}
        title="Embedded Flutter Application"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-storage-access-by-user-activation"
        allow="camera; microphone; geolocation"
        loading="lazy"
      />
    </div>
  );
};

export default FlutterView;