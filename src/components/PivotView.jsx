import React, { useMemo, useState, useEffect, useRef } from 'react';
import { PivotTable } from '@visactor/react-vtable';
import { buildPivotOption } from '../utils/pivotHelpers.js';
import './PivotView.css';

function PivotView({ data, rawDataLength, pivotConfig, vtableTheme = 'dark' }) {
  const wrapperRef = useRef(null);
  const tableRef = useRef(null);
  const scrollPosRef = useRef({ left: 0, top: 0 });
  const [wrapperHeight, setWrapperHeight] = useState(0);

  useEffect(() => {
    if (!wrapperRef.current) return;
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.height) {
          setWrapperHeight(entry.contentRect.height);
        }
      }
    });

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  const option = useMemo(
    () => buildPivotOption(data, pivotConfig, vtableTheme),
    [data, pivotConfig, vtableTheme]
  );

  // Preserve scroll position when option updates so table doesn't jump/reset
  useEffect(() => {
    if (tableRef.current) {
      try {
        const top = tableRef.current.getScrollTop?.() || 0;
        const left = tableRef.current.getScrollLeft?.() || 0;
        scrollPosRef.current = { left, top };
      } catch (e) {
        // ignore
      }
    }
  }, [option]);

  useEffect(() => {
    if (tableRef.current) {
      const { top, left } = scrollPosRef.current;
      requestAnimationFrame(() => {
        try {
          if (tableRef.current && (top > 0 || left > 0)) {
            tableRef.current.setScrollTop?.(top);
            tableRef.current.setScrollLeft?.(left);
          }
        } catch (e) {
          // ignore
        }
      });
    }
  }, [option]);

  const isFilteredEmpty = rawDataLength > 0 && data.length === 0;

  return (
    <div className="pivot-view">
      <div className="pivot-view-header">
        <h2>📊 Pivot Table</h2>
      </div>
      {isFilteredEmpty ? (
        <div className="pivot-empty">
          No data matches active filters
        </div>
      ) : !option ? (
        <div className="pivot-empty">
          Assign at least one measure field to see the pivot table.
        </div>
      ) : (
        <div className="pivot-wrapper" id="pivot-wrapper" ref={wrapperRef}>
          <PivotTable
            ref={tableRef}
            option={option}
            height={wrapperHeight ? Math.max(150, wrapperHeight - 2) : '100%'}
          />
        </div>
      )}
    </div>
  );
}

export default PivotView;
