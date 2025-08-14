import HighlightedFeature from './components/HighlightedFeature';
import aiReadyDark from '../client/static/assets/aiready-dark.webp';
import aiReady from '../client/static/assets/aiready.webp';

export default function AIReady() {
  return (
    <HighlightedFeature
      name='AI-Powered PDF Processing'
      description='Upload any PDF document and watch our AI transform it into an interactive learning module. Mozilla AI Docling handles complex layouts, tables, images, and even scanned documents with OCR technology.'
      highlightedComponent={<AIReadyExample />}
      direction='row-reverse'
    />
  );
}

const AIReadyExample = () => {
  return (
    <div className='w-full'>
      <img src={aiReady} alt='AI Ready' className='dark:hidden' />
      <img src={aiReadyDark} alt='AI Ready' className='hidden dark:block' />
    </div>
  );
};
