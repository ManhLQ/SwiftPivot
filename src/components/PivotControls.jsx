import React, { useState, useCallback, useMemo } from 'react';
import './PivotControls.css';

const AGGREGATIONS = [
  { value: 'SUM', label: 'Sum' },
  { value: 'COUNT', label: 'Count' },
  { value: 'AVG', label: 'Average' },
  { value: 'MIN', label: 'Min' },
  { value: 'MAX', label: 'Max' },
];

function PivotControls({ columns = [], data = [], pivotConfig, onConfigChange }) {
  const {
    rows = [],
    columns: pivotCols = [],
    measures = [],
    filters = {},
    aggregation = 'SUM',
    showGrandTotals = true,
    showSubTotals = true,
    rowHierarchyType = 'tree',
  } = pivotConfig;
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverZone, setDragOverZone] = useState(null);

  const filterFields = useMemo(() => Object.keys(filters), [filters]);

  const availableFields = useMemo(() => {
    const used = new Set([...rows, ...pivotCols, ...measures, ...filterFields]);
    return columns.filter((col) => !used.has(col));
  }, [columns, rows, pivotCols, measures, filterFields]);

  const addField = useCallback(
    (field, zone) => {
      const newConfig = { ...pivotConfig };
      if (zone === 'filters') {
        const uniqueValues = Array.from(new Set(data.map((r) => String(r[field] ?? ''))));
        newConfig.filters = {
          ...(newConfig.filters || {}),
          [field]: uniqueValues,
        };
      } else {
        newConfig[zone] = [...(newConfig[zone] || []), field];
      }
      onConfigChange(newConfig);
    },
    [pivotConfig, data, onConfigChange]
  );

  const removeField = useCallback(
    (field, zone) => {
      const newConfig = { ...pivotConfig };
      if (zone === 'filters') {
        const newFilters = { ...newConfig.filters };
        delete newFilters[field];
        newConfig.filters = newFilters;
      } else {
        newConfig[zone] = newConfig[zone].filter((f) => f !== field);
      }
      onConfigChange(newConfig);
    },
    [pivotConfig, onConfigChange]
  );

  const handleFilterValuesChange = useCallback(
    (field, newAllowedValues) => {
      const newConfig = {
        ...pivotConfig,
        filters: {
          ...pivotConfig.filters,
          [field]: newAllowedValues,
        },
      };
      onConfigChange(newConfig);
    },
    [pivotConfig, onConfigChange]
  );

  const handleAggregationChange = useCallback(
    (e) => {
      onConfigChange({ ...pivotConfig, aggregation: e.target.value });
    },
    [pivotConfig, onConfigChange]
  );

  const handleDragStart = (e, field, sourceZone) => {
    e.dataTransfer?.setData('text/plain', field);
    setDraggedItem({ field, sourceZone });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverZone(null);
  };

  const handleDragOver = (e, zone) => {
    e.preventDefault();
    if (dragOverZone !== zone) {
      setDragOverZone(zone);
    }
  };

  const handleDragLeave = (e, zone) => {
    if (dragOverZone === zone) {
      setDragOverZone(null);
    }
  };

  const handleDrop = (e, targetZone) => {
    e.preventDefault();
    setDragOverZone(null);
    const field = e.dataTransfer?.getData('text/plain') || draggedItem?.field;
    const sourceZone = draggedItem?.sourceZone;

    if (!field) return;

    const newConfig = {
      ...pivotConfig,
      rows: [...(pivotConfig.rows || [])],
      columns: [...(pivotConfig.columns || [])],
      measures: [...(pivotConfig.measures || [])],
      filters: { ...(pivotConfig.filters || {}) },
    };

    if (sourceZone && sourceZone !== targetZone) {
      if (sourceZone === 'rows') {
        newConfig.rows = newConfig.rows.filter((f) => f !== field);
      } else if (sourceZone === 'columns') {
        newConfig.columns = newConfig.columns.filter((f) => f !== field);
      } else if (sourceZone === 'measures') {
        newConfig.measures = newConfig.measures.filter((f) => f !== field);
      } else if (sourceZone === 'filters') {
        delete newConfig.filters[field];
      }
    } else if (!sourceZone) {
      if (targetZone !== 'rows') newConfig.rows = newConfig.rows.filter((f) => f !== field);
      if (targetZone !== 'columns') newConfig.columns = newConfig.columns.filter((f) => f !== field);
      if (targetZone !== 'measures') newConfig.measures = newConfig.measures.filter((f) => f !== field);
      if (targetZone !== 'filters') delete newConfig.filters[field];
    }

    if (targetZone === 'rows') {
      if (!newConfig.rows.includes(field)) newConfig.rows.push(field);
    } else if (targetZone === 'columns') {
      if (!newConfig.columns.includes(field)) newConfig.columns.push(field);
    } else if (targetZone === 'measures') {
      if (!newConfig.measures.includes(field)) newConfig.measures.push(field);
    } else if (targetZone === 'filters') {
      if (!(field in newConfig.filters)) {
        const uniqueValues = Array.from(new Set(data.map((r) => String(r[field] ?? ''))));
        newConfig.filters[field] = uniqueValues;
      }
    }

    onConfigChange(newConfig);
    setDraggedItem(null);
  };

  const handleDropOnItem = (e, targetZone, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverZone(null);
    const field = e.dataTransfer?.getData('text/plain') || draggedItem?.field;
    const sourceZone = draggedItem?.sourceZone;

    if (!field) return;

    const newConfig = {
      ...pivotConfig,
      rows: [...(pivotConfig.rows || [])],
      columns: [...(pivotConfig.columns || [])],
      measures: [...(pivotConfig.measures || [])],
      filters: { ...(pivotConfig.filters || {}) },
    };

    if (sourceZone === targetZone && (targetZone === 'rows' || targetZone === 'columns' || targetZone === 'measures')) {
      const list = newConfig[targetZone];
      const fromIdx = list.indexOf(field);
      if (fromIdx !== -1) {
        list.splice(fromIdx, 1);
        list.splice(targetIndex, 0, field);
      }
    } else {
      if (sourceZone === 'rows') {
        newConfig.rows = newConfig.rows.filter((f) => f !== field);
      } else if (sourceZone === 'columns') {
        newConfig.columns = newConfig.columns.filter((f) => f !== field);
      } else if (sourceZone === 'measures') {
        newConfig.measures = newConfig.measures.filter((f) => f !== field);
      } else if (sourceZone === 'filters') {
        delete newConfig.filters[field];
      }

      if (targetZone === 'rows') {
        newConfig.rows = newConfig.rows.filter((f) => f !== field);
        newConfig.rows.splice(targetIndex, 0, field);
      } else if (targetZone === 'columns') {
        newConfig.columns = newConfig.columns.filter((f) => f !== field);
        newConfig.columns.splice(targetIndex, 0, field);
      } else if (targetZone === 'measures') {
        newConfig.measures = newConfig.measures.filter((f) => f !== field);
        newConfig.measures.splice(targetIndex, 0, field);
      } else if (targetZone === 'filters') {
        if (!(field in newConfig.filters)) {
          const uniqueValues = Array.from(new Set(data.map((r) => String(r[field] ?? ''))));
          newConfig.filters[field] = uniqueValues;
        }
      }
    }

    onConfigChange(newConfig);
    setDraggedItem(null);
  };

  const renderZone = (label, zone, fields) => (
    <div
      className={`field-zone ${dragOverZone === zone ? 'is-drag-over' : ''}`}
      data-testid={`zone-${zone}`}
      onDragOver={(e) => handleDragOver(e, zone)}
      onDragLeave={(e) => handleDragLeave(e, zone)}
      onDrop={(e) => handleDrop(e, zone)}
    >
      <span className="field-zone-label">{label}</span>
      <div className="field-zone-items">
        {fields.map((field, idx) => (
          <span
            key={field}
            className="field-tag active"
            draggable={true}
            onDragStart={(e) => handleDragStart(e, field, zone)}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => handleDropOnItem(e, zone, idx)}
            onDragEnd={handleDragEnd}
          >
            {field}
            <span
              className="remove-btn"
              onClick={() => removeField(field, zone)}
            >
              ✕
            </span>
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="pivot-controls" id="pivot-controls">
      <div className="pivot-controls-header">
        <h2>🔀 Pivot Configuration</h2>
        <div className="pivot-controls-header-actions">
          <label className="pivot-checkbox-label">
            <input
              type="checkbox"
              id="tree-view-checkbox"
              checked={rowHierarchyType === 'tree'}
              onChange={(e) => onConfigChange({ ...pivotConfig, rowHierarchyType: e.target.checked ? 'tree' : 'grid' })}
            />
            Tree View
          </label>
          <label className="pivot-checkbox-label">
            <input
              type="checkbox"
              id="grand-totals-checkbox"
              checked={showGrandTotals}
              onChange={(e) => onConfigChange({ ...pivotConfig, showGrandTotals: e.target.checked })}
            />
            Grand Totals
          </label>
          <label className="pivot-checkbox-label">
            <input
              type="checkbox"
              id="subtotals-checkbox"
              checked={showSubTotals}
              onChange={(e) => onConfigChange({ ...pivotConfig, showSubTotals: e.target.checked })}
            />
            Subtotals
          </label>
          <div className="aggregation-wrapper">
            <label className="field-zone-label" style={{ marginRight: '0.2rem' }}>
              Agg:
            </label>
            <select
              className="aggregation-select"
              id="aggregation-select"
              value={aggregation}
              onChange={handleAggregationChange}
            >
              {AGGREGATIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="pivot-controls-body">
        <div
          className={`field-zone field-zone-available ${dragOverZone === 'available' ? 'is-drag-over' : ''}`}
          data-testid="zone-available"
          onDragOver={(e) => handleDragOver(e, 'available')}
          onDragLeave={(e) => handleDragLeave(e, 'available')}
          onDrop={(e) => handleDrop(e, 'available')}
        >
          <span className="field-zone-label">Available Fields</span>
          <div className="field-zone-items">
            {availableFields.map((field) => (
              <FieldTag
                key={field}
                field={field}
                onAddToRows={() => addField(field, 'rows')}
                onAddToColumns={() => addField(field, 'columns')}
                onAddToMeasures={() => addField(field, 'measures')}
                onAddToFilters={() => addField(field, 'filters')}
                onDragStart={(e) => handleDragStart(e, field, 'available')}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        </div>
        {renderZone('Row Fields', 'rows', rows)}
        {renderZone('Column Fields', 'columns', pivotCols)}
        {renderZone('Measure Fields', 'measures', measures)}

        <div
          className={`field-zone ${dragOverZone === 'filters' ? 'is-drag-over' : ''}`}
          data-testid="zone-filters"
          onDragOver={(e) => handleDragOver(e, 'filters')}
          onDragLeave={(e) => handleDragLeave(e, 'filters')}
          onDrop={(e) => handleDrop(e, 'filters')}
        >
          <span className="field-zone-label">Filter Fields</span>
          <div className="field-zone-items">
            {filterFields.map((field, idx) => (
              <FilterFieldTag
                key={field}
                field={field}
                data={data}
                selectedValues={filters[field] || []}
                onValuesChange={(newVals) => handleFilterValuesChange(field, newVals)}
                onRemove={() => removeField(field, 'filters')}
                onDragStart={(e) => handleDragStart(e, field, 'filters')}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => handleDropOnItem(e, 'filters', idx)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldTag({ field, onAddToRows, onAddToColumns, onAddToMeasures, onAddToFilters, onDragStart, onDragEnd }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <span
      className="field-tag"
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => setShowMenu((prev) => !prev)}
      style={{ position: 'relative' }}
    >
      {field}
      {showMenu && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 10,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.25rem 0',
            minWidth: '120px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            className="field-tag"
            style={{ display: 'block', border: 'none', borderRadius: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onAddToRows();
              setShowMenu(false);
            }}
          >
            → Rows
          </div>
          <div
            className="field-tag"
            style={{ display: 'block', border: 'none', borderRadius: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onAddToColumns();
              setShowMenu(false);
            }}
          >
            → Columns
          </div>
          <div
            className="field-tag"
            style={{ display: 'block', border: 'none', borderRadius: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onAddToMeasures();
              setShowMenu(false);
            }}
          >
            → Measures
          </div>
          <div
            className="field-tag"
            style={{ display: 'block', border: 'none', borderRadius: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onAddToFilters();
              setShowMenu(false);
            }}
          >
            → Filters
          </div>
        </div>
      )}
    </span>
  );
}

function FilterFieldTag({ field, data, selectedValues, onValuesChange, onRemove, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const [open, setOpen] = useState(false);

  const uniqueValues = useMemo(() => {
    const set = new Set(data.map((row) => String(row[field] ?? '')));
    return Array.from(set).sort();
  }, [data, field]);

  const selectedCount = selectedValues.length;
  const totalCount = uniqueValues.length;

  const toggleValue = (val) => {
    if (selectedValues.includes(val)) {
      onValuesChange(selectedValues.filter((v) => v !== val));
    } else {
      onValuesChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = (e) => {
    e.stopPropagation();
    onValuesChange([...uniqueValues]);
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    onValuesChange([]);
  };

  return (
    <span
      className="field-tag active"
      draggable={true}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={() => setOpen((prev) => !prev)}
      style={{ position: 'relative', cursor: 'pointer' }}
    >
      {`${field} (${selectedCount}/${totalCount})`}
      <span
        className="remove-btn"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        ✕
      </span>
      {open && (
        <div
          className="filter-popover"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="filter-popover-actions">
            <button className="filter-btn-shortcut" onClick={handleSelectAll}>
              Select All
            </button>
            <button className="filter-btn-shortcut" onClick={handleClearAll}>
              Clear All
            </button>
          </div>
          <div className="filter-checkbox-list">
            {uniqueValues.map((val) => {
              const isChecked = selectedValues.includes(val);
              return (
                <label key={val} className="filter-checkbox-item">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleValue(val)}
                  />
                  <span>{val === '' ? '(blank)' : val}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </span>
  );
}

export default PivotControls;
