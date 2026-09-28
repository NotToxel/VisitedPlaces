import React from 'react';
import { NavLink } from 'react-router-dom';
import { Map, List, BarChart3, Users, Settings, Info } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

const primaryLinks = [
  { to: '/', label: 'Map', icon: Map, end: true },
  { to: '/list', label: 'Places', icon: List },
  { to: '/analytics', label: 'Insights', icon: BarChart3 },
  { to: '/compare', label: 'Compare', icon: Users },
];

export const Navbar: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  return (
    <>
      <header className="survey-header">
        <NavLink to="/" className="survey-brand" aria-label="VisitedPlaces home">
          <span className="survey-brand__mark"><Map size={22} strokeWidth={1.8} /></span>
          <span>VisitedPlaces</span>
        </NavLink>

        <nav className="survey-navigation" aria-label="Main navigation">
          {primaryLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `survey-navigation__link${isActive ? ' survey-navigation__link--active' : ''}`}
            >
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="survey-header__utility">
          <span className="survey-header__privacy">Offline first · Your data stays here</span>
          <NavLink to="/about" className={({ isActive }) => `survey-header__icon${isActive ? ' survey-header__icon--active' : ''}`} title="About" aria-label="About">
            <Info size={19} strokeWidth={1.8} />
          </NavLink>
          <button type="button" onClick={() => setIsSettingsOpen(true)} className="survey-header__icon" title="Settings" aria-label="Settings">
            <Settings size={19} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      <nav className="survey-mobile-nav" aria-label="Mobile navigation">
        {primaryLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `survey-mobile-nav__link${isActive ? ' survey-mobile-nav__link--active' : ''}`}
          >
            <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </>
  );
};
