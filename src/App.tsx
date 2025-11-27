import { useState, useEffect, useMemo } from 'react';
import { 
  Star, 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  Globe, 
  MessageSquare,
  Search,
  MapPin,
  Calendar,
  ShieldCheck
} from 'lucide-react';
import { 
  initializeApp 
} from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged
} from 'firebase/auth';
import type { User } from 'firebase/auth'; // FIXED: Type-only import
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot,
  FirestoreError
} from 'firebase/firestore';
import type { QuerySnapshot } from 'firebase/firestore'; // FIXED: Type-only import

// --- Firebase Configuration & Init ---
const firebaseConfig = {
  apiKey: "AIzaSyDVSfSFr0uAvChIBQlWpICFgfeKVLlsKp4",
  authDomain: "flex-living-reviews-2f429.firebaseapp.com",
  projectId: "flex-living-reviews-2f429",
  storageBucket: "flex-living-reviews-2f429.firebasestorage.app",
  messagingSenderId: "982810576254",
  appId: "1:982810576254:web:34f8512b1d8ed4fb48df2f",
  measurementId: "G-F84Y0E8GNW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'flex-rajas';

// --- Types & Interfaces ---

interface ReviewCategory {
  category: string;
  rating: number;
}

interface HostawayReview {
  id: number;
  type: 'guest-to-host' | 'host-to-guest';
  status: string;
  rating: number | null; 
  publicReview: string;
  reviewCategory: ReviewCategory[];
  submittedAt: string;
  guestName: string;
  listingName: string;
  channelName?: string; 
}

interface NormalizedReview extends HostawayReview {
  calculatedRating: number;
  isPublished: boolean; 
  source: 'Hostaway' | 'Google' | 'Direct';
}

// --- Mock Data Generation (Simulating Hostaway API) ---

const MOCK_LISTINGS = [
  "2B N1 A - 29 Shoreditch Heights",
  "1B Kensington Luxury Suite",
  "3B Notting Hill Townhouse"
];

const generateMockReviews = (): HostawayReview[] => {
  const reviews: HostawayReview[] = [];
  const startId = 7453;
  
  const comments = [
    "Shane and family are wonderful! Would definitely host again :)",
    "The place was exactly as described. Great location and very clean.",
    "Bit noisy at night, but otherwise a fantastic stay. The host was responsive.",
    "Absolutely stunning apartment. The decor is beautiful.",
    "We had issues with the wifi, but they fixed it quickly.",
    "Perfect for a business trip. Close to the tube.",
    "Needs a bit of a deep clean in the bathroom, but good value.",
    "Review from Google: Great service overall.", 
  ];

  const guests = ["Shane Finkelstein", "Sarah Jenkins", "Mike Ross", "Rachel Green", "Tom Hiddleston", "Emily Blunt"];

  for (let i = 0; i < 25; i++) {
    const isGood = Math.random() > 0.3;
    const baseRating = isGood ? 9 : 6;
    
    reviews.push({
      id: startId + i,
      type: 'guest-to-host',
      status: 'published',
      rating: null,
      publicReview: comments[i % comments.length],
      reviewCategory: [
        { category: "cleanliness", rating: baseRating + (Math.random() * 2 - 1) },
        { category: "communication", rating: 10 },
        { category: "respect_house_rules", rating: 10 },
        { category: "location", rating: baseRating + 1 }
      ],
      submittedAt: new Date(Date.now() - Math.random() * 10000000000).toISOString().replace('T', ' ').split('.')[0],
      guestName: guests[i % guests.length],
      listingName: MOCK_LISTINGS[i % MOCK_LISTINGS.length],
      channelName: Math.random() > 0.8 ? 'Google' : 'Airbnb' 
    });
  }
  return reviews;
};

// --- Helper Functions ---

const calculateAverage = (categories: ReviewCategory[]): number => {
  if (!categories || categories.length === 0) return 0;
  const sum = categories.reduce((acc, curr) => acc + curr.rating, 0);
  return parseFloat((sum / categories.length).toFixed(1));
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

// --- Components ---

// 1. Sidebar Navigation
const Sidebar = ({ currentView, setView }: { currentView: string, setView: (v: string) => void }) => (
  <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 z-20 hidden md:flex">
    <div className="p-6 border-b border-slate-800">
      <h1 className="text-2xl font-bold tracking-tight text-white"><span className="text-emerald-400">Flex</span> Living</h1>
      <p className="text-xs text-slate-400 mt-1">Manager Portal</p>
    </div>
    <nav className="flex-1 p-4 space-y-2">
      <button 
        onClick={() => setView('dashboard')}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
      >
        <LayoutDashboard size={20} />
        <span>Dashboard</span>
      </button>
      <button 
        onClick={() => setView('public')}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'public' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
      >
        <Globe size={20} />
        <span>Live Site Preview</span>
      </button>
      <div className="pt-8 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Integrations
      </div>
      <div className="flex items-center space-x-3 px-4 py-3 text-slate-400 cursor-not-allowed opacity-70">
        <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-black font-bold text-[10px]">G</div>
        <span>Google Reviews</span>
        <span className="ml-auto text-[10px] bg-slate-800 px-1 rounded text-emerald-400">Active</span>
      </div>
    </nav>
    <div className="p-4 border-t border-slate-800">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
          <Users size={16} />
        </div>
        <div>
          <p className="text-sm font-medium">Admin User</p>
          <p className="text-xs text-slate-500">manager@flexliving.com</p>
        </div>
      </div>
    </div>
  </div>
);

// 2. Dashboard View
const ManagerDashboard = ({ reviews, togglePublish }: { reviews: NormalizedReview[], togglePublish: (id: number, current: boolean) => void }) => {
  const [filterListing, setFilterListing] = useState<string>('All');
  const [filterRating, setFilterRating] = useState<string>('All');
  const [search, setSearch] = useState('');

  // Derived Statistics
  const stats = useMemo(() => {
    const total = reviews.length;
    const avgRating = reviews.reduce((acc, r) => acc + r.calculatedRating, 0) / total || 0;
    const publishedCount = reviews.filter(r => r.isPublished).length;
    const googleCount = reviews.filter(r => r.channelName === 'Google').length;
    return { total, avgRating: avgRating.toFixed(1), publishedCount, googleCount };
  }, [reviews]);

  // Filter Logic
  const filteredReviews = reviews.filter(r => {
    const matchesListing = filterListing === 'All' || r.listingName === filterListing;
    const matchesRating = filterRating === 'All' 
      ? true 
      : filterRating === 'High' ? r.calculatedRating >= 9 
      : r.calculatedRating < 7;
    const matchesSearch = r.publicReview.toLowerCase().includes(search.toLowerCase()) || r.guestName.toLowerCase().includes(search.toLowerCase());
    return matchesListing && matchesRating && matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      {/* Header Stats */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Reviews Overview</h2>
        <p className="text-slate-500 mt-1">Monitor listing performance and moderate public reviews.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Avg. Rating</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{stats.avgRating}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                <Star size={20} fill="currentColor" />
              </div>
            </div>
            <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center">
              <TrendingUp size={12} className="mr-1" /> +0.2 this month
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Reviews</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <MessageSquare size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Published</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{stats.publishedCount}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                <Globe size={20} />
              </div>
            </div>
          </div>

           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">From Google</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{stats.googleCount}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                <span className="font-bold">G</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-t-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search guest or content..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-3 overflow-x-auto pb-2 md:pb-0">
          <select 
            value={filterListing}
            onChange={(e) => setFilterListing(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none"
          >
            <option value="All">All Listings</option>
            {MOCK_LISTINGS.map(l => <option key={l} value={l}>{l.substring(0, 20)}...</option>)}
          </select>

          <select 
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none"
          >
            <option value="All">All Ratings</option>
            <option value="High">High (9+)</option>
            <option value="Low">Attention Needed (&lt;7)</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white border-x border-b border-slate-200 rounded-b-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 font-semibold">Guest & Source</th>
                <th className="p-4 font-semibold">Listing</th>
                <th className="p-4 font-semibold">Review</th>
                <th className="p-4 font-semibold">Scores</th>
                <th className="p-4 font-semibold text-center">Public Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReviews.map((review) => (
                <tr key={review.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 align-top w-48">
                    <div className="font-medium text-slate-900">{review.guestName}</div>
                    <div className="text-xs text-slate-500 mt-1">{formatDate(review.submittedAt)}</div>
                    <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      {review.channelName === 'Google' ? <span className="mr-1 text-blue-500 font-bold">G</span> : null}
                      {review.channelName || 'Direct'}
                    </div>
                  </td>
                  <td className="p-4 align-top w-48">
                    <div className="text-sm text-slate-600 line-clamp-2" title={review.listingName}>
                      {review.listingName}
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <p className="text-sm text-slate-700 leading-relaxed">{review.publicReview}</p>
                  </td>
                  <td className="p-4 align-top w-32">
                    <div className="flex items-center space-x-1">
                      <span className={`text-lg font-bold ${review.calculatedRating >= 9 ? 'text-emerald-600' : review.calculatedRating >= 7 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {review.calculatedRating}
                      </span>
                      <span className="text-xs text-slate-400">/10</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400 space-y-0.5">
                      {review.reviewCategory.slice(0,2).map((cat, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="capitalize">{cat.category}</span>
                          <span>{cat.rating}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 align-top text-center w-32">
                    <button 
                      onClick={() => togglePublish(review.id, review.isPublished)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${review.isPublished ? 'bg-emerald-600' : 'bg-slate-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${review.isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <div className="mt-2 text-[10px] font-medium text-slate-500">
                      {review.isPublished ? 'Visible' : 'Hidden'}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReviews.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    No reviews found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 3. Public Property Page View
const PublicPropertyPage = ({ reviews, goBack }: { reviews: NormalizedReview[], goBack: () => void }) => {
  // Only show published reviews
  const publishedReviews = reviews.filter(r => r.isPublished);
  const selectedListing = MOCK_LISTINGS[0]; // Simulating we are on the page for the first listing
  const listingReviews = publishedReviews.filter(r => r.listingName === selectedListing);
  const avgRating = listingReviews.length > 0 ? (listingReviews.reduce((acc, r) => acc + r.calculatedRating, 0) / listingReviews.length).toFixed(1) : 'New';

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      {/* Mock Navigation */}
      <nav className="border-b border-slate-100 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="text-xl font-bold tracking-tight">FLEX <span className="font-light">LIVING</span></div>
        <div className="hidden md:flex space-x-8 text-sm font-medium text-slate-600">
          <span className="cursor-pointer hover:text-black">Locations</span>
          <span className="cursor-pointer hover:text-black">Long Stays</span>
          <span className="cursor-pointer hover:text-black">Corporate</span>
        </div>
        <button onClick={goBack} className="bg-black text-white px-4 py-2 text-sm rounded hover:bg-slate-800">
          Back to Admin
        </button>
      </nav>

      {/* Hero Section */}
      <div className="h-96 md:h-[500px] bg-slate-200 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10"></div>
        <img 
          src="/api/placeholder/1200/600" 
          alt="Luxury Apartment" 
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 p-6 md:p-12 z-20 text-white">
          <div className="flex items-center space-x-2 mb-2">
            <span className="bg-white/20 backdrop-blur px-2 py-1 rounded text-xs uppercase tracking-widest font-semibold">Shoreditch</span>
            <div className="flex items-center bg-emerald-500 px-2 py-1 rounded text-xs font-bold">
              <Star size={12} className="mr-1 fill-white" />
              {avgRating} ({listingReviews.length} reviews)
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-2">{selectedListing}</h1>
          <p className="text-lg text-slate-200">2 Bedroom • 2 Bath • Urban Luxury</p>
        </div>
      </div>

      {/* Content Layout */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 grid grid-cols-1 md:grid-cols-3 gap-12">
        
        {/* Main Details (Left 2/3) */}
        <div className="md:col-span-2 space-y-12">
          
          <section>
            <h3 className="text-2xl font-bold mb-4">About this home</h3>
            <p className="text-slate-600 leading-relaxed">
              Experience the vibrant heart of London in this stunningly designed apartment in Shoreditch. 
              Featuring floor-to-ceiling windows, a fully equipped chef's kitchen, and bespoke furniture, 
              this is the perfect base for your city adventure.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-6">
               <div className="flex items-center text-slate-700"><MapPin size={18} className="mr-2 text-slate-400"/> Prime Location</div>
               <div className="flex items-center text-slate-700"><ShieldCheck size={18} className="mr-2 text-slate-400"/> Professionally Cleaned</div>
               <div className="flex items-center text-slate-700"><Calendar size={18} className="mr-2 text-slate-400"/> Flexible Check-in</div>
               <div className="flex items-center text-slate-700"><Users size={18} className="mr-2 text-slate-400"/> 24/7 Support</div>
            </div>
          </section>

          {/* REVIEWS SECTION - The Requirement */}
          <section id="reviews" className="border-t border-slate-100 pt-12">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold">Guest Reviews</h3>
              <div className="flex items-center space-x-1">
                 <Star className="text-emerald-500 fill-emerald-500" size={20} />
                 <span className="text-xl font-bold">{avgRating}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {listingReviews.length > 0 ? (
                listingReviews.map((review) => (
                  <div key={review.id} className="bg-slate-50 p-6 rounded-xl">
                     <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                           <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center font-bold text-slate-600">
                             {review.guestName.charAt(0)}
                           </div>
                           <div>
                             <p className="font-bold text-slate-900">{review.guestName}</p>
                             <p className="text-xs text-slate-500">{formatDate(review.submittedAt)}</p>
                           </div>
                        </div>
                        <div className="flex items-center bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                           <Star size={14} className="text-emerald-500 fill-emerald-500 mr-1" />
                           <span className="font-bold text-sm">{review.calculatedRating}</span>
                        </div>
                     </div>
                     <p className="mt-4 text-slate-700 leading-relaxed italic">
                       "{review.publicReview}"
                     </p>
                     
                     {/* Category breakdown (Subtle) */}
                     <div className="mt-4 flex flex-wrap gap-3">
                       {review.reviewCategory.slice(0,3).map((cat, idx) => (
                         <span key={idx} className="text-xs px-2 py-1 bg-white rounded border border-slate-100 text-slate-500">
                           {cat.category}: {cat.rating}/10
                         </span>
                       ))}
                     </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-xl text-slate-500">
                  No reviews are currently displayed for this property.
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Sidebar Booking Widget (Right 1/3) */}
        <div className="md:col-span-1">
          <div className="bg-white border border-slate-200 shadow-xl rounded-xl p-6 sticky top-24">
             <div className="flex justify-between items-center mb-4">
                <span className="text-2xl font-bold">£180 <span className="text-sm font-normal text-slate-500">/ night</span></span>
                <span className="flex items-center text-sm font-medium">
                   <Star size={14} className="fill-emerald-500 text-emerald-500 mr-1" /> {avgRating}
                </span>
             </div>
             <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors mb-2">
               Check Availability
             </button>
             <p className="text-center text-xs text-slate-400">You won't be charged yet</p>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- Main App Controller ---

export default function FlexLivingApp() {
  const [user, setUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<NormalizedReview[]>([]);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // 1. Authentication
  useEffect(() => {
    const initAuth = async () => {
      // Simple anonymous sign-in for your Vercel deployment
      await signInAnonymously(auth);
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u: User | null) => setUser(u));
    return () => unsubscribe();
  }, []);

  // 2. Fetch Reviews + Sync with Firestore
  useEffect(() => {
    if (!user) return;

    // Simulate API Fetch
    const fetchData = async () => {
      setLoading(true);
      // Generate mock Hostaway Data
      const apiReviews = generateMockReviews();
      
      // Setup listener for Published status in Firestore
      const publishedRef = collection(db, 'artifacts', appId, 'public', 'data', 'flex_reviews');
      
      const unsubscribe = onSnapshot(publishedRef, (snapshot: QuerySnapshot) => {
        const publishedMap = new Map();
        snapshot.docs.forEach((doc: any) => {
          publishedMap.set(parseInt(doc.id), doc.data().isPublished);
        });

        // Merge API data with Firestore persistence
        const mergedReviews: NormalizedReview[] = apiReviews.map(r => ({
          ...r,
          calculatedRating: calculateAverage(r.reviewCategory),
          isPublished: publishedMap.has(r.id) ? publishedMap.get(r.id) : false, // Default false
          source: r.channelName === 'Google' ? 'Google' : 'Hostaway'
        }));
        
        // Sort by date desc
        mergedReviews.sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

        setReviews(mergedReviews);
        setLoading(false);
      }, (error: FirestoreError) => {
        console.error("Firestore sync error:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    };

    fetchData();
  }, [user]);

  // 3. Toggle Publish Action
  const handleTogglePublish = async (reviewId: number, currentStatus: boolean) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'flex_reviews', reviewId.toString());
      await setDoc(docRef, { isPublished: !currentStatus }, { merge: true });
    } catch (e) {
      console.error("Error updating status:", e);
    }
  };

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // Mobile nav toggle
  const MobileNav = () => (
    <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center">
       <span className="font-bold">Flex Living Manager</span>
       <button onClick={() => setView(view === 'dashboard' ? 'public' : 'dashboard')} className="text-sm bg-slate-800 px-3 py-1 rounded">
         Switch View
       </button>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {view === 'dashboard' && (
        <>
          <Sidebar currentView={view} setView={setView} />
          <div className="flex-1 flex flex-col h-screen overflow-auto relative md:ml-64">
            <MobileNav />
            <ManagerDashboard reviews={reviews} togglePublish={handleTogglePublish} />
          </div>
        </>
      )}

      {view === 'public' && (
         <div className="w-full h-screen overflow-auto">
           <PublicPropertyPage reviews={reviews} goBack={() => setView('dashboard')} />
         </div>
      )}
    </div>
  );
}