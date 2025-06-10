// components/FlutterView.js

import React from 'react';

const FlutterView = ({ src }) => {
  if (!src) {
    return <div>Error: The Flutter app URL (src) is missing.</div>;
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
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        // We'll discuss the 'sandbox' attribute below
      />
    </div>
  );
};

export default FlutterView;