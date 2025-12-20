/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

// Register background tasks
import './src/services/BackgroundTasks';

AppRegistry.registerComponent(appName, () => App);
