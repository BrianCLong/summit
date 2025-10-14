import axios from 'axios';  // Existing dep

const AI_SERVER_URL = 'http://ai-server:8000'; // Docker service name and port

export async function runThreatCorrelation(osintData: any) {
  try {
    const response = await axios.post(`${AI_SERVER_URL}/threat_correlation`, osintData);
    return response.data;
  } catch (error) {
    console.error('Error running threat correlation:', error.message);
    throw new Error(`Failed to run threat correlation: ${error.message}`);
  }
}

export async function runWargameOptimizer(logs: any) {
  try {
    const response = await axios.post(`${AI_SERVER_URL}/wargame_optimizer`, logs);
    return response.data;
  } catch (error) {
    console.error('Error running wargame optimizer:', error.message);
    throw new Error(`Failed to run wargame optimizer: ${error.message}`);
  }
}

export async function runSentimentVolatility(signals: any) {
  try {
    const response = await axios.post(`${AI_SERVER_URL}/sentiment_volatility`, signals);
    return response.data;
  } catch (error) {
    console.error('Error running sentiment volatility:', error.message);
    throw new Error(`Failed to run sentiment volatility: ${error.message}`);
  }
}

export async function runStegoAnalyzer(mediaData: any) {
  try {
    const response = await axios.post(`${AI_SERVER_URL}/stego_analyzer`, mediaData);
    return response.data;
  } catch (error) {
    console.error('Error running stego analyzer:', error.message);
    throw new Error(`Failed to run stego analyzer: ${error.message}`);
  }
}