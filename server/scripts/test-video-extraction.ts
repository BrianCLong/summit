import axios from 'axios';
import path from 'path';
import fs from 'fs';

const API_BASE_URL = 'http://localhost:4000/api/ai'; // Assuming server runs on 4000
const VIDEO_PATH_ARG = process.argv[2]; // Get video path from command line argument
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'mock-jwt-token'; // WAR-GAMED SIMULATION - Mock token

if (!VIDEO_PATH_ARG) {
  console.error('Usage: ts-node test-video-extraction.ts <path_to_video_file>');
  process.exit(1);
}

const videoPath = path.resolve(VIDEO_PATH_ARG);

if (!fs.existsSync(videoPath)) {
  console.error(`Error: Video file not found at ${videoPath}`);
  process.exit(1);
}

async function testVideoExtraction() {
  console.log(`Submitting video extraction job for: ${videoPath}`);

  try {
    // 1. Submit the extraction job
    const submitResponse = await axios.post(
      `${API_BASE_URL}/extract-video`,
      {
        mediaPath: videoPath,
        mediaType: 'VIDEO',
        extractionMethods: ['video_analysis'],
        options: {
          frameRate: 0.5, // Extract 1 frame every 2 seconds
          extractAudio: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const { jobId, message } = submitResponse.data;
    console.log(`Job submitted: ${message}`);
    console.log(`Job ID: ${jobId}`);

    // 2. Poll for job status
    let jobStatus = 'waiting';
    let progress = 0;
    let result: any = null;
    let error: any = null;

    while (jobStatus !== 'completed' && jobStatus !== 'failed') {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5 seconds
      const statusResponse = await axios.get(
        `${API_BASE_URL}/job-status/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${AUTH_TOKEN}`,
          },
        },
      );
      const data = statusResponse.data;
      jobStatus = data.status;
      progress = data.progress || 0;
      result = data.result;
      error = data.error;

      console.log(`Job ${jobId} status: ${jobStatus}, Progress: ${progress}%`);
    }

    if (jobStatus === 'completed') {
      console.log('\n--- Job Completed Successfully ---');
      console.log(
        'Extracted Entities Count:',
        result?.results?.[0]?.entities?.length || 0,
      );
      // console.log('Full Result:', JSON.stringify(result, null, 2)); // Uncomment for full result
    } else {
      console.error('\n--- Job Failed ---');
      console.error('Error details:', error);
    }
  } catch (err: any) {
    console.error('\n--- An error occurred ---');
    if (axios.isAxiosError(err) && err.response) {
      console.error('API Error:', err.response.status, err.response.data);
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
}

testVideoExtraction();
