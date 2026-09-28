import { useEffect, useState } from 'react';

interface TickerNumberProps {
  value: number;
  className?: string;
}

interface DisplayValue {
  from: number;
  to: number;
  revision: number;
}

const DURATION_MS = 320;

export function TickerNumber({ value, className = '' }: TickerNumberProps) {
  const [display, setDisplay] = useState<DisplayValue>({ from: value, to: value, revision: 0 });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDisplay((current) => current.to === value
        ? current
        : { from: current.to, to: value, revision: current.revision + 1 });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    if (display.from === display.to) return;
    const timer = window.setTimeout(() => {
      setDisplay((current) => current.revision === display.revision
        ? { ...current, from: current.to }
        : current);
    }, DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [display]);

  const digitCount = Math.max(String(display.from).length, String(display.to).length);
  const from = String(display.from).padStart(digitCount, ' ');
  const to = String(display.to).padStart(digitCount, ' ');
  const changingDigitCount = String(display.from).length !== String(display.to).length;

  return (
    <span className={`ticker-number ${className}`}>
      <span className="ticker-number__spoken">{value}</span>
      {changingDigitCount ? (
        <span className="ticker-number__whole" aria-hidden="true">
          <span className="ticker-number__whole-roll" key={display.revision}>
            <span>{display.from}</span>
            <span>{display.to}</span>
          </span>
        </span>
      ) : Array.from({ length: digitCount }, (_, index) => {
        const oldDigit = from[index] ?? ' ';
        const newDigit = to[index] ?? ' ';
        const changed = oldDigit !== newDigit;
        return (
          <span className="ticker-number__digit" key={index} aria-hidden="true">
            {changed ? (
              <span className="ticker-number__roll" key={`${display.revision}-${index}`}>
                <span>{oldDigit === ' ' ? '\u00a0' : oldDigit}</span>
                <span>{newDigit === ' ' ? '\u00a0' : newDigit}</span>
              </span>
            ) : <span>{newDigit === ' ' ? '\u00a0' : newDigit}</span>}
          </span>
        );
      })}
    </span>
  );
}
