export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  Splash: undefined;
  SOS: undefined;
  Alerts: undefined;
  Volunteer: undefined;
  Profile: undefined;
  Weather: undefined; // Added for the new WeatherScreen
  RequestHelp: { category: 'Food' | 'Medicine' | 'Shelter' | 'Other' };
};
