export const SURVEY_TYPES = [
  { id: 'political', name: 'Political Polling', icon: 'P', desc: 'Voting intent, leader approval, issues' },
  { id: 'market', name: 'Market Research', icon: 'M', desc: 'Brand awareness, purchase intent' },
  { id: 'customer', name: 'Customer Feedback', icon: 'C', desc: 'Satisfaction, NPS, service quality' },
  { id: 'employee', name: 'Employee Survey', icon: 'E', desc: 'Engagement, culture, workplace' },
  { id: 'social', name: 'Social Research', icon: 'S', desc: 'Attitudes, behaviors, social issues' },
  { id: 'custom', name: 'Custom Survey', icon: '+', desc: 'Build from scratch' },
];

export const QUESTION_TYPES = [
  { id: 'single', name: 'Single Choice', icon: '○' },
  { id: 'multiple', name: 'Multiple Choice', icon: '☐' },
  { id: 'likert', name: 'Likert Scale', icon: '—' },
  { id: 'rating', name: 'Rating (1-10)', icon: '★' },
  { id: 'nps', name: 'NPS (0-10)', icon: '#' },
  { id: 'open', name: 'Open Ended', icon: '...' },
  { id: 'yes_no', name: 'Yes / No', icon: '✓' },
];

export const GEOGRAPHIES = [
  { id: 'national', name: 'National (All India)' },
  { id: 'state', name: 'State-level' },
  { id: 'district', name: 'District-level' },
  { id: 'constituency', name: 'Constituency-level' },
  { id: 'urban', name: 'Urban areas only' },
  { id: 'rural', name: 'Rural areas only' },
];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir', 'Ladakh'
];
