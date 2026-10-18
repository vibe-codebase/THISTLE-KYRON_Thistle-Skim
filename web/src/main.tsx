import { createRoot } from 'react-dom/client';
import '@fontsource/dm-serif-display/latin-400.css';
import '@fontsource/dm-serif-display/latin-400-italic.css';
import '@fontsource/nunito-sans/latin-400.css';
import '@fontsource/nunito-sans/latin-600.css';
import '@fontsource/nunito-sans/latin-800.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
