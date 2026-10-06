import React from 'react';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import ModelPage from './components/ModelPage';
import AboutPage from './components/AboutPage';
import Footer from './components/Footer';
import { Element } from 'react-scroll';

function App() {
  return (
    <div className="relative min-h-screen bg-night">
      <Navbar />
      <main>
        <Element name="home">
          <HomePage />
        </Element>
        <Element name="model">
          <ModelPage />
        </Element>
        <Element name="about">
          <AboutPage />
        </Element>
      </main>
      <Footer />
    </div>
  );
}

export default App;