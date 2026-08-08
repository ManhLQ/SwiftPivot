import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import './DataEditor.css';

function DataEditor({ data, originalData = [], onDataChange }) {
  const [columnFilters, setColumnFilters] = useState({});
  const [columnValueFilters, setColumnValueFilters] = useState({});
  const [activePopoverCol, setActivePopoverCol] = useState(null);
  const [popoverSearch, setPopoverSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const editingStartRef = useRef(null);

  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).filter((col) => col !== '_isEdited');
  }, [data]);

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
        setPopoverSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activePopoverCol]);

  // Reset pagination on filter or data change
  useEffect(() => {
    setCurrentPage(1);
  }, [columnFilters, columnValueFilters, data]);

  const filteredDataWithIndex = useMemo(() => {
    if (!data || data.length === 0) return [];
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

  const totalPages = Math.max(1, Math.ceil(filteredDataWithIndex.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredDataWithIndex.slice(start, start + pageSize);
  }, [filteredDataWithIndex, validCurrentPage, pageSize]);

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

  const handleFilterChange = (col, val) => {
    setColumnFilters((prev) => ({
      ...prev,
      [col]: val,
    }));
  };

  const toggleFilterPopover = (col) => {
    if (activePopoverCol === col) {
      setActivePopoverCol(null);
      setPopoverSearch('');
    } else {
      setActivePopoverCol(col);
      setPopoverSearch('');
    }
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

  if (!data || data.length === 0) return null;

  const hasActiveFilters =
    Object.values(columnFilters).some((v) => v && v.trim() !== '') ||
    Object.values(columnValueFilters).some((arr) => arr !== undefined && arr !== null);

  const startRowIndex = (validCurrentPage - 1) * pageSize + 1;
  const endRowIndex = Math.min(validCurrentPage * pageSize, filteredDataWithIndex.length);

  return (
    <div className="data-editor data-editor-container">
      <div className="data-editor-header">
        <div className="title-group">
          <h2>📊 Raw Data Inspector</h2>
          <span className="data-editor-meta">
            {filteredDataWithIndex.length > 50
              ? `Showing ${startRowIndex}–${endRowIndex} of ${filteredDataWithIndex.length} rows${filteredDataWithIndex.length !== data.length ? ` (filtered from ${data.length})` : ''} × ${columns.length} columns`
              : `Showing ${filteredDataWithIndex.length} of ${data.length} rows × ${columns.length} columns`
            }
          </span>
        </div>
        <div className="header-actions-group">
          {hasActiveFilters && (
            <button className="btn-clear-filters" onClick={clearFilters}>
              Clear Column Filters
            </button>
          )}
          {filteredDataWithIndex.length > 50 && (
            <div className="pagination-bar">
              <button
                className="btn-page"
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage(1)}
                title="First Page"
              >
                «
              </button>
              <button
                className="btn-page"
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="Previous Page"
              >
                ‹
              </button>
              <span className="page-indicator">
                {validCurrentPage} / {totalPages}
              </span>
              <button
                className="btn-page"
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="Next Page"
              >
                ›
              </button>
              <button
                className="btn-page"
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                title="Last Page"
              >
                »
              </button>
              <select
                className="page-size-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
                <option value={250}>250 / page</option>
                <option value={500}>500 / page</option>
                <option value={1000}>1000 / page</option>
              </select>
            </div>
          )}
        </div>
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

                const allColValues = uniqueValuesByCol[col] || [];
                const filteredColValues = popoverSearch.trim() === ''
                  ? allColValues
                  : allColValues.filter((v) => v.toLowerCase().includes(popoverSearch.trim().toLowerCase()));
                const displayColValues = filteredColValues.slice(0, 100);

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
                          {allColValues.length > 10 && (
                            <input
                              type="text"
                              className="col-filter-input"
                              placeholder="Search values..."
                              value={popoverSearch}
                              onChange={(e) => setPopoverSearch(e.target.value)}
                              style={{ marginBottom: '0.5rem' }}
                            />
                          )}
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
                            {displayColValues.map((val) => {
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
                            {filteredColValues.length > 100 && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', padding: '0.2rem' }}>
                                Showing top 100 of {filteredColValues.length} values
                              </div>
                            )}
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
            {paginatedRows.map(({ row, originalIndex }) => (
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
