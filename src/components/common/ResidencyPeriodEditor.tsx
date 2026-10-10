import React from 'react';
import { Plus, Trash2, AlertTriangle, Info, Calendar } from 'lucide-react';
import type { ResidencyPeriod } from '../../store/useStore';

interface ResidencyPeriodEditorProps {
  periods: ResidencyPeriod[];
  onChange: (periods: ResidencyPeriod[]) => void;
  placeName?: string;
  compact?: boolean;
}

export const ResidencyPeriodEditor: React.FC<ResidencyPeriodEditorProps> = ({
  periods,
  onChange,
  placeName,
  compact = false
}) => {
  const handleAddPeriod = () => {
    const newPeriod: ResidencyPeriod = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      start: '',
      end: '',
      current: periods.length === 0, // Default first period to current if user hasn't specified
      note: ''
    };
    onChange([...periods, newPeriod]);
  };

  const handleUpdatePeriod = (id: string, updates: Partial<ResidencyPeriod>) => {
    onChange(
      periods.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...updates };
        if (updates.current) {
          updated.end = undefined;
        }
        return updated;
      })
    );
  };

  const handleRemovePeriod = (id: string) => {
    onChange(periods.filter((p) => p.id !== id));
  };

  // Soft validation check helper
  const hasInvertedDates = (p: ResidencyPeriod): boolean => {
    if (!p.start || !p.end || p.current) return false;
    return p.end.trim() < p.start.trim();
  };

  const currentCount = periods.filter((p) => p.current).length;

  return (
    <div className={`residency-period-editor ${compact ? 'residency-period-editor--compact' : ''}`}>
      {periods.length === 0 ? (
        <button
          type="button"
          onClick={handleAddPeriod}
          className="residency-period-editor__add-first"
        >
          <Plus size={13} />
          <span>Add time period {placeName ? `for ${placeName}` : ''}</span>
        </button>
      ) : (
        <div className="residency-period-editor__list">
          <div className="residency-period-editor__header">
            <span className="residency-period-editor__title">
              <Calendar size={13} />
              <span>Time Periods Lived</span>
            </span>
            <button
              type="button"
              onClick={handleAddPeriod}
              className="residency-period-editor__add-btn"
              title="Add another time period"
            >
              <Plus size={13} />
              <span>Add stay</span>
            </button>
          </div>

          {currentCount > 1 && (
            <div className="residency-period-editor__notice" role="status">
              <Info size={12} />
              <span>Multiple stays are marked as current home.</span>
            </div>
          )}

          {periods.map((period, index) => {
            const isInverted = hasInvertedDates(period);

            return (
              <div
                key={period.id}
                className={`residency-period-item ${isInverted ? 'residency-period-item--warning' : ''}`}
              >
                <div className="residency-period-item__top">
                  <span className="residency-period-item__badge">Stay #{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePeriod(period.id)}
                    className="residency-period-item__delete"
                    title="Remove this time period"
                    aria-label={`Remove stay ${index + 1}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="residency-period-item__dates">
                  <div className="residency-period-item__field">
                    <label htmlFor={`start-${period.id}`}>Start</label>
                    <input
                      id={`start-${period.id}`}
                      type="text"
                      value={period.start}
                      placeholder="e.g. 2018 or 2018-05"
                      onChange={(e) => handleUpdatePeriod(period.id, { start: e.target.value })}
                      className="residency-period-item__input"
                    />
                  </div>

                  <div className="residency-period-item__field">
                    <label htmlFor={`end-${period.id}`}>End</label>
                    <input
                      id={`end-${period.id}`}
                      type="text"
                      value={period.current ? 'Present' : (period.end || '')}
                      placeholder="e.g. 2021"
                      disabled={Boolean(period.current)}
                      onChange={(e) => handleUpdatePeriod(period.id, { end: e.target.value })}
                      className={`residency-period-item__input ${period.current ? 'residency-period-item__input--disabled' : ''}`}
                    />
                  </div>
                </div>

                {isInverted && (
                  <div className="residency-period-item__error" role="alert">
                    <AlertTriangle size={11} />
                    <span>End date is earlier than start date</span>
                  </div>
                )}

                <div className="residency-period-item__footer">
                  <label className="residency-period-item__current-toggle">
                    <input
                      type="checkbox"
                      className="survey-checkbox"
                      checked={Boolean(period.current)}
                      onChange={(e) => handleUpdatePeriod(period.id, { current: e.target.checked })}
                    />
                    <span>Current home base</span>
                  </label>

                  <input
                    type="text"
                    value={period.note || ''}
                    placeholder="Optional note (e.g. City, Work)"
                    onChange={(e) => handleUpdatePeriod(period.id, { note: e.target.value })}
                    className="residency-period-item__note"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
