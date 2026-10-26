import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('tempApp', () => App);
AppRegistry.registerComponent('untitled', () => App);
