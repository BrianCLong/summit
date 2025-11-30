#!/usr/bin/env node

// A simple Node.js script that fetches data from three public APIs concurrently.
// It uses async/await with Promise.all, and handles errors gracefully.

// Fetch helper to retrieve JSON and enforce HTTP success.
async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}`);
  }
  return response.json();
}

// Main execution wrapped in an async IIFE so we can use await at the top level.
(async () => {
  // Define the endpoints we want to call.
  const endpoints = {
    post: 'https://jsonplaceholder.typicode.com/posts/1',
    todo: 'https://jsonplaceholder.typicode.com/todos/1',
    user: 'https://jsonplaceholder.typicode.com/users/1'
  };

  try {
    // Kick off all fetches concurrently and wait for all of them to complete.
    const [post, todo, user] = await Promise.all([
      fetchJson(endpoints.post),
      fetchJson(endpoints.todo),
      fetchJson(endpoints.user)
    ]);

    // Combine the responses and print them as formatted JSON.
    const combined = { post, todo, user };
    console.log(JSON.stringify(combined, null, 2));
  } catch (error) {
    // Gracefully handle any error from the API calls.
    console.error('Failed to fetch data from all APIs:', error.message);
    process.exitCode = 1;
  }
})();
