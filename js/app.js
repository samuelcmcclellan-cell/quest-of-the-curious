import { initRouter, registerRoute } from './router.js';
import * as titleScreen from './screens/title-screen.js';
import * as islandsScreen from './screens/islands-screen.js';
import * as mapScreen from './screens/map-screen.js';
import * as challengeScreen from './screens/challenge-screen.js';
import * as resultsScreen from './screens/results-screen.js';
import * as profileScreen from './screens/profile-screen.js';
import * as practiceScreen from './screens/practice-screen.js';

registerRoute('title', titleScreen);
registerRoute('islands', islandsScreen);
registerRoute('map', mapScreen);
registerRoute('challenge', challengeScreen);
registerRoute('results', resultsScreen);
registerRoute('profile', profileScreen);
registerRoute('practice', practiceScreen);

const app = document.getElementById('app');
initRouter(app);
