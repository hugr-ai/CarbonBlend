import { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNetwork } from '@/hooks/useNetwork';
import { useScenarioStore } from '@/stores/scenarioStore';
import { FieldNode } from './FieldNode';
import { FacilityNode } from './FacilityNode';
import { ProcessingNode } from './ProcessingNode';
import { TerminalNode } from './TerminalNode';
import { PipelineEdge } from './PipelineEdge';
import { NetworkLegend } from './NetworkLegend';
import { Loader2 } from 'lucide-react';

const nodeTypes = {
  field: FieldNode,
  facility: FacilityNode,
  processing: ProcessingNode,
  processing_plant: ProcessingNode,
  terminal: TerminalNode,
  export_terminal: TerminalNode,
};

const edgeTypes = {
  pipeline: PipelineEdge,
};

function NetworkGraphInner() {
  const selectedFieldNpdid = useScenarioStore((s) => s.selectedFieldNpdid);
  const { data: network, isLoading, error } = useNetwork(selectedFieldNpdid);
  const { fitView } = useReactFlow();
  const prevFieldRef = useRef<number | null | undefined>(undefined);

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!network) return { initialNodes: [], initialEdges: [] };

    const nodes: Node[] = network.nodes.map((n, i) => ({
      id: n.id,
      type: n.type || 'facility',
      position: n.position ?? { x: (i % 8) * 220, y: Math.floor(i / 8) * 180 },
      data: {
        label: n.data?.label ?? n.label,
        ...n.data,
        // Map co2_mol_pct to co2 for FieldNode component
        co2: n.data?.co2_mol_pct ?? n.data?.co2,
        selected: n.data?.npdid === selectedFieldNpdid,
      },
    }));

    const edges: Edge[] = network.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'pipeline',
      data: {
        ...e.data,
        // Map backend field names to frontend component expectations
        name: e.label || e.data?.label,
        diameter: e.data?.diameter_inches ?? e.data?.diameter,
        co2Limit: e.data?.co2_limit ?? e.data?.co2Limit,
        tariff: e.data?.tariff_nok_sm3 ?? e.data?.tariff,
        medium: e.data?.medium,
      },
    }));

    return { initialNodes: nodes, initialEdges: edges };
  }, [network, selectedFieldNpdid]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes/edges when data changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Smooth fitView when field selection changes
  useEffect(() => {
    if (prevFieldRef.current !== selectedFieldNpdid && initialNodes.length > 0) {
      // Small delay to let React Flow layout the nodes
      const timer = setTimeout(() => {
        fitView({ padding: 0.15, duration: 600 });
      }, 100);
      prevFieldRef.current = selectedFieldNpdid;
      return () => clearTimeout(timer);
    }
  }, [selectedFieldNpdid, initialNodes, fitView]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'field' && node.data.npdid) {
        const npdid = node.data.npdid as number;
        useScenarioStore.getState().setSelectedField(
          npdid === selectedFieldNpdid ? null : npdid
        );
      }
    },
    [selectedFieldNpdid]
  );

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-teal animate-spin" />
          <span className="text-sm text-text-secondary">Loading network...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface">
        <div className="text-center">
          <p className="text-danger text-sm">Failed to load network data</p>
          <p className="text-text-secondary text-xs mt-1">
            Check that the backend is running on port 8000
          </p>
        </div>
      </div>
    );
  }

  if (!network || network.nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface">
        <div className="text-center">
          <p className="text-text-secondary text-sm">
            {selectedFieldNpdid
              ? 'No network data for selected field'
              : 'Loading infrastructure network...'}
          </p>
          <p className="text-text-secondary/60 text-xs mt-1">
            Select a field to view its transport route
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.05}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'pipeline' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(0, 212, 170, 0.06)"
        />
        <MiniMap
          position="bottom-right"
          nodeStrokeWidth={3}
          nodeColor={(n) => {
            if (n.type === 'field') return '#51cf66';
            if (n.type === 'processing' || n.type === 'processing_plant') return '#00d4aa';
            if (n.type === 'terminal' || n.type === 'export_terminal') return '#ffa94d';
            return '#4a6fa5';
          }}
          maskColor="rgba(0, 16, 77, 0.75)"
          style={{
            background: '#00104d',
            border: '1px solid rgba(184, 255, 225, 0.15)',
            borderRadius: 8,
          }}
        />
        <Controls
          position="bottom-left"
          showInteractive={false}
        />
      </ReactFlow>

      {/* Legend overlay */}
      <NetworkLegend />

      {/* Selected field indicator */}
      {selectedFieldNpdid && (
        <div
          className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px]"
          style={{
            background: 'rgba(10, 22, 40, 0.9)',
            border: '1px solid rgba(0, 212, 170, 0.3)',
          }}
        >
          <div className="w-2 h-2 rounded-full bg-teal-dark animate-pulse" />
          <span className="text-text-secondary">Subgraph view</span>
          <button
            className="text-text-secondary hover:text-text-primary text-[10px] ml-1 cursor-pointer bg-transparent border-none"
            onClick={() => useScenarioStore.getState().setSelectedField(null)}
          >
            [show all]
          </button>
        </div>
      )}
    </div>
  );
}

export function NetworkGraph() {
  return (
    <ReactFlowProvider>
      <NetworkGraphInner />
    </ReactFlowProvider>
  );
}
