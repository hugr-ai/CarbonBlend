import { useMemo, useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
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
import { Loader2 } from 'lucide-react';

const nodeTypes = {
  field: FieldNode,
  facility: FacilityNode,
  processing: ProcessingNode,
  terminal: TerminalNode,
};

const edgeTypes = {
  pipeline: PipelineEdge,
};

export function NetworkGraph() {
  const selectedFieldNpdid = useScenarioStore((s) => s.selectedFieldNpdid);
  const { data: network, isLoading, error } = useNetwork(selectedFieldNpdid);

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!network) return { initialNodes: [], initialEdges: [] };

    const nodes: Node[] = network.nodes.map((n, i) => ({
      id: n.id,
      type: n.type || 'facility',
      position: n.position ?? { x: (i % 6) * 200, y: Math.floor(i / 6) * 150 },
      data: {
        label: n.label,
        ...n.data,
        selected: n.data.npdid === selectedFieldNpdid,
      },
    }));

    const edges: Edge[] = network.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'pipeline',
      data: e.data,
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
            Select a field to view its network
          </p>
          <p className="text-text-secondary/60 text-xs mt-1">
            Or view the full infrastructure network
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(184,255,225,0.05)" />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(n) => {
            if (n.type === 'field') return '#51cf66';
            if (n.type === 'processing') return '#00d4aa';
            if (n.type === 'terminal') return '#ffa94d';
            return '#4a6fa5';
          }}
          maskColor="rgba(0,16,77,0.7)"
        />
        <Controls />
      </ReactFlow>
    </div>
  );
}
