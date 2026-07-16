import React, { useState } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { ALL_MENU_ITEMS, MenuItem } from '../src/constants/menuItems';
import { MenuConfigItem } from '../types/coreTypes';

interface SortableItemProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  hasSubItems?: boolean;
}

const SortableItem: React.FC<SortableItemProps> = ({ 
  id, 
  label, 
  icon, 
  children, 
  isExpanded, 
  onToggle,
  hasSubItems 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <div className={`flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm ${isDragging ? 'border-primary-500 ring-2 ring-primary-100' : ''}`}>
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 transition-colors">
          <GripVertical size={18} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-slate-500 shrink-0">{icon}</span>
          <span className="text-sm font-bold text-slate-700 truncate font-nepali">{label}</span>
        </div>
        {hasSubItems && (
          <button 
            onClick={onToggle}
            className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-all"
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        )}
      </div>
      {isExpanded && children && (
        <div className="ml-8 mt-2 pl-4 border-l-2 border-slate-100 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
};

interface MenuManagementProps {
  currentConfig?: MenuConfigItem[];
  onSave: (config: MenuConfigItem[]) => void;
}

export const MenuManagement: React.FC<MenuManagementProps> = ({ currentConfig, onSave }) => {
  const [config, setConfig] = useState<MenuConfigItem[]>(() => {
    if (currentConfig && currentConfig.length > 0) {
      return JSON.parse(JSON.stringify(currentConfig));
    }
    // Default config from ALL_MENU_ITEMS
    return ALL_MENU_ITEMS.map(item => ({
      id: item.id,
      subItems: item.subItems?.map(sub => ({
        id: sub.id,
        subItems: sub.subItems?.map(child => ({ id: child.id }))
      }))
    }));
  });

  const [isSaving, setIsSaving] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDragEnd = (event: DragEndEvent, parentId?: string, subParentId?: string) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setConfig((prev) => {
        const newConfig = JSON.parse(JSON.stringify(prev)) as MenuConfigItem[];
        
        if (subParentId && parentId) {
          // Reordering level 3 items
          const parent = newConfig.find(m => m.id === parentId);
          const subParent = parent?.subItems?.find(m => m.id === subParentId);
          if (subParent?.subItems) {
            const oldIndex = subParent.subItems.findIndex(m => m.id === active.id);
            const newIndex = subParent.subItems.findIndex(m => m.id === over?.id);
            subParent.subItems = arrayMove(subParent.subItems, oldIndex, newIndex);
          }
        } else if (parentId) {
          // Reordering level 2 items
          const parent = newConfig.find(m => m.id === parentId);
          if (parent?.subItems) {
            const oldIndex = parent.subItems.findIndex(m => m.id === active.id);
            const newIndex = parent.subItems.findIndex(m => m.id === over?.id);
            parent.subItems = arrayMove(parent.subItems, oldIndex, newIndex);
          }
        } else {
          // Reordering level 1 items
          const oldIndex = newConfig.findIndex(m => m.id === active.id);
          const newIndex = newConfig.findIndex(m => m.id === over?.id);
          return arrayMove(newConfig, oldIndex, newIndex);
        }
        
        return newConfig;
      });
    }
  };

  const findMenuItem = (id: string, items: MenuItem[]): MenuItem | undefined => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.subItems) {
        const found = findMenuItem(id, item.subItems);
        if (found) return found;
      }
    }
    return undefined;
  };

  const renderSortableItems = (items: MenuConfigItem[], parentId?: string, subParentId?: string) => {
    return (
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => handleDragEnd(e, parentId, subParentId)}
      >
        <SortableContext 
          items={items.map(i => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((itemConfig) => {
            const menuItem = findMenuItem(itemConfig.id, ALL_MENU_ITEMS);
            if (!menuItem) return null;

            return (
              <SortableItem 
                key={itemConfig.id} 
                id={itemConfig.id} 
                label={menuItem.label} 
                icon={menuItem.icon}
                hasSubItems={itemConfig.subItems && itemConfig.subItems.length > 0}
                isExpanded={expandedItems[itemConfig.id]}
                onToggle={() => toggleExpand(itemConfig.id)}
              >
                {itemConfig.subItems && itemConfig.subItems.length > 0 && 
                  renderSortableItems(itemConfig.subItems, parentId || itemConfig.id, parentId ? itemConfig.id : undefined)
                }
              </SortableItem>
            );
          })}
        </SortableContext>
      </DndContext>
    );
  };

  const handleSave = () => {
    setIsSaving(true);
    onSave(config);
    setTimeout(() => setIsSaving(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3">
        <div className="bg-indigo-600 text-white p-2 rounded-lg mt-1"><GripVertical size={20} /></div>
        <div>
          <h4 className="font-bold text-indigo-900 font-nepali">मेनु व्यवस्थापन (Menu Management)</h4>
          <p className="text-xs text-indigo-700 mt-1">तपाईं मेनु र सब-मेनुको क्रम परिवर्तन गर्न ड्र्याग एण्ड ड्रप (Drag & Drop) प्रयोग गर्न सक्नुहुन्छ।</p>
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
        {renderSortableItems(config)}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all ${
            isSaving 
            ? 'bg-green-600 text-white cursor-default' 
            : 'bg-slate-800 text-white hover:bg-slate-900 active:scale-95'
          }`}
        >
          {isSaving ? (
            <><CheckCircle2 size={18} /> सुरक्षित भयो (Saved)</>
          ) : (
            'क्रम सुरक्षित गर्नुहोस् (Save Order)'
          )}
        </button>
      </div>
    </div>
  );
};
