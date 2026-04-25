import { initRouter, registerRoute } from './router.js';
import { getCurrentProfileMeta } from './state.js';
import { applyProfileTheme } from './engine/theme.js';
import * as usersScreen from './screens/users-screen.js';
import * as islandsScreen from './screens/islands-screen.js';
import * as mapScreen from './screens/map-screen.js';
import * as challengeScreen from './screens/challenge-screen.js';
import * as resultsScreen from './screens/results-screen.js';
import * as progressScreen from './screens/progress-screen.js';
import * as profileScreen from './screens/profile-screen.js';
import * as practiceScreen from './screens/practice-screen.js';
import * as lockoutScreen from './screens/lockout-screen.js';
import * as shopScreen from './screens/shop-screen.js';
import * as trophiesScreen from './screens/trophies-screen.js';

applyProfileTheme(getCurrentProfileMeta().id);

registerRoute('users', usersScreen);
registerRoute('islands', islandsScreen);
registerRoute('map', mapScreen);
registerRoute('challenge', challengeScreen);
registerRoute('results', resultsScreen);
registerRoute('progress', progressScreen);
registerRoute('profile', profileScreen);
registerRoute('practice', practiceScreen);
registerRoute('lockout', lockoutScreen);
registerRoute('shop', shopScreen);
registerRoute('trophies', trophiesScreen);

const app = document.getElementById('app');
initRouter(app);
