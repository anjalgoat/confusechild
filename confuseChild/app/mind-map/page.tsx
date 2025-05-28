"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BrainCircuit } from "lucide-react";
import ReactFlow, { MiniMap, Controls, Background, Node, Edge, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { useMemo, useEffect, useState } from "react";
import dagre from 'dagre';

import MindMapNode from '@/components/ui/MindMapNode';

// --- Auto-layouting logic using Dagre ---
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Node dimensions (can be adjusted)
const nodeWidths = {
    root: 200,
    summary: 350,
    insight: 250,
};
const nodeHeights = {
    root: 70,
    summary: 200, // Adjusted for potentially longer summaries
    insight: 100,
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => { // Changed direction to 'TB'
  dagreGraph.setGraph({ 
    rankdir: direction,
    ranksep: 70,  // Distance between ranks (vertical levels)
    nodesep: 30,  // Distance between nodes in the same rank (horizontal)
  });

  nodes.forEach((node) => {
    const width = nodeWidths[node.data.type as keyof typeof nodeWidths] || nodeWidths.insight;
    const height = nodeHeights[node.data.type as keyof typeof nodeHeights] || nodeHeights.insight;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    // For TB layout, target is Top, source is Bottom
    node.targetPosition = Position.Top;
    node.sourcePosition = Position.Bottom;
    node.position = {
      x: nodeWithPosition.x - (nodeWidths[node.data.type as keyof typeof nodeWidths] || nodeWidths.insight) / 2,
      y: nodeWithPosition.y - (nodeHeights[node.data.type as keyof typeof nodeHeights] || nodeHeights.insight) / 2,
    };
  });

  return { nodes, edges };
};
// --- End of layouting logic ---


export default function MindMapPage() {
    const userProfile = useQuery(api.users.getMyUserProfile);
    const [layoutedNodes, setLayoutedNodes] = useState<Node[]>([]);
    const [layoutedEdges, setLayoutedEdges] = useState<Edge[]>([]);

    const nodeTypes = useMemo(() => ({ mindMapNode: MindMapNode }), []);

    useEffect(() => {
        if (userProfile) {
            const initialNodes: Node[] = [];
            const initialEdges: Edge[] = [];
            let lastSummaryNodeId = 'root'; // Start connecting from the root
            
            // Root Node
            initialNodes.push({
                id: 'root',
                type: 'mindMapNode',
                data: { label: 'Your Cognitive Mind', type: 'root' },
                position: {x: 0, y: 0}
            });
            
            // Summary Node
            if (userProfile.longTermProfileSummary) {
                initialNodes.push({
                    id: 'summary',
                    type: 'mindMapNode',
                    data: { label: `Summary: ${userProfile.longTermProfileSummary}`, type: 'summary' },
                    position: {x: 0, y: 0}
                });
                initialEdges.push({ id: 'e-root-summary', source: 'root', target: 'summary' });
                lastSummaryNodeId = 'summary'; // Insights will branch from the summary
            }

            // Insights Nodes
            if (userProfile.keyInsights && userProfile.keyInsights.length > 0) {
                 // Optional: Create an "Insights Hub" if you want to group them
                // initialNodes.push({
                //     id: 'insights-hub',
                //     type: 'mindMapNode',
                //     data: { label: 'Key Insights', type: 'root' }, // Use a different type if needed
                //     position: {x:0, y:0}
                // });
                // initialEdges.push({id: 'e-summary-insights-hub', source: lastSummaryNodeId, target: 'insights-hub'});
                // const insightsParentNodeId = 'insights-hub';

                // Connect insights directly to summary (or root if no summary)
                const insightsParentNodeId = lastSummaryNodeId; 

                userProfile.keyInsights.forEach((insight, index) => {
                    const beliefId = `belief-${index}`;
                    const triggerId = `trigger-${index}`;
                    
                    initialNodes.push({
                        id: beliefId,
                        type: 'mindMapNode',
                        data: { label: `Belief: "${insight.belief}"`, type: 'insight' },
                        position: {x: 0, y: 0}
                    });
                    // Connect belief to the parent (summary or insights-hub)
                    initialEdges.push({ id: `e-${insightsParentNodeId}-${beliefId}`, source: insightsParentNodeId, target: beliefId });

                    initialNodes.push({
                        id: triggerId,
                        type: 'mindMapNode',
                        data: { label: `Trigger: ${insight.trigger}`, type: 'insight' },
                        position: {x: 0, y: 0}
                    });
                    // Connect trigger to its belief
                    initialEdges.push({ id: `e-belief-${triggerId}`, source: beliefId, target: triggerId });
                });
            }

            if(initialNodes.length > 1) {
              const { nodes: finalNodes, edges: finalEdges } = getLayoutedElements(initialNodes, initialEdges);
              setLayoutedNodes(finalNodes);
              setLayoutedEdges(finalEdges);
            } else if (initialNodes.length === 1) { // Only root node
              setLayoutedNodes(initialNodes); 
              setLayoutedEdges(initialEdges);
            } else { // No data at all
              setLayoutedNodes([]);
              setLayoutedEdges([]);
            }
        }
    }, [userProfile]);

    if (userProfile === undefined) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <BrainCircuit className="h-12 w-12 animate-pulse text-blue-500" />
                <p className="mt-4 text-lg">Loading your cognitive profile...</p>
            </div>
        );
    }
    
    // Check if there's more than just the root node to display a meaningful map
    if (!userProfile || (!userProfile.longTermProfileSummary && (!userProfile.keyInsights || userProfile.keyInsights.length === 0))) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
                <BrainCircuit className="h-12 w-12 text-gray-400" />
                <h1 className="mt-4 text-2xl font-bold">Your Mind Map is Being Built</h1>
                <p className="mt-2 text-gray-600">End a session with the AI therapist to generate your mind map.</p>
                <Button asChild className="mt-6">
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen">
             <header className="absolute top-4 left-4 z-10 flex items-center gap-4">
                <Button asChild variant="outline" className="bg-white shadow-lg">
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Dashboard
                    </Link>
                </Button>
            </header>
            <ReactFlow
                nodes={layoutedNodes}
                edges={layoutedEdges}
                nodeTypes={nodeTypes}
                fitView
                className="bg-gray-100"
                defaultEdgeOptions={{
                    type: 'smoothstep',
                    animated: false,
                    style: { stroke: '#4b5563', strokeWidth: 1.5 }, // Darker stroke for better visibility
                    markerEnd: { type: 'arrowclosed', color: '#4b5563' },
                }}
            >
                <Controls />
                <MiniMap nodeStrokeWidth={3} zoomable pannable />
                <Background variant="dots" gap={16} size={1} />
            </ReactFlow>
        </div>
    );
}