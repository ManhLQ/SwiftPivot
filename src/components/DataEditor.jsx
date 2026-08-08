import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import './DataEditor.css';

function DataEditor({ data, originalData = [], onDataChange }) {
  const [columnFilters, setColumnFilters] = useState({});
  const [columnValueFilters, setColumnValueFilters] = useState({});
  const [activePopoverCol, setActivePopoverCol] = useState(null);
  const editingStartRef = useRef(null);

  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]).filter((col) => col !== '_isEdited');

  const uniqueValuesByCol = useMemo(() => {
    if (!data || data.length === 0) return {};
    const map = {};
    columns.forEach((col) => {
      const valuesSet = new Set();
      data.forEach((row) => {
        const valStr = row[col] !== undefined && row[col] !== null ? String(row[col]) : '(Blank)';
        valuesSet.add(valStr);
      });
      map[col] = Array.from(valuesSet).sort();
    });
    return map;
  }, [data, columns]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        activePopoverCol &&
        !e.target.closest(`[data-testid="filter-popover-${activePopoverCol}"]`) &&
        !e.target.closest(`[data-testid="filter-btn-${activePopoverCol}"]`)
      ) {
        setActivePopoverCol(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activePopoverCol]);

  const handleFilterChange = (col, val) => {
    setColumnFilters((prev) => ({
      ...prev,
      [col]: val,
    }));
  };

  const toggleFilterPopover = (col) => {
    setActivePopoverCol((prev) => (prev === col ? null : col));
  };

  const handleSelectAll = (col) => {
    setColumnValueFilters((prev) => {
      const updated = { ...prev };
      delete updated[col];
      return updated;
    });
  };

  const handleClearAll = (col) => {
    setColumnValueFilters((prev) => ({
      ...prev,
      [col]: [],
    }));
  };

  const handleValueToggle = (col, val) => {
    setColumnValueFilters((prev) => {
      const allVals = uniqueValuesByCol[col] || [];
      const current = prev[col] !== undefined ? prev[col] : allVals;
      const exists = current.includes(val);
      const updated = exists ? current.filter((v) => v !== val) : [...current, val];

      if (updated.length === allVals.length) {
        const copy = { ...prev };
        delete copy[col];
        return copy;
      }

      return {
        ...prev,
        [col]: updated,
      };
    });
  };

  const clearFilters = () => {
    setColumnFilters({});
    setColumnValueFilters({});
  };

  const filteredDataWithIndex = useMemo(() => {
    return data
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter(({ row }) => {
        return columns.every((col) => {
          // 1. Text search filter
          const filterVal = columnFilters[col];
          const cellValStr = row[col] !== undefined && row[col] !== null ? String(row[col]) : '(Blank)';
          if (filterVal && filterVal.trim() !== '') {
            if (!cellValStr.toLowerCase().includes(filterVal.trim().toLowerCase())) {
              return false;
            }
          }
          // 2. Value checkbox selection filter
          const allowedValues = columnValueFilters[col];
          if (allowedValues !== undefined && allowedValues !== null) {
            if (!allowedValues.includes(cellValStr)) {
              return false;
            }
          }
          return true;
        });
      });
  }, [data, columns, columnFilters, columnValueFilters]);

  const handleCellFocus = useCallback((originalIndex, colKey) => {
    if (!editingStartRef.current) {
      editingStartRef.current = {
        originalIndex,
        colKey,
        initialValue: data[originalIndex]?.[colKey],
        currentValue: data[originalIndex]?.[colKey],
        latestData: data,
      };
    }
  }, [data]);

  const handleCellChange = useCallback((originalIndex, colKey, newValue) => {
    const newVal = newValue.trim() !== '' && !isNaN(Number(newValue)) ? Number(newValue) : newValue;

    const newData = data.map((row, i) => {
      if (i !== originalIndex) return row;
      const updatedRow = { ...row, _isEdited: true };
      updatedRow[colKey] = newVal;
      return updatedRow;
    });

    if (!editingStartRef.current) {
      editingStartRef.current = {
        originalIndex,
        colKey,
        initialValue: data[originalIndex]?.[colKey],
        currentValue: newVal,
        latestData: newData,
      };
    } else {
      editingStartRef.current.currentValue = newVal;
      editingStartRef.current.latestData = newData;
    }

    onDataChange(newData);
  }, [data, onDataChange]);

  const commitCellEdit = useCallback((originalIndex, colKey) => {
    if (
      editingStartRef.current &&
      editingStartRef.current.originalIndex === originalIndex &&
      editingStartRef.current.colKey === colKey
    ) {
      const initialVal = editingStartRef.current.initialValue;
      const currentVal = editingStartRef.current.currentValue !== undefined
        ? editingStartRef.current.currentValue
        : data[originalIndex]?.[colKey];
      const currentData = editingStartRef.current.latestData || data;

      if (String(initialVal ?? '') !== String(currentVal ?? '')) {
        const changeEvent = {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: Date.now(),
          type: 'CELL_EDIT',
          rowIndex: originalIndex,
          column: colKey,
          oldValue: initialVal,
          newValue: currentVal,
          summary: `Row ${originalIndex + 1} [${colKey}]: "${initialVal ?? ''}" ➔ "${currentVal}"`,
        };
        onDataChange(currentData, changeEvent);
      }

      editingStartRef.current = null;
    }
  }, [data, onDataChange]);

  const isCellEdited = useCallback((originalIndex, colKey, currentVal) => {
    if (!originalData || !originalData[originalIndex]) return false;
    const initVal = originalData[originalIndex][colKey];
    return String(initVal ?? '') !== String(currentVal ?? '');
  }, [originalData]);

  const hasActiveFilters =
    Object.values(columnFilters).some((v) => v && v.trim() !== '') ||
    Object.values(columnValueFilters).some((arr) => arr !== undefined && arr !== null);

  return (
    <div className="data-editor data-editor-container">
      <div className="data-editor-header">
        <div className="title-group">
          <h2>📊 Raw Data Inspector</h2>
          <span className="data-editor-meta">
            Showing {filteredDataWithIndex.length} of {data.length} rows × {columns.length} columns
          </span>
        </div>
        {hasActiveFilters && (
          <button className="btn-clear-filters" onClick={clearFilters}>
            Clear Column Filters
          </button>
        )}
      </div>
      <div className="data-editor-scroll table-scroll-wrapper">
        <table className="data-editor-table" id="data-editor-table">
          <thead>
            <tr>
              <th className="row-number">#</th>
              {columns.map((col) => {
                const isFilteredByText = Boolean(columnFilters[col] && columnFilters[col].trim() !== '');
                const isFilteredByValues = columnValueFilters[col] !== undefined;
                const isColFiltered = isFilteredByText || isFilteredByValues;

                return (
                  <th key={col} className="col-header-th">
                    <div className="col-header-content">
                      <div className="col-header-top">
                        <span className="col-title">{col}</span>
                        <button
                          type="button"
                          className={`col-filter-btn ${isColFiltered ? 'active' : ''}`}
                          data-testid={`filter-btn-${col}`}
                          onClick={() => toggleFilterPopover(col)}
                          title={`Filter options for ${col}`}
                          aria-label={`Filter options for ${col}`}
                        >
                          ▼
                        </button>
                      </div>
                      <input
                        type="text"
                        className="col-filter-input"
                        placeholder={`Filter ${col}...`}
                        value={columnFilters[col] || ''}
                        onChange={(e) => handleFilterChange(col, e.target.value)}
                      />
                      {activePopoverCol === col && (
                        <div className="filter-popover" data-testid={`filter-popover-${col}`}>
                          <div className="filter-popover-actions">
                            <button
                              type="button"
                              className="btn-popover-action"
                              onClick={() => handleSelectAll(col)}
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              className="btn-popover-action"
                              onClick={() => handleClearAll(col)}
                            >
                              Clear All
                            </button>
                          </div>
                          <div className="filter-checkbox-list">
                            {(uniqueValuesByCol[col] || []).map((val) => {
                              const isChecked =
                                columnValueFilters[col] !== undefined
                                  ? columnValueFilters[col].includes(val)
                                  : true;
                              return (
                                <label key={val} className="filter-checkbox-item">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleValueToggle(col, val)}
                                  />
                                  <span>{val}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredDataWithIndex.map(({ row, originalIndex }) => (
              <tr key={originalIndex}>
                <td className="row-number">{originalIndex + 1}</td>
                {columns.map((col) => {
                  const edited = isCellEdited(originalIndex, col, row[col]);
                  return (
                    <td key={`${originalIndex}-${col}`}>
                      <input
                        className={`cell-input ${edited ? 'cell-edited' : ''}`}
                        type="text"
                        value={row[col] ?? ''}
                        onFocus={() => handleCellFocus(originalIndex, col)}
                        onChange={(e) => handleCellChange(originalIndex, col, e.target.value)}
                        onBlur={() => commitCellEdit(originalIndex, col)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Tab') {
                            commitCellEdit(originalIndex, col);
                          }
                        }}
                        id={`cell-${originalIndex}-${col}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataEditor;


