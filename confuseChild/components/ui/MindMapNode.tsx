import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Brain, Lightbulb, FileText } from 'lucide-react';

const MindMapNode = ({ data }: NodeProps) => {
  const { label, type } = data;

  const typeStyles = {
    root: {
      icon: <Brain className="h-6 w-6 text-white" />,
      body: 'bg-blue-600 text-white shadow-xl',
      label: 'text-lg font-bold',
    },
    summary: {
      icon: <FileText className="h-5 w-5 text-gray-700" />,
      body: 'bg-white text-gray-800 shadow-md',
      label: 'text-sm',
    },
    insight: {
      icon: <Lightbulb className="h-5 w-5 text-yellow-600" />,
      body: 'bg-yellow-50 text-yellow-900 shadow-md',
      label: 'text-sm font-semibold',
    },
    default: {
      icon: <div />,
      body: 'bg-gray-200 text-gray-900 shadow-md',
      label: 'text-sm',
    }
  };

  const currentStyle = typeStyles[type as keyof typeof typeStyles] || typeStyles.default;

  return (
    <div className={`p-4 rounded-lg border border-gray-300 ${currentStyle.body}`} style={{ maxWidth: 300 }}>
      <Handle type="target" position={Position.Left} className="!bg-gray-500" />
      <div className="flex items-center gap-3">
        <div>{currentStyle.icon}</div>
        <div className={currentStyle.label}>{label}</div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-gray-500" />
    </div>
  );
};

export default memo(MindMapNode);