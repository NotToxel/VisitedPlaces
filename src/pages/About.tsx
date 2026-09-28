import { ArrowRight, ChartNoAxesCombined, Compass, Database, Github, Globe2, MapPinned, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const About = () => (
  <main className="survey-about-new">
    <div className="about-inner">
      <header className="about-hero">
        <div>
          <h1>Keep a record of everywhere.</h1>
          <p>VisitedPlaces is a personal atlas for the places you know, the places you hope to see, and the journeys still taking shape.</p>
          <Link to="/" className="about-primary-link">Open your map <ArrowRight size={17} /></Link>
        </div>
        <div className="about-hero-mark" aria-hidden="true"><Globe2 size={104} strokeWidth={0.8} /></div>
      </header>
      <section className="about-section" aria-labelledby="about-how">
        <div className="about-section-heading"><h2 id="about-how">Your atlas, your way</h2><p>Three ways to turn a map into a travel record.</p></div>
        <div className="about-feature-list">
          <article><span className="about-feature-icon"><MapPinned size={21} /></span><div><h3>Mark the places that matter</h3><p>Give countries and supported regions a status: Visited, Wishlist, Revisit, or Avoid. Start on the map or work through the directory.</p></div><Link to="/list" aria-label="Open the places directory"><ArrowRight size={18} /></Link></article>
          <article><span className="about-feature-icon"><ChartNoAxesCombined size={21} /></span><div><h3>See the shape of your travels</h3><p>Explore your coverage by continent and see how your personal map grows as you add places.</p></div><Link to="/analytics" aria-label="Open analytics"><ArrowRight size={18} /></Link></article>
          <article><span className="about-feature-icon"><Share2 size={21} /></span><div><h3>Compare with someone else</h3><p>Share a code when you choose, then place two travel histories side by side to find the overlap and the differences.</p></div><Link to="/compare" aria-label="Open compare"><ArrowRight size={18} /></Link></article>
        </div>
      </section>
      <section className="about-principles" aria-label="How VisitedPlaces works">
        <div className="about-principle-lead"><Compass size={26} /><h2>Made for curious travelers. Built to stay yours.</h2></div>
        <div><Database size={20} /><h3>Stored in this browser</h3><p>Your markings are saved on this device in browser storage. There is no account to create. Export a code if you want a backup or want to share.</p></div>
        <div><Globe2 size={20} /><h3>Ready when you are</h3><p>Country tracking, analytics, and sharing work offline. Some region maps need a connection before they can load.</p></div>
      </section>
      <footer className="about-footer"><div><strong>VisitedPlaces</strong><span>Open source · AGPL-3.0-only · v{__APP_VERSION__}</span></div><a href="https://github.com/NotToxel/VisitedPlaces" target="_blank" rel="noopener noreferrer"><Github size={17} /> View the project <ArrowRight size={16} /></a></footer>
    </div>
  </main>
);

export default About;
