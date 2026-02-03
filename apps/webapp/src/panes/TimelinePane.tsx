import { useEffect, useRef } from 'react';
import { Timeline } from 'vis-timeline/standalone';
import { DataSet } from 'vis-data';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGraph } from '../data/mockGraph';
import { RootState, selectNode, setTimeRange } from '../store';
import { trackGoldenPathStep } from '../telemetry';

export function TimelinePane() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const dispatch = useDispatch();
  const selectedNode = useSelector(
    (s: RootState) => s.selection.selectedNodeId,
  );

  useEffect(() => {
    fetchGraph().then((data) => {
      if (!containerRef.current) return;

      const items = new DataSet(
        data.nodes.map((n) => ({
          id: n.id,
          content: n.label,
          start: n.timestamp,
        })),
      );
      const timeline = new Timeline(containerRef.current!, items, {});
      timelineRef.current = timeline;

      timeline.on('select', (props) => {
        const id = props.items[0];
        dispatch(selectNode(id ?? null));
      });

      // Native time-brushing stub
      const centerDom = (timeline as any).dom.center;
      const onMouseUp = () => {
        const range = timeline.getWindow();
        dispatch(setTimeRange([range.start.valueOf(), range.end.valueOf()]));
      };

      if (centerDom) {
        centerDom.addEventListener('mouseup', onMouseUp);
      }
      trackGoldenPathStep('timeline_pane_loaded', 'success');
    });
  }, [dispatch]);

  useEffect(() => {
    if (timelineRef.current) {
      (timelineRef.current as any).setSelection(
        selectedNode ? [selectedNode] : [],
        {
          focus: true,
          animation: false,
        },
      );
    }
  }, [selectedNode]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
