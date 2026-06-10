**PinPoint: Interactive Travel Tracker**

PinPoint is a full-stack, interactive digital scratch map and travel diary. It allows users to securely log in, visualize the countries they have visited on a custom-styled globe, and save memories, tags, and photos to a personalized dashboard.

**Features**

Interactive Data Visualization: A custom React-based SVG map where unvisited countries are charcoal and visited countries glow teal. Features smooth double-click zooming and panning.

Secure User Authentication: Private accounts ensure that users only see their own maps and travel data.

Dynamic Trip Logging: Add trips with custom dynamic tags (e.g., Solo, Honeymoon) and automatically generate filterable dropdowns.

Cloud Photo Galleries: Upload high-resolution memories attached to specific countries.

Advanced Mobile Responsiveness: Features a frosted-glass Bottom Sheet layout on mobile devices, ensuring the map remains usable on small screens without cramping the data.

**Tech Stack**

Frontend: React.js (Vite), CSS3 (Flexbox/Grid, Glassmorphism UI).

Mapping: react-simple-maps with custom SVG projections.

Backend & Auth: Firebase Authentication & Firebase Realtime Database.

Storage: Cloudinary (Image hosting API).

Deployment: Netlify.

Application Gallery

The main dashboard featuring the Midnight Ocean dark theme, user stats (Rank, Countries Visited), and dynamic map highlighting.

Fully responsive mobile design. The sidebar converts into a collapsible, frosted-glass bottom sheet so the map remains fully interactive on phones.

Clicking a country opens a localized gallery and form, fetching images securely from the cloud.


**What I Learned & Engineering Struggles**

Building PinPoint taught me how to move beyond static web pages and handle the complexities of a live, full-stack application. Here are the biggest hurdles I overcame:

Scaling, Resources, and the Billing Wall
My original idea relied on Firebase Firestore and Firebase Storage. However, I quickly hit Google Cloud's billing barriers requiring credit cards for object storage.
The Pivot: To keep the application 100% free to scale, I re-engineered the backend. I migrated the data structure to Firebase's Realtime Database (which has a free tier), and integrated the Cloudinary API to handle image hosting. The app now pushes the image to Cloudinary, grabs the secure URL, and saves it seamlessly to Firebase.

Taming the Flexbox Ghost and Mobile Layouts
Translating a data-heavy desktop dashboard to a mobile screen was a massive challenge. When text data (like long trip names) got too large, it would break the Flexbox constraints, causing UI elements to vanish or collapse to 0px.
The Solution: I learned to aggressively utilize CSS Grid to mathematically lock elements into place, and built a custom layout that traps the screen height and pushes interactive menus into a collapsible mobile drawer.

Event Capturing & DOM Conflicts
Making the map highly interactive introduced event listener conflicts. For example, trying to implement a "click outside to close" hook for my top dropdown menus failed because the map library was using the click events to calculate panning.
The Solution: I learned about the JavaScript event lifecycle and used the Capturing Phase to intercept mouse clicks before they reached the map canvas, allowing my dropdowns to close seamlessly. I applied similar logic to override the map's default double-click-to-zoom behavior with a custom smooth-reset function.