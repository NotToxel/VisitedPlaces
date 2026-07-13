import React from 'react';
import { Info, ShieldCheck, Share2, Compass, WifiOff, Heart, ExternalLink, Github } from 'lucide-react';

const About: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="p-3 md:p-6 h-full flex flex-col gap-4 overflow-hidden bg-transparent max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="glass-panel border border-base-300/50 p-4 rounded-2xl shrink-0 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <Info size={18} className="text-primary animate-pulse" />
          <h2 className="font-extrabold text-sm text-base-content tracking-wide uppercase">About VisitedPlaces</h2>
        </div>
        <span className="text-[10px] bg-primary/10 border border-primary/25 text-primary font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
          v{__APP_VERSION__}
        </span>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-5 pr-1 pb-6 select-none">
        {/* Intro Card */}
        <div className="glass-panel border border-base-300/30 p-5 rounded-2xl flex flex-col gap-3">
          <h3 className="text-md font-bold text-base-content flex items-center gap-2">
            <Compass size={18} className="text-primary" />
            <span>Discover VisitedPlaces</span>
          </h3>
          <p className="text-xs text-base-content/80 leading-relaxed">
            VisitedPlaces is an interactive world travel tracker designed to let you catalog your travel history, map out future dreams, and compare journeys with others. It runs entirely in your browser without requiring account creation, servers, or trackers.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Privacy Card */}
          <div className="glass-panel border border-base-300/30 p-5 rounded-2xl flex flex-col gap-2.5">
            <h4 className="text-sm font-bold text-base-content flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>Privacy by Architecture</span>
            </h4>
            <p className="text-xs text-base-content/70 leading-relaxed">
              We believe your travel history belongs to you. The application operates with zero backend servers. All your markings, region selections, and settings are saved locally inside your browser's <code>localStorage</code>. No data ever leaves your device.
            </p>
          </div>

          {/* Sharing Card */}
          <div className="glass-panel border border-base-300/30 p-5 rounded-2xl flex flex-col gap-2.5">
            <h4 className="text-sm font-bold text-base-content flex items-center gap-1.5">
              <Share2 size={16} className="text-purple-400" />
              <span>Database-Free Sharing</span>
            </h4>
            <p className="text-xs text-base-content/70 leading-relaxed">
              Compare maps and travel stats with friends using URL-safe base64 share codes. When you copy your save code, the app serializes and compresses your places database into a tiny text string that anyone can import or compare side-by-side.
            </p>
          </div>

          {/* Mapping System */}
          <div className="glass-panel border border-base-300/30 p-5 rounded-2xl flex flex-col gap-2.5">
            <h4 className="text-sm font-bold text-base-content flex items-center gap-1.5">
              <Compass size={16} className="text-blue-400" />
              <span>Interactive Map System</span>
            </h4>
            <p className="text-xs text-base-content/70 leading-relaxed">
              Explore country-level detail or drill down into sub-regions (like US states or UK counties). VisitedPlaces handles status propagation automatically—visiting a single sub-region automatically registers the parent country as visited.
            </p>
          </div>

          {/* Offline-First Experience */}
          <div className="glass-panel border border-base-300/30 p-5 rounded-2xl flex flex-col gap-2.5">
            <h4 className="text-sm font-bold text-base-content flex items-center gap-1.5">
              <WifiOff size={16} className="text-amber-400" />
              <span>Offline-First Experience</span>
            </h4>
            <p className="text-xs text-base-content/70 leading-relaxed">
              Your maps, travel logs, search directories, and regional flags are fully functional without an active internet connection. Geometries and flags are cached in persistent browser storage for instant, network-free loading.
            </p>
          </div>
        </div>

        {/* License & Copyright Footer */}
        <div className="glass-panel border border-base-300/30 p-5 rounded-2xl flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <p className="text-xs font-bold text-base-content">
                &copy; {currentYear} VisitedPlaces project.
              </p>
              <p className="text-[11px] text-base-content/60 mt-0.5">
                Released under the GNU Affero General Public License v3.0 (AGPL-3.0).
              </p>
            </div>
            <a 
              href="https://github.com/NotToxel/VisitedPlaces" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-primary btn-xs gap-1.5 self-start sm:self-auto"
            >
              <Github size={11} />
              <span>GitHub Repository</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {/* Built with Heart Footer */}
        <div className="flex items-center justify-center gap-1 text-[11px] text-base-content/40 font-medium">
          Built with <Heart size={10} className="text-red-400 fill-red-400" /> by NotToxel.
        </div>
      </div>
    </div>
  );
};

export default About;
