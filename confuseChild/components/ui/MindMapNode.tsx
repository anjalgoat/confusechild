import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Brain, Lightbulb, Zap, ChevronDown, ChevronRight } from 'lucide-react';

const MindMapNode = ({ data }: NodeProps) => {
  const { label, type, onToggle, isExpanded, hasChildren } = data;

  const typeStyles = {
    root: {
      icon: <Brain className="h-5 w-5 text-white" />,
      body: 'bg-indigo-600 text-white shadow-xl',
      label: 'text-base font-semibold',
    },
    belief: {
      icon: <Lightbulb className="h-5 w-5 text-yellow-700" />,
      body: 'bg-yellow-50 text-yellow-900 shadow-md border border-yellow-200',
      label: 'text-sm',
    },
    trigger: {
      icon: <Zap className="h-5 w-5 text-yellow-700" />,
      body: 'bg-yellow-50 text-yellow-900 shadow-md border border-yellow-200',
      label: 'text-sm',
    },
    default: {
      icon: <div />,
      body: 'bg-gray-200 text-gray-900 shadow-md',
      label: 'text-sm',
    }
  };

  const currentStyle = typeStyles[type as keyof typeof typeStyles] || typeStyles.default;

  return (
    <div className={`p-3 rounded-lg relative ${currentStyle.body}`} style={{ minWidth: 200, maxWidth: 250 }}>
      <Handle type="target" position={Position.Left} className="!bg-gray-400 !w-2 !h-2" />
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">{currentStyle.icon}</div>
        <div className={currentStyle.label}>{label}</div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-gray-400 !w-2 !h-2" />

      {hasChildren && (
        <button
          onClick={onToggle}
          className="absolute top-1/2 -right-3 transform -translate-y-1/2 bg-white text-gray-600 hover:bg-gray-100 rounded-full p-0.5 shadow-md border z-10"
          aria-expanded={isExpanded}
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      )}
    </div>
  );
};

export default memo(MindMapNode);