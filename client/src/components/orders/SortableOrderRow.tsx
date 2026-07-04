import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableOrderRowProps {
  id: string;
  isReorderEnabled: boolean;
  children: React.ReactNode;
}

export const SortableOrderRow: React.FC<SortableOrderRowProps> = ({ id, isReorderEnabled, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isReorderEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.8 : 1,
    position: isDragging ? ('relative' as const) : ('static' as const),
    boxShadow: isDragging ? '0 5px 15px rgba(0,0,0,0.2)' : 'none',
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-muted/80 transition-colors text-[13px] tracking-tight bg-card ${isDragging ? 'bg-muted shadow-md' : ''}`}
    >
      {isReorderEnabled && (
        <td className="px-1 py-2 w-8 text-center cursor-grab active:cursor-grabbing">
          <div {...attributes} {...listeners} className="flex justify-center items-center text-muted-foreground hover:text-foreground">
            <GripVertical size={16} />
          </div>
        </td>
      )}
      {children}
    </tr>
  );
};
