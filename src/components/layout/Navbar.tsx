import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  const location = useLocation();
  const navigate = useNavigate();
  const isAboutPage = location.pathname === '/about';
  const previousLocationRef = React.useRef<string>('/');

  React.useEffect(() => {
    if (location.pathname !== '/about') {
      previousLocationRef.current = location.pathname + location.search + location.hash;
    }
  }, [location]);

  const handleAboutClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isAboutPage) {
      e.preventDefault();
      const stateFrom = (location.state as { from?: string } | null)?.from;
      if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
        navigate(-1);
      } else {
        navigate(stateFrom || previousLocationRef.current || '/');
      }
    }
  };

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
          <NavLink
            to="/about"
            state={{ from: location.pathname + location.search + location.hash }}
            onClick={handleAboutClick}
            className={({ isActive }) => `survey-header__icon${isActive ? ' survey-header__icon--active' : ''}`}
            title={isAboutPage ? 'Close About' : 'About'}
            aria-label={isAboutPage ? 'Close About' : 'About'}
          >
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
