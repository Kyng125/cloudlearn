// Course categories offered when creating or filtering courses (HND Computer Science context).
export const CATEGORIES = [
  { id: 'cat1', name: 'Programming', icon: '💻' },
  { id: 'cat2', name: 'Databases', icon: '🗄️' },
  { id: 'cat3', name: 'Web', icon: '🌐' },
  { id: 'cat4', name: 'Networking', icon: '📡' },
  { id: 'cat5', name: 'Systems', icon: '🖥️' },
  { id: 'cat6', name: 'Cloud Computing', icon: '☁️' },
  { id: 'cat7', name: 'Software Engineering', icon: '🧩' },
  { id: 'cat8', name: 'Security', icon: '🔒' },
];

export const formatMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
