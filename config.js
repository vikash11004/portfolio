// Production/public client config.
// Replace placeholder Firebase values before deploying.
window.PORTFOLIO_CONFIG = {
  FIREBASE_CONFIG: {
    apiKey: 'AIzaSyBb3cDqQ8XOETjMuYEBESvqBBoYqbH6vII',
    authDomain: 'portfolio-d114e.firebaseapp.com',
    projectId: 'portfolio-d114e',
    storageBucket: 'portfolio-d114e.firebasestorage.app',
    messagingSenderId: '168715787606',
    appId: '1:168715787606:web:466cf4fe9b9b4890c90af7',
    measurementId: 'G-JDZSFFK8NY'
  },
  OWNER_EMAIL: 'vikashthyadi1104@gmail.com',
  // Web3Forms Access Key (Free instant key from https://web3forms.com)
  WEB3FORMS_ACCESS_KEY: 'c55dd7ab-dc6a-4015-8fbe-5aa590904313',
  // Cloudinary image upload configuration (100% free, no credit card required)
  CLOUDINARY: {
    cloudName: 'ucebpoei',
    uploadPreset: 'portfolio_uploads'
  },
  // Cloud AI Provider configuration for GVEN Assistant (Groq, OpenRouter, etc.)
  AI_CONFIG: {
    provider: 'proxy', // 'builtin' | 'proxy' | 'groq' | 'openrouter' | 'custom'
    proxyUrl: 'https://gven-ai-proxy.vikashthyadi1104.workers.dev/', // Secure Cloudflare Worker proxy
    groqApiKey: '',
    groqModel: 'openai/gpt-oss-120b',
    openrouterApiKey: '',
    openrouterModel: 'meta-llama/llama-3.3-70b-instruct:free',
    customEndpoint: '',
    customApiKey: '',
    customModel: ''
  }
};

