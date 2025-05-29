"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BrainCircuit } from "lucide-react";
import ReactFlow, { MiniMap, Controls, Background, Node, Edge, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import { useMemo, useEffect, useState, useCallback } from "react";
import dagre from 'dagre';

import MindMapNode from '@/components/ui/MindMapNode';

// --- Auto-layouting logic using Dagre ---
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 250;
const nodeHeight = 70;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  dagreGraph.setGraph({ rankdir: direction, ranksep: 80, nodesep: 20 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = Position.Left;
    node.sourcePosition = Position.Right;
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
  });

  return { nodes, edges };
};
// --- End of layouting logic ---

export default function MindMapPage() {
    const userProfile = useQuery(api.users.getMyUserProfile);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));

    const nodeTypes = useMemo(() => ({ mindMapNode: MindMapNode }), []);
    
    const toggleNode = useCallback((nodeId: string) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    }, []);

    useEffect(() => {
        if (userProfile && userProfile.keyInsights) {
            const newNodes: Node[] = [];
            const newEdges: Edge[] = [];

            // Root Node
            newNodes.push({
                id: 'root',
                type: 'mindMapNode',
                data: { 
                    label: 'Your Key Insights', 
                    type: 'root',
                    hasChildren: true,
                    isExpanded: expandedNodes.has('root'),
                    onToggle: () => toggleNode('root'),
                },
                position: {x: 0, y: 0}
            });

            if (expandedNodes.has('root')) {
                userProfile.keyInsights.forEach((insight, index) => {
                    const beliefId = `belief-${index}`;
                    const triggerId = `trigger-${index}`;
                    const isBeliefExpanded = expandedNodes.has(beliefId);

                    // Belief Node
                    newNodes.push({
                        id: beliefId,
                        type: 'mindMapNode',
                        data: {
                            label: `Belief: "${insight.belief}"`,
                            type: 'belief',
                            hasChildren: true,
                            isExpanded: isBeliefExpanded,
                            onToggle: () => toggleNode(beliefId)
                        },
                        position: { x: 0, y: 0 }
                    });
                    newEdges.push({ id: `e-root-${beliefId}`, source: 'root', target: beliefId });

                    // Trigger Node (if belief is expanded)
                    if (isBeliefExpanded) {
                        newNodes.push({
                            id: triggerId,
                            type: 'mindMapNode',
                            data: {
                                label: `Trigger: ${insight.trigger}`,
                                type: 'trigger',
                                hasChildren: false,
                            },
                            position: { x: 0, y: 0 }
                        });
                        newEdges.push({ id: `e-belief-${triggerId}`, source: beliefId, target: triggerId });
                    }
                });
            }

            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
        }
    }, [userProfile, expandedNodes, toggleNode]);

    if (userProfile === undefined) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <BrainCircuit className="h-12 w-12 animate-pulse text-blue-500" />
                <p className="mt-4 text-lg">Loading your cognitive profile...</p>
            </div>
        );
    }
    
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
        <div className="flex flex-col w-screen h-screen bg-gray-100 dark:bg-gray-900">
             <header className="absolute top-4 left-4 z-10">
                <Button asChild variant="outline" className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-lg hover:bg-white dark:hover:bg-slate-800">
                    <Link href="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Dashboard
                    </Link>
                </Button>
            </header>
            
            <div className="p-4 sm:p-6">
                <Card className="max-w-4xl mx-auto shadow-lg border-gray-200/80 bg-white/80 dark:border-gray-700/80 dark:bg-slate-800/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">Cognitive Profile Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-base text-gray-700 dark:text-gray-300">
                            {userProfile.longTermProfileSummary}
                        </p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="flex-grow w-full h-full">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    fitView
                    defaultEdgeOptions={{
                        type: 'smoothstep',
                        animated: false,
                        style: { stroke: '#6b7280', strokeWidth: 1.5 },
                        markerEnd: { type: 'arrowclosed', color: '#6b7280' },
                    }}
                >
                    <Controls />
                    <MiniMap nodeStrokeWidth={3} zoomable pannable />
                    <Background variant="dots" gap={16} size={1} />
                </ReactFlow>
            </div>
        </div>
    );
}