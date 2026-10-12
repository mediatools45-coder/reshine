import padlock from './padlock.js';
import knife from './knife.js';

export const LEVELS = [padlock, knife];
const ALL = [
  ['padlock', 'Rusty Padlock', 'Easy', '3-4 min'], ['knife', 'Pocket Knife', 'Easy-Medium', '4-5 min'], ['sword', 'Rusty Longsword', 'Medium', '5-6 min'],
  ['lighter', 'Vintage Lighter', 'Medium-High', '6-7 min'], ['watch', 'Wristwatch', 'Medium', '5-6 min'], ['keyboard', 'Old PC Keyboard', 'High', '6-8 min'],
  ['clock', 'Twin-Bell Alarm Clock', 'Medium-High', '5-7 min'], ['guitar', 'Acoustic Guitar', 'High', '6-8 min'], ['typewriter', 'Typewriter', 'High', '7-8 min'],
  ['pistol', 'Antique Pistol', 'High', '6-8 min']
];
export const UPCOMING = ALL.map(([id, name, complexity, minutes], i) => ({ id, name, complexity, minutes, num: i + 1 })).filter(u => !LEVELS.find(l => l.id === u.id));
LEVELS.sort((a, b) => a.num - b.num);
