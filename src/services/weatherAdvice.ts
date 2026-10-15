import type { WeatherData } from '../screens/api';

export type WeatherMood = 'clear' | 'cloudy' | 'rain' | 'storm' | 'fog' | 'snow' | 'unknown';

// Group the condition text from either weather source into a few moods the
// screen can colour and pick an icon for.
export function weatherMood(conditions: string | null | undefined): WeatherMood {
  const text = (conditions || '').toLowerCase();
  if (!text || text.includes('unknown')) return 'unknown';
  if (text.includes('thunder')) return 'storm';
  if (text.includes('snow') || text.includes('sleet') || text.includes('hail')) return 'snow';
  if (text.includes('rain') || text.includes('drizzle') || text.includes('shower')) return 'rain';
  if (text.includes('fog')) return 'fog';
  if (text.includes('cloud') || text.includes('overcast')) return 'cloudy';
  if (text.includes('clear') || text.includes('fair') || text.includes('sun')) return 'clear';
  return 'unknown';
}

export interface SafetyTip {
  level: 'danger' | 'warning' | 'info';
  title: string;
  detail: string;
}

// Plain-language safety advice for the public, driven by live conditions.
export function safetyTips(weather: Pick<WeatherData, 'conditions' | 'temperature' | 'feelsLike' | 'wind' | 'humidity'>): SafetyTip[] {
  const tips: SafetyTip[] = [];
  const mood = weatherMood(weather.conditions);
  const text = (weather.conditions || '').toLowerCase();
  const heat = weather.feelsLike ?? weather.temperature;

  if (mood === 'storm') {
    tips.push({
      level: 'danger',
      title: 'Thunderstorm nearby',
      detail: 'Stay indoors and away from windows. Unplug electrical appliances and avoid open ground and trees.',
    });
  }
  if (mood === 'rain' && /heavy|violent/.test(text)) {
    tips.push({
      level: 'danger',
      title: 'Heavy rain',
      detail: 'Avoid low-lying roads and underpasses. Never walk or drive through flood water.',
    });
  } else if (mood === 'rain') {
    tips.push({
      level: 'info',
      title: 'Rain expected',
      detail: 'Carry an umbrella and watch for waterlogged roads.',
    });
  }
  if (heat != null && heat >= 40) {
    tips.push({
      level: 'danger',
      title: 'Extreme heat',
      detail: 'Stay out of the sun from 12 to 4 pm, drink water often and check on elderly neighbours.',
    });
  } else if (heat != null && heat >= 35) {
    tips.push({
      level: 'warning',
      title: 'Hot outside',
      detail: 'Drink water regularly and avoid heavy outdoor work in the afternoon.',
    });
  }
  if (weather.wind != null && weather.wind >= 14) {
    tips.push({
      level: 'warning',
      title: 'Strong winds',
      detail: 'Secure loose objects and stay clear of trees, hoardings and power lines.',
    });
  }
  if (mood === 'fog') {
    tips.push({
      level: 'warning',
      title: 'Low visibility',
      detail: 'Drive slowly with low-beam headlights on.',
    });
  }
  if (tips.length === 0) {
    tips.push({
      level: 'info',
      title: 'No weather risks right now',
      detail: 'Conditions look safe. Keep the app open to get official alerts if that changes.',
    });
  }
  return tips;
}
