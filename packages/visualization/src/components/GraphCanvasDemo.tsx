import React from 'react';
import { VisualizationThemeProvider, DataProvider, InteractionProvider } from '../contexts';
import GraphCanvasExample from './GraphCanvasExample';
import AdvancedGraphCanvasExample from './AdvancedGraphCanvasExample';

const GraphCanvasDemo: React.FC = () => {
  return (
    <VisualizationThemeProvider>
      <DataProvider>
        <InteractionProvider>
          <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>IntelGraph Graph Canvas Demo</h1>
            
            <div style={{ marginBottom: '40px' }}>
              <h2>Basic Graph Canvas</h2>
              <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '10px', height: '500px' }}>
                <GraphCanvasExample />
              </div>
            </div>
            
            <div>
              <h2>Advanced Graph Canvas with Filtering and Highlighting</h2>
              <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '10px', height: '700px' }}>
                <AdvancedGraphCanvasExample />
              </div>
            </div>
          </div>
        </InteractionProvider>
      </DataProvider>
    </VisualizationThemeProvider>
  );
};

export default GraphCanvasDemo;