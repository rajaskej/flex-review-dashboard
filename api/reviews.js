export default async function handler(req, res) {
  // 1. Securely access credentials from Environment Variables
  // (Do not hardcode these in production!)
  const ACCOUNT_ID = process.env.HOSTAWAY_ACCOUNT_ID || "61148";
  const API_KEY = process.env.HOSTAWAY_API_KEY || "f94377ebbbb479490bb3ec364649168dc443dda2e4830facaf5de2e74ccc9152";

  try {
    // 2. Call the real Hostaway API
    // Note: Hostaway usually requires getting an access token first, 
    // but for this example, we'll assume a direct call or placeholder for Auth logic.
    const response = await fetch('https://api.hostaway.com/v1/reviews', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${...}` // You would handle Auth token generation here
        'X-Account-ID': ACCOUNT_ID,       // Example headers
        'X-API-Key': API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Hostaway API Error: ${response.statusText}`);
    }

    const data = await response.json();

    // 3. Normalization Logic (Moved from Frontend to Backend)
    // This keeps your frontend clean and data consistent
    const normalizedReviews = data.result.map(review => ({
      id: review.id,
      type: review.type,
      status: review.status,
      // Calculate rating on the server side
      rating: review.rating || calculateAverage(review.reviewCategory),
      publicReview: review.publicReview,
      reviewCategory: review.reviewCategory,
      submittedAt: review.submittedAt,
      guestName: review.guestName,
      listingName: review.listingName,
      channelName: 'Hostaway' // Default source
    }));

    // 4. Return the clean data to your Frontend
    res.status(200).json(normalizedReviews);

  } catch (error) {
    console.error("API Route Error:", error);
    // Return mock data as fallback if real API fails (Optional but good for robustness)
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
}

// Helper to keep backend logic self-contained
const calculateAverage = (categories) => {
  if (!categories || categories.length === 0) return 0;
  const sum = categories.reduce((acc, curr) => acc + curr.rating, 0);
  return parseFloat((sum / categories.length).toFixed(1));
};