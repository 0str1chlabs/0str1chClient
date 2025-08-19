import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Hash, Calendar, Type, BarChart3, Filter } from 'lucide-react';
import { PivotField, PivotZone } from '@/types/spreadsheet';

interface PivotFieldSelectorProps {
  availableFields: PivotField[];
  zones: PivotZone[];
  onFieldDrop: (field: PivotField, zoneType: 'rows' | 'columns' | 'values' | 'filters') => void;
  onFieldRemove: (fieldId: string, zoneType: 'rows' | 'columns' | 'values' | 'filters') => void;
}

const zoneConfig = {
  rows: { title: 'Rows', icon: BarChart3, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  columns: { title: 'Columns', icon: BarChart3, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  values: { title: 'Values', icon: Hash, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  filters: { title: 'Filters', icon: Filter, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' }
};

export const PivotFieldSelector: React.FC<PivotFieldSelectorProps> = ({
  availableFields,
  zones,
  onFieldDrop,
  onFieldRemove
}) => {
  const [draggedField, setDraggedField] = useState<PivotField | null>(null);

  const handleDragStart = (result: DropResult) => {
    const { draggableId, source } = result;
    if (source.droppableId === 'available-fields') {
      const field = availableFields.find(f => f.id === draggableId);
      if (field) {
        setDraggedField(field);
      }
    }
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    
    if (destination && destination.droppableId !== 'available-fields') {
      const field = availableFields.find(f => f.id === draggableId);
      if (field) {
        onFieldDrop(field, destination.droppableId as 'rows' | 'columns' | 'values' | 'filters');
      }
    }
    
    setDraggedField(null);
  };

  const getFieldIcon = (type: 'text' | 'number' | 'date') => {
    switch (type) {
      case 'number':
        return <Hash className="h-3 w-3" />;
      case 'date':
        return <Calendar className="h-3 w-3" />;
      default:
        return <Type className="h-3 w-3" />;
    }
  };

  const getZoneFields = (zoneType: 'rows' | 'columns' | 'values' | 'filters') => {
    return zones.find(z => z.type === zoneType)?.fields || [];
  };

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* Available Fields */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Available Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <Droppable droppableId="available-fields" isDropDisabled={true}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2"
                >
                  {availableFields.map((field, index) => (
                    <Draggable key={field.id} draggableId={field.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`flex items-center justify-between p-2 rounded-md border cursor-move transition-colors ${
                            snapshot.isDragging
                              ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {getFieldIcon(field.type)}
                            <span className="text-sm font-medium">{field.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {field.column}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </CardContent>
        </Card>

        {/* Pivot Zones */}
        {Object.entries(zoneConfig).map(([zoneType, config]) => {
          const IconComponent = config.icon;
          const zoneFields = getZoneFields(zoneType as 'rows' | 'columns' | 'values' | 'filters');
          
          return (
            <Card key={zoneType}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <IconComponent className="h-4 w-4" />
                  {config.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId={zoneType}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[60px] p-2 rounded-md border-2 border-dashed transition-colors ${
                        snapshot.isDragOver
                          ? 'border-gray-400 bg-gray-100 dark:bg-gray-800'
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      {zoneFields.map((field, index) => (
                        <div
                          key={field.id}
                          className={`flex items-center justify-between p-2 mb-2 rounded-md ${config.color}`}
                        >
                          <div className="flex items-center gap-2">
                            {getFieldIcon(field.type)}
                            <span className="text-sm font-medium">{field.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {field.column}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-white/20"
                            onClick={() => onFieldRemove(field.id, zoneType as 'rows' | 'columns' | 'values' | 'filters')}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {provided.placeholder}
                      {zoneFields.length === 0 && (
                        <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-2">
                          Drop fields here
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DragDropContext>
  );
};
