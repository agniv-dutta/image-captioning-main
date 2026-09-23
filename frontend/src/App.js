
import AboutPage from './components/AboutPage';
import ContactPage from './components/ContactPage';
import HomePage from './components/HomePage';
import ModelPage from './components/ModelPage';
import Navbar from './components/Navbar';
import { Element } from 'react-scroll';
function App() {
  return (
    <div className='relative'>
      <Navbar />
      <Element name="home">
        <HomePage />
      </Element>
      <Element name="model">
        <ModelPage />
      </Element>
      <Element name="about">
        <AboutPage />
      </Element>
      <Element name="contact">
        <ContactPage />
      </Element>
    </div>
  );
}

export default App;
